import { redirect } from 'next/navigation'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - GateFlow',
  description: 'Terms of Service for GateFlow platform',
  robots: 'index, follow'
}

export default function TermsPage() {
  // Redirect to external Terms of Service URL if configured
  const termsUrl = process.env.TERMS_OF_SERVICE_URL
  
  if (termsUrl) {
    redirect(termsUrl)
  }

  // Fallback content if no URL is configured
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-4">Terms of Service</h1>
            <p className="text-gray-300">Configuration Required</p>
          </div>
          
          <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Configuration Required</h2>
              <p>
                To display Terms of Service, please configure <code className="text-purple-300 bg-purple-900/30 px-2 py-1 rounded">TERMS_OF_SERVICE_URL</code> in your environment variables.
              </p>
              <p>
                This URL should point to your complete Terms of Service document (PDF, webpage, etc.).
              </p>
              <div className="mt-4 p-4 bg-blue-900/30 border border-blue-500/30 rounded-lg">
                <p className="text-blue-200 font-medium">Example configuration:</p>
                <p className="text-blue-300 text-sm font-mono mt-2">
                  TERMS_OF_SERVICE_URL=https://example.com/terms.pdf
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
