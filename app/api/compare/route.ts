import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import mammoth from 'mammoth'
import DiffMatchPatch from 'diff-match-patch'

// Helper to extract text from PDF using pdfjs-dist
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    console.log('📖 Parsing PDF, buffer size:', buffer.length)
    
    // @ts-ignore
    const pdfjsLib = await import('pdfjs-dist')
    
    // Convert buffer to Uint8Array for pdfjs
    const data = new Uint8Array(buffer)
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ 
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    })
    const pdf = await loadingTask.promise
    
    console.log('📄 PDF loaded, pages:', pdf.numPages)
    
    let fullText = ''
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      fullText += pageText + '\n'
    }
    
    console.log('✅ PDF parsed successfully, text length:', fullText.length)
    return fullText
  } catch (error: any) {
    console.error('❌ PDF parse error:', error.message)
    console.error('Error details:', error)
    throw new Error(`Failed to parse PDF: ${error.message}`)
  }
}

// Helper to extract text from Word document
async function extractTextFromWord(buffer: Buffer): Promise<string> {
  try {
    console.log('📝 Parsing Word document, buffer size:', buffer.length)
    const result = await mammoth.extractRawText({ buffer })
    console.log('✅ Word document parsed successfully, text length:', result.value.length)
    return result.value
  } catch (error: any) {
    console.error('❌ Word parse error:', error.message)
    throw new Error(`Failed to parse Word document: ${error.message}`)
  }
}

// Helper to extract text based on file type
async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  
  if (file.type === 'application/pdf') {
    return await extractTextFromPDF(buffer)
  } else if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.type === 'application/msword'
  ) {
    return await extractTextFromWord(buffer)
  } else {
    throw new Error('Unsupported file type')
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Starting document comparison...')
    
    // Verify authentication using server client
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
    
    console.log('🔐 Checking authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    console.log('✅ User authenticated:', user.email)

    // Get form data
    console.log('📦 Parsing form data...')
    const formData = await request.formData()
    const doc1 = formData.get('doc1') as File
    const doc2 = formData.get('doc2') as File

    if (!doc1 || !doc2) {
      console.error('❌ Missing documents')
      return NextResponse.json(
        { error: 'Both documents are required' },
        { status: 400 }
      )
    }

    console.log('📄 Document 1:', doc1.name, doc1.type, `${(doc1.size / 1024).toFixed(1)}KB`)
    console.log('📄 Document 2:', doc2.name, doc2.type, `${(doc2.size / 1024).toFixed(1)}KB`)

    // Extract text from both documents
    console.log('🔍 Extracting text from documents...')
    const text1 = await extractText(doc1)
    console.log('✅ Document 1 extracted:', `${text1.length} characters`)
    
    const text2 = await extractText(doc2)
    console.log('✅ Document 2 extracted:', `${text2.length} characters`)

    // Compute differences using diff-match-patch
    console.log('⚖️ Computing differences...')
    const dmp = new DiffMatchPatch()
    const diffs = dmp.diff_main(text1, text2)
    dmp.diff_cleanupSemantic(diffs)
    console.log('✅ Differences computed:', diffs.length, 'changes')

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

    // Format changes for display
    const changes = diffs
      .filter(([type]) => type !== 0)
      .map(([type, text]) => ({
        type: type === 1 ? 'addition' : 'deletion',
        text: text.trim(),
        preview: text.trim().substring(0, 200) // First 200 chars for preview
      }))
      .filter(change => change.text.length > 0)

    return NextResponse.json({
      success: true,
      stats: {
        additions,
        deletions,
        unchanged,
        totalChanges: changes.length
      },
      changes,
      rawDiffs: diffs // Include raw diffs for advanced visualization
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