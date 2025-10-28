'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (signupError) throw signupError

      // Check if email confirmation is required
      if (data?.user?.identities?.length === 0) {
        setError('An account with this email already exists')
        return
      }

      // Success! Redirect to comparison page
      router.push('/compare')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1E3A8A] rounded-sm flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[#0F172A]">DocCompare</span>
          </Link>
          <Link 
            href="/login" 
            className="text-base text-[#475569] hover:text-[#1E3A8A] transition-all duration-200"
          >
            Already have an account? <span className="font-semibold">Log in</span>
          </Link>
        </div>
      </nav>

      {/* Signup Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-[36px] font-bold text-[#0F172A] mb-3">
              Create your account
            </h1>
            <p className="text-base text-[#475569]">
              Start comparing documents in seconds
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
            <form onSubmit={handleSignup} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-[#EF4444]/10 border border-[#EF4444] text-[#EF4444] rounded-lg p-4 text-sm">
                  {error}
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-[#0F172A] font-medium">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#0F172A] font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#0F172A] font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11"
                />
                <p className="text-sm text-[#475569]">
                  Must be at least 6 characters
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1E3A8A] hover:bg-[#3B82F6] text-white h-11 text-base font-medium"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-[#475569]">
                By signing up, you agree to our{' '}
                <Link href="/terms" className="text-[#1E3A8A] hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-[#1E3A8A] hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-[#475569] mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#1E3A8A] hover:underline font-semibold">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}