'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError) throw loginError

      // Success! Redirect to comparison page
      router.push('/compare')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Invalid email or password')
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
            href="/signup" 
            className="text-base text-[#475569] hover:text-[#1E3A8A] transition-all duration-200"
          >
            Don't have an account? <span className="font-semibold">Sign up</span>
          </Link>
        </div>
      </nav>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-[36px] font-bold text-[#0F172A] mb-3">
              Welcome back
            </h1>
            <p className="text-base text-[#475569]">
              Log in to your DocCompare account
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-[#EF4444]/10 border border-[#EF4444] text-[#EF4444] rounded-lg p-4 text-sm">
                  {error}
                </div>
              )}

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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[#0F172A] font-medium">
                    Password
                  </Label>
                  <Link 
                    href="/forgot-password" 
                    className="text-sm text-[#1E3A8A] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1E3A8A] hover:bg-[#3B82F6] text-white h-11 text-base font-medium"
              >
                {loading ? 'Logging in...' : 'Log in'}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-[#475569] mt-6">
            Don't have an account?{' '}
            <Link href="/signup" className="text-[#1E3A8A] hover:underline font-semibold">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}