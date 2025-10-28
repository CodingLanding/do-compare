'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

import {
  FileText,
  Upload,
  LogOut,
  Loader2,
  CheckCircle,
  XCircle,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// Set up PDF.js worker to use local file (in public folder)
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

type ComparisonResult = {
  stats: {
    additions: number
    deletions: number
    unchanged: number
    totalChanges: number
  }
  changes: Array<{
    id: string
    type: 'addition' | 'deletion'
    text: string
    context: string
    position: number
  }>
  doc1: { name: string; type: string; data: string; isPdf: boolean }
  doc2: { name: string; type: string; data: string; isPdf: boolean }
}

export default function ComparePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [comparing, setComparing] = useState(false)
  const [doc1, setDoc1] = useState<File | null>(null)
  const [doc2, setDoc2] = useState<File | null>(null)
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null)
  const [expandedChanges, setExpandedChanges] = useState<Set<string>>(new Set())

  // PDF viewer state
  const [numPages1, setNumPages1] = useState<number>(0)
  const [numPages2, setNumPages2] = useState<number>(0)
  const [scale, setScale] = useState<number>(1.0)
  const [pagesRendered, setPagesRendered] = useState(false)
  
  // Refs for scrolling
  const scrollAreaRef1 = useRef<HTMLDivElement>(null)
  const scrollAreaRef2 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
      else { setUser(user); setLoading(false) }
    }
    checkAuth()
  }, [router])

  // Auto-highlight all changes when pages are rendered
  useEffect(() => {
    if (!result || !pagesRendered) return

    const highlightAllChanges = () => {
      // Remove previous highlights
      document.querySelectorAll('.pdf-highlight').forEach(el => el.remove())

      // Highlight deletions in doc1 (red)
      const deletions = result.changes.filter(c => c.type === 'deletion')
      deletions.forEach(change => {
        highlightTextInDocument(scrollAreaRef1, change.text, 'deletion', change.id)
      })

      // Highlight additions in doc2 (green)
      const additions = result.changes.filter(c => c.type === 'addition')
      additions.forEach(change => {
        highlightTextInDocument(scrollAreaRef2, change.text, 'addition', change.id)
      })
    }

    // Wait a bit for text layers to fully render
    const timer = setTimeout(highlightAllChanges, 500)
    return () => clearTimeout(timer)
  }, [result, pagesRendered, scale])

  // Helper to find exact phrase matches in text layers
  const highlightTextInDocument = (
    containerRef: React.RefObject<HTMLDivElement>, 
    searchText: string, 
    type: 'addition' | 'deletion',
    changeId: string
  ) => {
    if (!containerRef.current) return

    const textLayers = containerRef.current.querySelectorAll('.react-pdf__Page__textContent')
    const words = searchText.trim().split(/\s+/).filter(w => w.length > 2) // Get significant words
    
    textLayers.forEach((textLayer) => {
      const spans = Array.from(textLayer.querySelectorAll('span'))
      
      // Try to find consecutive spans that match our text
      for (let i = 0; i < spans.length; i++) {
        const span = spans[i]
        const spanText = (span.textContent || '').trim()
        
        // Check if this span starts our search text or contains significant words
        if (spanText.length > 2 && searchText.toLowerCase().includes(spanText.toLowerCase())) {
          // Check if we can match more consecutive spans
          let matchedText = spanText
          let consecutiveSpans = [span]
          let j = i + 1
          
          // Try to match more consecutive spans up to a reasonable length
          while (j < spans.length && j < i + 20 && matchedText.length < searchText.length) {
            const nextSpan = spans[j]
            const nextText = (nextSpan.textContent || '').trim()
            
            if (nextText && searchText.toLowerCase().includes(nextText.toLowerCase())) {
              matchedText += ' ' + nextText
              consecutiveSpans.push(nextSpan)
              j++
            } else {
              break
            }
          }
          
          // If we matched a significant portion, highlight all spans
          if (matchedText.length >= Math.min(searchText.length * 0.3, 20)) {
            consecutiveSpans.forEach(spanToHighlight => {
              const rect = spanToHighlight.getBoundingClientRect()
              const layerRect = textLayer.getBoundingClientRect()
              
              const highlight = document.createElement('div')
              highlight.className = `pdf-highlight highlight-${changeId}`
              highlight.style.position = 'absolute'
              highlight.style.left = `${rect.left - layerRect.left}px`
              highlight.style.top = `${rect.top - layerRect.top}px`
              highlight.style.width = `${rect.width}px`
              highlight.style.height = `${rect.height}px`
              highlight.style.backgroundColor = type === 'addition' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'
              highlight.style.pointerEvents = 'none'
              highlight.style.zIndex = '1'
              highlight.style.mixBlendMode = 'multiply'
              highlight.style.transition = 'all 0.2s'
              
              textLayer.appendChild(highlight)
            })
            
            // Skip the spans we just highlighted
            i = j - 1
          }
        }
      }
    })
  }

  // Enhance highlights when a change is selected
  useEffect(() => {
    // Reset all highlights to normal opacity
    document.querySelectorAll('.pdf-highlight').forEach(el => {
      (el as HTMLElement).style.opacity = '0.4'
      ;(el as HTMLElement).style.backgroundColor = 
        (el as HTMLElement).style.backgroundColor.includes('34, 197, 94') 
          ? 'rgba(34, 197, 94, 0.25)' 
          : 'rgba(239, 68, 68, 0.25)'
    })

    if (selectedChangeId) {
      // Brighten selected highlights
      document.querySelectorAll(`.highlight-${selectedChangeId}`).forEach(el => {
        (el as HTMLElement).style.opacity = '1'
        const isGreen = (el as HTMLElement).style.backgroundColor.includes('34, 197, 94')
        ;(el as HTMLElement).style.backgroundColor = isGreen 
          ? 'rgba(34, 197, 94, 0.5)' 
          : 'rgba(239, 68, 68, 0.5)'
      })
    }
  }, [selectedChangeId])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleFileChange = (fileNumber: 1 | 2, file: File | null) => {
    if (!file) return
    const allowedTypes = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) { alert('Upload PDF or Word only'); return }
    if (file.size > 10 * 1024 * 1024) { alert('File size < 10MB'); return }
    fileNumber === 1 ? setDoc1(file) : setDoc2(file)
    setResult(null); setError(null)
    setPagesRendered(false)
  }

  const handleCompare = async () => {
    if (!doc1 || !doc2) { alert('Upload both docs'); return }
    setComparing(true); setError(null); setResult(null)
    setPagesRendered(false)

    try {
      const formData = new FormData()
      formData.append('doc1', doc1)
      formData.append('doc2', doc2)

      const response = await fetch('/api/compare', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Comparison failed')

      setResult(data)
    } catch (err: any) { setError(err.message || 'Error during comparison') }
    finally { setComparing(false) }
  }

  const handleChangeClick = (changeId: string) => {
    setSelectedChangeId(selectedChangeId === changeId ? null : changeId)
    
    const change = result?.changes.find(c => c.id === changeId)
    if (!change) return

    // Scroll to the first highlight of this change
    setTimeout(() => {
      const highlight = document.querySelector(`.highlight-${changeId}`) as HTMLElement
      if (highlight) {
        const containerRef = change.type === 'deletion' ? scrollAreaRef1 : scrollAreaRef2
        if (!containerRef.current) return

        const highlightRect = highlight.getBoundingClientRect()
        const containerRect = containerRef.current.getBoundingClientRect()
        const scrollTop = containerRef.current.scrollTop
        
        const targetScroll = scrollTop + (highlightRect.top - containerRect.top) - 100
        
        containerRef.current.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: 'smooth'
        })
      }
    }, 100)
  }

  const toggleExpand = (changeId: string) => {
    const newExpanded = new Set(expandedChanges)
    if (newExpanded.has(changeId)) {
      newExpanded.delete(changeId)
    } else {
      newExpanded.add(changeId)
    }
    setExpandedChanges(newExpanded)
  }

  const onDocumentLoadSuccess1 = ({ numPages }: { numPages: number }) => {
    console.log('Document 1 loaded successfully:', numPages, 'pages')
    setNumPages1(numPages)
    checkBothDocsLoaded(numPages, numPages2)
  }
  
  const onDocumentLoadSuccess2 = ({ numPages }: { numPages: number }) => {
    console.log('Document 2 loaded successfully:', numPages, 'pages')
    setNumPages2(numPages)
    checkBothDocsLoaded(numPages1, numPages)
  }

  const checkBothDocsLoaded = (pages1: number, pages2: number) => {
    if (pages1 > 0 && pages2 > 0) {
      // Wait for text layers to render
      setTimeout(() => {
        setPagesRendered(true)
      }, 1000)
    }
  }
  
  const base64ToDataUrl = (base64: string, type: string) => {
    const cleanBase64 = base64.replace(/\s/g, '')
    return `data:${type};base64,${cleanBase64}`
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary"><FileText className="size-5 text-primary-foreground" /></div>
            <span className="text-xl font-bold">DocCompare</span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button onClick={handleLogout} variant="outline" size="sm"><LogOut className="mr-2 size-4" />Log out</Button>
          </div>
        </div>
      </header>

      <main className="container max-w-screen-2xl py-6">
        {!result ? (
          <>
            {/* Upload */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Compare Documents</h1>
                <p className="text-muted-foreground">Upload two PDF or Word documents to see what changed</p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {[1,2].map(n => {
                  const doc = n === 1 ? doc1 : doc2
                  const id = `doc${n}`
                  const label = n === 1 ? 'Original Document' : 'Updated Document'
                  return (
                    <Card key={n} className="border-dashed hover:border-primary transition-colors">
                      <CardHeader className="text-center">
                        <Upload className="mx-auto mb-2 size-12 text-muted-foreground" />
                        <CardTitle className="text-xl">{label}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <input type="file" id={id} accept=".pdf,.doc,.docx" onChange={(e)=>handleFileChange(n as 1|2, e.target.files?.[0]||null)} className="hidden" />
                        {doc ? (
                          <div className="space-y-3">
                            <Card className="border-primary/50 bg-primary/5">
                              <CardContent className="flex flex-col items-center gap-2 p-4">
                                <FileText className="size-6 text-primary" />
                                <p className="text-sm font-medium truncate w-full text-center">{doc.name}</p>
                                <p className="text-xs text-muted-foreground">{(doc.size/1024).toFixed(1)} KB</p>
                              </CardContent>
                            </Card>
                            <Button variant="outline" onClick={()=>document.getElementById(id)?.click()} className="w-full">Change File</Button>
                          </div>
                        ) : (
                          <Button onClick={()=>document.getElementById(id)?.click()} className="w-full">Choose File</Button>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
              <div className="flex justify-center">
                <Button onClick={handleCompare} disabled={!doc1 || !doc2 || comparing} size="lg" className="px-12">
                  {comparing ? <><Loader2 className="mr-2 size-5 animate-spin"/>Comparing...</> : <><FileText className="mr-2 size-5"/>Compare Documents</>}
                </Button>
              </div>
              {error && <Card className="border-destructive bg-destructive/10"><CardContent className="p-4"><p className="text-destructive text-center">{error}</p></CardContent></Card>}
            </div>
          </>
        ) : (
          <>
            {/* Results */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Comparison Results</h2>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={()=>setScale(Math.max(0.5, scale-0.1))}><ZoomOut className="size-4" /></Button>
                  <span className="text-sm text-muted-foreground min-w-[60px] text-center">{Math.round(scale*100)}%</span>
                  <Button variant="outline" size="sm" onClick={()=>setScale(Math.min(2.0, scale+0.1))}><ZoomIn className="size-4" /></Button>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_400px] gap-6 h-[calc(100vh-200px)]">
                {/* PDF viewers - Scrollable */}
                <div className="grid grid-cols-2 gap-4">
                  {[1,2].map(n=>{
                    const doc = n===1?result.doc1:result.doc2
                    const numPages = n===1?numPages1:numPages2
                    const scrollRef = n===1?scrollAreaRef1:scrollAreaRef2
                    const onDocumentLoadSuccess = n===1?onDocumentLoadSuccess1:onDocumentLoadSuccess2
                    const docLabel = n===1 ? 'Original' : 'Updated'
                    
                    return (
                      <Card key={n} className="flex flex-col overflow-hidden">
                        <CardHeader className="pb-3 border-b">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <FileText className="size-4"/>
                              {docLabel}
                            </CardTitle>
                            {doc.isPdf && numPages>0 && (
                              <span className="text-xs text-muted-foreground">{numPages} pages</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{doc.name}</p>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 overflow-hidden">
                          <div 
                            ref={scrollRef}
                            className="h-full overflow-auto bg-muted/20 p-4"
                          >
                            {doc.isPdf ? (
                              <div className="flex flex-col items-center gap-4">
                                <Document 
                                  file={base64ToDataUrl(doc.data, doc.type)} 
                                  onLoadSuccess={onDocumentLoadSuccess}
                                  onLoadError={(error) => {
                                    console.error(`PDF ${n} Load Error:`, error)
                                  }}
                                  loading={
                                    <div className="flex flex-col items-center gap-2 p-8">
                                      <Loader2 className="w-8 h-8 animate-spin"/>
                                      <p className="text-sm text-muted-foreground">Loading PDF...</p>
                                    </div>
                                  }
                                  error={
                                    <div className="text-center text-red-500 p-8">
                                      <p className="font-semibold">Failed to load PDF</p>
                                      <p className="text-sm mt-2">Check browser console for details</p>
                                    </div>
                                  }
                                >
                                  {Array.from(new Array(numPages), (el, index) => (
                                    <div key={`page_${index + 1}`} className="mb-4 relative">
                                      <Page 
                                        pageNumber={index + 1} 
                                        scale={scale} 
                                        className="shadow-lg"
                                        renderTextLayer={true}
                                        renderAnnotationLayer={true}
                                      />
                                    </div>
                                  ))}
                                </Document>
                              </div>
                            ) : (
                              <div className="text-center text-muted-foreground p-8">
                                <p>Word document preview not available</p>
                                <p className="text-sm mt-2">Showing text comparison only</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {/* Sidebar */}
                <Card className="flex flex-col overflow-hidden">
                  <CardHeader>
                    <CardTitle>Changes Detected</CardTitle>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <Card className="border-green-500/50 bg-green-500/10"><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><CheckCircle className="size-4 text-green-600"/><span className="text-xs font-medium">Added</span></div><p className="text-lg font-bold text-green-600">{result.stats.additions.toLocaleString()}</p></CardContent></Card>
                      <Card className="border-red-500/50 bg-red-500/10"><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><XCircle className="size-4 text-red-600"/><span className="text-xs font-medium">Removed</span></div><p className="text-lg font-bold text-red-600">{result.stats.deletions.toLocaleString()}</p></CardContent></Card>
                    </div>
                    <p className="text-sm text-muted-foreground text-center mt-3">{result.stats.totalChanges} total changes</p>
                  </CardHeader>
                  <CardContent className="flex-1 p-0">
                    <ScrollArea className="h-full">
                      <div className="p-4 space-y-2">
                        <h3 className="text-sm font-semibold mb-3">All Changes ({result.changes.length})</h3>
                        {result.changes.length===0 ? <p className="text-sm text-muted-foreground text-center py-8">No changes detected</p> : result.changes.map(change=>{
                          const isExpanded = expandedChanges.has(change.id)
                          const isLong = change.text.length > 100
                          
                          return (
                            <div
                              key={change.id} 
                              className={cn(
                                'rounded-lg border transition-all',
                                selectedChangeId===change.id 
                                  ? change.type==='addition' 
                                    ? 'bg-green-500/20 border-green-500 ring-2 ring-green-500/50'
                                    : 'bg-red-500/20 border-red-500 ring-2 ring-red-500/50'
                                  : change.type==='addition' 
                                    ? 'bg-green-500/5 border-green-500/50 hover:bg-green-500/10'
                                    : 'bg-red-500/5 border-red-500/50 hover:bg-red-500/10'
                              )}
                            >
                              <button 
                                onClick={()=>handleChangeClick(change.id)} 
                                className="w-full text-left p-3"
                              >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <span className={cn('text-xs font-medium',change.type==='addition'?'text-green-600':'text-red-600')}>
                                    {change.type==='addition'?'+ Added':'− Removed'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {change.type === 'addition' ? 'in Updated' : 'from Original'}
                                  </span>
                                </div>
                                <p className={cn(
                                  "text-xs font-mono whitespace-pre-wrap",
                                  !isExpanded && isLong && "line-clamp-2"
                                )}>
                                  {change.text}
                                </p>
                              </button>
                              {isLong && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleExpand(change.id) }}
                                  className="w-full px-3 pb-2 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {isExpanded ? (
                                    <>Show less <ChevronUp className="size-3" /></>
                                  ) : (
                                    <>Show more <ChevronDown className="size-3" /></>
                                  )}
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                  <CardContent className="pt-0 pb-4 border-t">
                    <Button onClick={()=>{setResult(null);setDoc1(null);setDoc2(null);setSelectedChangeId(null);setPagesRendered(false)}} variant="outline" className="w-full">Compare New Documents</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}