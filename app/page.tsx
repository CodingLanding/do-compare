import Link from 'next/link'
import { FileText, Zap, Shield, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1E3A8A] rounded-sm flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[#0F172A]">DocCompare</span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-base text-[#475569] hover:text-[#1E3A8A] transition-all duration-200"
            >
              Log in
            </Link>
            <Button 
              asChild
              className="bg-[#1E3A8A] hover:bg-[#3B82F6] text-white transition-all duration-200"
            >
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-[36px] md:text-6xl font-bold text-[#0F172A] mb-6 leading-tight">
            See what changed.<br />
            Understand it instantly.
          </h1>
          <p className="text-[18px] text-[#475569] mb-8 max-w-2xl mx-auto leading-relaxed">
            Compare contracts and agreements in seconds. AI-powered insights help you catch critical changes and make confident decisions—without reading every word.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              asChild
              size="lg"
              className="bg-[#1E3A8A] hover:bg-[#3B82F6] text-white text-lg px-8 h-14"
            >
              <Link href="/signup">Start Comparing Now</Link>
            </Button>
            <Button 
              asChild
              size="lg"
              variant="outline"
              className="border-2 border-[#1E3A8A] text-[#1E3A8A] hover:bg-[#F8FAFC] text-lg px-8 h-14"
            >
              <Link href="#demo">Watch Demo</Link>
            </Button>
          </div>
          <p className="text-sm text-[#475569] mt-4">
            Free to try • No credit card required
          </p>
        </div>

        {/* Demo Preview Placeholder */}
        <div className="mt-16 rounded-lg border-2 border-gray-200 overflow-hidden shadow-lg">
          <div className="bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] p-32 md:p-64 text-center">
            <FileText className="w-16 h-16 md:w-24 md:h-24 text-white/20 mx-auto" />
            <p className="text-white/60 mt-4 text-sm">Product Demo Screenshot</p>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="bg-[#F8FAFC] py-24">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-[30px] font-semibold text-center text-[#0F172A] mb-16">
            Built for busy professionals who need clarity, fast
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Founders */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="w-12 h-12 bg-[#3B82F6]/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-[#3B82F6]" />
              </div>
              <h3 className="text-[20px] font-semibold text-[#0F172A] mb-3">
                For Founders
              </h3>
              <p className="text-base text-[#475569] leading-relaxed">
                Review vendor contracts and partnership agreements in minutes, not hours. Focus on building your business, not decoding legal language.
              </p>
            </div>

            {/* Legal Teams */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="w-12 h-12 bg-[#10B981]/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-[#10B981]" />
              </div>
              <h3 className="text-[20px] font-semibold text-[#0F172A] mb-3">
                For Legal Teams
              </h3>
              <p className="text-base text-[#475569] leading-relaxed">
                Catch every clause change across multiple document versions. AI-powered insights help you assess risk and advise stakeholders faster.
              </p>
            </div>

            {/* Procurement */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="w-12 h-12 bg-[#F59E0B]/10 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-[#F59E0B]" />
              </div>
              <h3 className="text-[20px] font-semibold text-[#0F172A] mb-3">
                For Procurement
              </h3>
              <p className="text-base text-[#475569] leading-relaxed">
                Compare supplier proposals and contract redlines instantly. Make data-driven decisions with clear, actionable summaries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-[30px] font-semibold text-center text-[#0F172A] mb-16">
            Everything you need to compare with confidence
          </h2>
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="w-6 h-6 bg-[#10B981] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-[20px] font-semibold text-[#0F172A] mb-2">
                    Side-by-side comparison
                  </h3>
                  <p className="text-base text-[#475569] leading-relaxed">
                    See exactly what changed at a glance with color-coded additions, deletions, and modifications.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-6 h-6 bg-[#3B82F6] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-[20px] font-semibold text-[#0F172A] mb-2">
                    AI-powered summaries
                  </h3>
                  <p className="text-base text-[#475569] leading-relaxed">
                    Get plain-language explanations of changes and their implications in seconds, not hours.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-6 h-6 bg-[#F59E0B] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-[20px] font-semibold text-[#0F172A] mb-2">
                    Never miss a change
                  </h3>
                  <p className="text-base text-[#475569] leading-relaxed">
                    Every addition, deletion, and modification highlighted with precise location tracking.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature Visual Placeholder */}
            <div className="bg-gray-100 rounded-lg p-24 md:p-48 flex items-center justify-center border border-gray-200">
              <div className="text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Feature Screenshot</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#1E3A8A] py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-[30px] font-semibold text-white mb-6">
            Ready to save hours on document review?
          </h2>
          <p className="text-[18px] text-white/90 mb-8 leading-relaxed">
            Join professionals who trust DocCompare to catch critical changes and make confident decisions.
          </p>
          <Button 
            asChild
            size="lg"
            className="bg-white text-[#1E3A8A] hover:bg-[#F8FAFC] text-lg px-8 h-14"
          >
            <Link href="/signup">Get Started Free</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#1E3A8A] rounded-sm flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-[#0F172A]">DocCompare</span>
            </div>
            <p className="text-sm text-[#475569]">
              © 2025 DocCompare. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}