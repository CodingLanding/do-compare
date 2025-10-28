'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Upload, LogOut, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'

type ComparisonResult = {
  stats: {
    additions: number
    deletions: number
    unchanged: number
    totalChanges: number
  }
  changes: Array<{
    type: 'addition' | 'deletion'
    text: string
    preview: string
  }>
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

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }
      
      setUser(user)
      setLoading(false)
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

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ]

    if (!allowedTypes.includes(file.type)) {
      alert('Please upload only PDF or Word documents')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    if (fileNumber === 1) {
      setDoc1(file)
    } else {
      setDoc2(file)
    }

    // Reset results when new files are uploaded
    setResult(null)
    setError(null)
  }

  const handleCompare = async () => {
    if (!doc1 || !doc2) {
      alert('Please upload both documents')
      return
    }

    setComparing(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('doc1', doc1)
      formData.append('doc2', doc2)

      const response = await fetch('/api/compare', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Comparison failed')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred during comparison')
    } finally {
      setComparing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#1E3A8A] animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1E3A8A] rounded-sm flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[#0F172A]">DocCompare</span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#475569]">
              {user?.email}
            </span>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-gray-300 text-[#475569] hover:text-[#1E3A8A]"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-[36px] font-bold text-[#0F172A] mb-3">
            Compare Documents
          </h1>
          <p className="text-base text-[#475569]">
            Upload two documents to see what changed
          </p>
        </div>

        {/* Upload Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Document 1 */}
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-[#3B82F6] transition-all duration-200">
            <div className="text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-[20px] font-semibold text-[#0F172A] mb-2">
                Original Document
              </h3>
              <p className="text-sm text-[#475569] mb-4">
                Upload the first version
              </p>
              
              <input
                type="file"
                id="doc1"
                accept=".pdf,.doc,.docx"
                onChange={(e) => handleFileChange(1, e.target.files?.[0] || null)}
                className="hidden"
              />
              
              {doc1 ? (
                <div className="space-y-3">
                  <div className="bg-[#10B981]/10 border border-[#10B981] rounded-lg p-4">
                    <FileText className="w-6 h-6 text-[#10B981] mx-auto mb-2" />
                    <p className="text-sm font-medium text-[#0F172A] truncate">
                      {doc1.name}
                    </p>
                    <p className="text-xs text-[#475569] mt-1">
                      {(doc1.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('doc1')?.click()}
                    className="w-full"
                  >
                    Change File
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => document.getElementById('doc1')?.click()}
                  className="bg-[#1E3A8A] hover:bg-[#3B82F6] text-white"
                >
                  Choose File
                </Button>
              )}
            </div>
          </div>

          {/* Document 2 */}
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-[#3B82F6] transition-all duration-200">
            <div className="text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-[20px] font-semibold text-[#0F172A] mb-2">
                Updated Document
              </h3>
              <p className="text-sm text-[#475569] mb-4">
                Upload the revised version
              </p>
              
              <input
                type="file"
                id="doc2"
                accept=".pdf,.doc,.docx"
                onChange={(e) => handleFileChange(2, e.target.files?.[0] || null)}
                className="hidden"
              />
              
              {doc2 ? (
                <div className="space-y-3">
                  <div className="bg-[#3B82F6]/10 border border-[#3B82F6] rounded-lg p-4">
                    <FileText className="w-6 h-6 text-[#3B82F6] mx-auto mb-2" />
                    <p className="text-sm font-medium text-[#0F172A] truncate">
                      {doc2.name}
                    </p>
                    <p className="text-xs text-[#475569] mt-1">
                      {(doc2.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('doc2')?.click()}
                    className="w-full"
                  >
                    Change File
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => document.getElementById('doc2')?.click()}
                  className="bg-[#1E3A8A] hover:bg-[#3B82F6] text-white"
                >
                  Choose File
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Compare Button */}
        <div className="text-center mb-8">
          <Button
            onClick={handleCompare}
            disabled={!doc1 || !doc2 || comparing}
            size="lg"
            className="bg-[#1E3A8A] hover:bg-[#3B82F6] text-white text-lg px-12 h-14"
          >
            {comparing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Comparing...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5 mr-2" />
                Compare Documents
              </>
            )}
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-[#EF4444]/10 border border-[#EF4444] rounded-lg p-4 mb-8">
            <p className="text-[#EF4444] text-center">{error}</p>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            {/* Statistics */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-[24px] font-semibold text-[#0F172A] mb-4">
                Comparison Results
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#10B981]/10 border border-[#10B981] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-[#10B981]" />
                    <span className="text-sm font-medium text-[#0F172A]">Additions</span>
                  </div>
                  <p className="text-2xl font-bold text-[#10B981]">
                    {result.stats.additions.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#475569] mt-1">characters added</p>
                </div>

                <div className="bg-[#EF4444]/10 border border-[#EF4444] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-5 h-5 text-[#EF4444]" />
                    <span className="text-sm font-medium text-[#0F172A]">Deletions</span>
                  </div>
                  <p className="text-2xl font-bold text-[#EF4444]">
                    {result.stats.deletions.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#475569] mt-1">characters removed</p>
                </div>

                <div className="bg-[#3B82F6]/10 border border-[#3B82F6] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-[#3B82F6]" />
                    <span className="text-sm font-medium text-[#0F172A]">Total Changes</span>
                  </div>
                  <p className="text-2xl font-bold text-[#3B82F6]">
                    {result.stats.totalChanges}
                  </p>
                  <p className="text-xs text-[#475569] mt-1">modifications detected</p>
                </div>
              </div>
            </div>

            {/* Changes List */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-[24px] font-semibold text-[#0F172A] mb-4">
                Detailed Changes
              </h2>
              
              {result.changes.length === 0 ? (
                <p className="text-[#475569] text-center py-8">
                  No changes detected between the documents.
                </p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {result.changes.map((change, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        change.type === 'addition'
                          ? 'bg-[#10B981]/5 border-[#10B981]'
                          : 'bg-[#EF4444]/5 border-[#EF4444]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {change.type === 'addition' ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-[#10B981]" />
                            <span className="text-sm font-medium text-[#10B981]">
                              Added
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-[#EF4444]" />
                            <span className="text-sm font-medium text-[#EF4444]">
                              Removed
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-[#0F172A] whitespace-pre-wrap">
                        {change.preview}
                        {change.text.length > 200 && '...'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info Box */}
        {!result && (
          <div className="bg-[#3B82F6]/10 border border-[#3B82F6] rounded-lg p-6">
            <h3 className="text-[18px] font-semibold text-[#0F172A] mb-2">
              Supported Formats
            </h3>
            <ul className="text-sm text-[#475569] space-y-1">
              <li>• PDF documents (.pdf)</li>
              <li>• Microsoft Word (.doc, .docx)</li>
              <li>• Maximum file size: 10MB per document</li>
            </ul>
          </div>
        )}
      </main>
    </div>
  )
}