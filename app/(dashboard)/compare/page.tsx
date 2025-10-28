'use client'

import { useState, useEffect } from 'react'
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
  ChevronLeft,
  ChevronRight as ChevronRightIcon
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

  // PDF viewer state
  const [numPages1, setNumPages1] = useState<number>(0)
  const [numPages2, setNumPages2] = useState<number>(0)
  const [pageNumber1, setPageNumber1] = useState<number>(1)
  const [pageNumber2, setPageNumber2] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
      else { setUser(user); setLoading(false) }
    }
    checkAuth()
  }, [router])

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
  }

  const handleCompare = async () => {
    if (!doc1 || !doc2) { alert('Upload both docs'); return }
    setComparing(true); setError(null); setResult(null)

    try {
      const formData = new FormData()
      formData.append('doc1', doc1)
      formData.append('doc2', doc2)

      const response = await fetch('/api/compare', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Comparison failed')

      setResult(data)
      setPageNumber1(1)
      setPageNumber2(1)
    } catch (err: any) { setError(err.message || 'Error during comparison') }
    finally { setComparing(false) }
  }

  const handleChangeClick = (changeId: string) => setSelectedChangeId(changeId)
  const onDocumentLoadSuccess1 = ({ numPages }: { numPages: number }) => {
    console.log('Document 1 loaded successfully:', numPages, 'pages')
    setNumPages1(numPages)
  }
  const onDocumentLoadSuccess2 = ({ numPages }: { numPages: number }) => {
    console.log('Document 2 loaded successfully:', numPages, 'pages')
    setNumPages2(numPages)
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
                {/* PDF viewers */}
                <div className="grid grid-cols-2 gap-4">
                  {[1,2].map(n=>{
                    const doc = n===1?result.doc1:result.doc2
                    const numPages = n===1?numPages1:numPages2
                    const pageNumber = n===1?pageNumber1:pageNumber2
                    const setPageNumber = n===1?setPageNumber1:setPageNumber2
                    const onDocumentLoadSuccess = n===1?onDocumentLoadSuccess1:onDocumentLoadSuccess2
                    return (
                      <Card key={n} className="flex flex-col overflow-hidden">
                        <CardHeader className="pb-3 border-b">
                          <CardTitle className="text-base flex items-center gap-2"><FileText className="size-4"/>{doc.name}</CardTitle>
                          {doc.isPdf && numPages>0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <Button variant="outline" size="sm" onClick={()=>setPageNumber(Math.max(1,pageNumber-1))} disabled={pageNumber<=1}><ChevronLeft className="size-4" /></Button>
                              <span className="text-xs text-muted-foreground">{pageNumber}/{numPages}</span>
                              <Button variant="outline" size="sm" onClick={()=>setPageNumber(Math.min(numPages,pageNumber+1))} disabled={pageNumber>=numPages}><ChevronRightIcon className="size-4"/></Button>
                            </div>
                          )}
                        </CardHeader>
                        <CardContent className="flex-1 p-0 overflow-auto">
                          <div className="flex justify-center p-4 bg-muted/20 min-h-full">
                            {doc.isPdf ? (
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
                                <Page 
                                  pageNumber={pageNumber} 
                                  scale={scale} 
                                  className="shadow-lg"
                                  renderTextLayer={true}
                                  renderAnnotationLayer={true}
                                />
                              </Document>
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
                        {result.changes.length===0 ? <p className="text-sm text-muted-foreground text-center py-8">No changes detected</p> : result.changes.map(change=>(
                          <button key={change.id} onClick={()=>handleChangeClick(change.id)} className={cn(
                            'w-full text-left p-3 rounded-lg border transition-all',
                            selectedChangeId===change.id ? change.type==='addition' ? 'bg-green-500/20 border-green-500':'bg-red-500/20 border-red-500'
                            : change.type==='addition' ? 'bg-green-500/5 border-green-500/50 hover:bg-green-500/10':'bg-red-500/5 border-red-500/50 hover:bg-red-500/10'
                          )}>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className={cn('text-xs font-medium',change.type==='addition'?'text-green-600':'text-red-600')}>{change.type==='addition'?'+ Added':'− Removed'}</span>
                              <ChevronRightIcon className="size-4 text-muted-foreground shrink-0"/>
                            </div>
                            <p className="text-xs line-clamp-2">{change.text}</p>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                  <CardContent className="pt-0 pb-4">
                    <Button onClick={()=>{setResult(null);setDoc1(null);setDoc2(null);setSelectedChangeId(null)}} variant="outline" className="w-full">Compare New Documents</Button>
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