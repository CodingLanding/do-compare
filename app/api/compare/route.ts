import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import * as pdfParse from 'pdf-parse/lib/pdf-parse'
import mammoth from 'mammoth'
import { DiffMatchPatch } from 'diff-match-patch'

// Helper to extract text from PDF
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer)
    return data.text
  } catch (error) {
    throw new Error('Failed to parse PDF document')
  }
}

// Helper to extract text from Word document
async function extractTextFromWord(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  } catch (error) {
    throw new Error('Failed to parse Word document')
  }
}

// Helper to extract text based on file type
async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  
  if (file.type === 'application/pdf') {
    return extractTextFromPDF(buffer)
  } else if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.type === 'application/msword'
  ) {
    return extractTextFromWord(buffer)
  } else {
    throw new Error('Unsupported file type')
  }
}

// Compute diff between two texts
function computeDiff(text1: string, text2: string) {
  const dmp = new DiffMatchPatch()
  const diffs = dmp.diff_main(text1, text2)
  dmp.diff_cleanupSemantic(diffs)
  
  // Categorize changes
  const changes = {
    added: [] as string[],
    removed: [] as string[],
    modified: [] as { from: string; to: string }[],
  }
  
  let addedText = ''
  let removedText = ''
  
  diffs.forEach((diff) => {
    const [type, text] = diff
    
    if (type === 1) {
      // Addition
      addedText += text
      if (text.includes('\n') || text.length > 50) {
        changes.added.push(addedText.trim())
        addedText = ''
      }
    } else if (type === -1) {
      // Deletion
      removedText += text
      if (text.includes('\n') || text.length > 50) {
        changes.removed.push(removedText.trim())
        removedText = ''
      }
    } else {
      // No change - flush any pending adds/removes
      if (addedText) {
        changes.added.push(addedText.trim())
        addedText = ''
      }
      if (removedText) {
        changes.removed.push(removedText.trim())
        removedText = ''
      }
    }
  })
  
  // Flush remaining
  if (addedText) changes.added.push(addedText.trim())
  if (removedText) changes.removed.push(removedText.trim())
  
  // Calculate statistics
  const stats = {
    totalChanges: changes.added.length + changes.removed.length,
    additions: changes.added.length,
    deletions: changes.removed.length,
    modifications: changes.modified.length,
  }
  
  return {
    diffs,
    changes,
    stats,
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Parse form data
    const formData = await request.formData()
    const doc1 = formData.get('doc1') as File
    const doc2 = formData.get('doc2') as File
    
    if (!doc1 || !doc2) {
      return NextResponse.json(
        { error: 'Both documents are required' },
        { status: 400 }
      )
    }
    
    // Validate file sizes (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (doc1.size > maxSize || doc2.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }
    
    // Extract text from both documents
    console.log('Extracting text from documents...')
    const text1 = await extractText(doc1)
    const text2 = await extractText(doc2)
    
    if (!text1 || !text2) {
      return NextResponse.json(
        { error: 'Failed to extract text from documents' },
        { status: 400 }
      )
    }
    
    // Compute differences
    console.log('Computing differences...')
    const result = computeDiff(text1, text2)
    
    // Return results
    return NextResponse.json({
      success: true,
      doc1: {
        name: doc1.name,
        text: text1,
      },
      doc2: {
        name: doc2.name,
        text: text2,
      },
      comparison: result,
    })
    
  } catch (error: any) {
    console.error('Comparison error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to compare documents' },
      { status: 500 }
    )
  }
}