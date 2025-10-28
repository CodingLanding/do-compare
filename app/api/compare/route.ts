import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import mammoth from 'mammoth'
import DiffMatchPatch from 'diff-match-patch'
// @ts-ignore
import PDFParser from 'pdf2json'

// Helper to safely decode URI-encoded text
function safeDecodeURI(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch (e) {
    return text
  }
}

// Helper to extract text from PDF
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const pdfParser = new PDFParser()
      
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        reject(new Error(`Failed to parse PDF: ${errData.parserError}`))
      })
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          let fullText = ''
          
          if (pdfData.Pages) {
            pdfData.Pages.forEach((page: any) => {
              if (page.Texts) {
                page.Texts.forEach((text: any) => {
                  if (text.R) {
                    text.R.forEach((run: any) => {
                      if (run.T) {
                        fullText += safeDecodeURI(run.T) + ' '
                      }
                    })
                  }
                })
                fullText += '\n'
              }
            })
          }
          
          fullText = fullText.replace(/\s+/g, ' ').trim()
          resolve(fullText)
        } catch (error: any) {
          reject(new Error(`Failed to process PDF data: ${error.message}`))
        }
      })
      
      pdfParser.parseBuffer(buffer)
    } catch (error: any) {
      reject(new Error(`Failed to initialize PDF parser: ${error.message}`))
    }
  })
}

// Helper to extract text from Word
async function extractTextFromWord(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  } catch (error: any) {
    throw new Error(`Failed to parse Word document: ${error.message}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Starting document comparison...')
    
    // Verify authentication
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get form data
    const formData = await request.formData()
    const doc1 = formData.get('doc1') as File
    const doc2 = formData.get('doc2') as File

    if (!doc1 || !doc2) {
      return NextResponse.json(
        { error: 'Both documents are required' },
        { status: 400 }
      )
    }

    console.log('📄 Document 1:', doc1.name, doc1.type)
    console.log('📄 Document 2:', doc2.name, doc2.type)

    // Get buffers
    const buffer1 = Buffer.from(await doc1.arrayBuffer())
    const buffer2 = Buffer.from(await doc2.arrayBuffer())

    // Extract text for comparison
    console.log('🔍 Extracting text for comparison...')
    let text1 = ''
    let text2 = ''

    if (doc1.type === 'application/pdf') {
      text1 = await extractTextFromPDF(buffer1)
    } else {
      text1 = await extractTextFromWord(buffer1)
    }

    if (doc2.type === 'application/pdf') {
      text2 = await extractTextFromPDF(buffer2)
    } else {
      text2 = await extractTextFromWord(buffer2)
    }

    console.log('✅ Text extracted:', text1.length, 'vs', text2.length, 'characters')

    // Compute differences
    console.log('⚖️ Computing differences...')
    const dmp = new DiffMatchPatch()
    const diffs = dmp.diff_main(text1, text2)
    dmp.diff_cleanupSemantic(diffs)
    dmp.diff_cleanupEfficiency(diffs)

    // Calculate statistics
    let additions = 0
    let deletions = 0
    let unchanged = 0

    diffs.forEach(([type, text]) => {
      const length = text.length
      if (type === 1) additions += length
      else if (type === -1) deletions += length
      else unchanged += length
    })

    // Build structured changes
    const structuredChanges: Array<{
      id: string
      type: 'addition' | 'deletion'
      text: string
      context: string
      position: number
    }> = []

    let currentPosition = 0
    diffs.forEach(([type, text], index) => {
      if (type !== 0 && text.trim().length > 0) {
        const contextBefore = diffs[index - 1]?.[1]?.slice(-50) || ''
        const contextAfter = diffs[index + 1]?.[1]?.slice(0, 50) || ''
        
        structuredChanges.push({
          id: `change-${index}`,
          type: type === 1 ? 'addition' : 'deletion',
          text: text.trim(),
          context: `...${contextBefore}[CHANGE]${contextAfter}...`.trim(),
          position: currentPosition
        })
      }
      currentPosition += text.length
    })

    // Convert PDFs to base64 for client-side rendering
    const doc1Base64 = buffer1.toString('base64')
    const doc2Base64 = buffer2.toString('base64')

    return NextResponse.json({
      success: true,
      stats: {
        additions,
        deletions,
        unchanged,
        totalChanges: structuredChanges.length
      },
      changes: structuredChanges,
      doc1: {
        name: doc1.name,
        type: doc1.type,
        data: doc1Base64,
        isPdf: doc1.type === 'application/pdf'
      },
      doc2: {
        name: doc2.name,
        type: doc2.type,
        data: doc2Base64,
        isPdf: doc2.type === 'application/pdf'
      }
    })

  } catch (error: any) {
    console.error('💥 Comparison error:', error)
    console.error('Stack trace:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Failed to compare documents' },
      { status: 500 }
    )
  }
}