import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - GateFlow',
  description: 'Terms of Service for GateFlow platform',
  robots: 'index, follow'
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-4">Terms of Service</h1>
            <p className="text-gray-300">Last updated: {new Date().toLocaleDateString()}</p>
          </div>
          
          <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using GateFlow, you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Use License</h2>
              <p>
                Permission is granted to temporarily use GateFlow for personal, non-commercial transitory viewing only.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. Disclaimer</h2>
              <p>
                The materials on GateFlow are provided on an &apos;as is&apos; basis. GateFlow makes no warranties, 
                expressed or implied, and hereby disclaims and negates all other warranties including without 
                limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, 
                or non-infringement of intellectual property or other violation of rights.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Limitations</h2>
              <p>
                In no event shall GateFlow or its suppliers be liable for any damages (including, without limitation, 
                damages for loss of data or profit, or due to business interruption) arising out of the use or 
                inability to use the materials on GateFlow, even if GateFlow or a GateFlow authorized representative 
                has been notified orally or in writing of the possibility of such damage.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Contact Information</h2>
              <p>
                If you have any questions about these Terms of Service, please contact us.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-white/20 text-center">
            <p className="text-gray-400 text-sm">
              This is a placeholder terms page. Please update with your actual terms of service.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
