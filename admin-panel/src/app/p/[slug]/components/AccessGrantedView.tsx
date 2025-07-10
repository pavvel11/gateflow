'use client';

import { Product } from '@/types';

interface AccessGrantedViewProps {
  product: Product;
}

export default function AccessGrantedView({ product }: AccessGrantedViewProps) {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden relative font-sans">
      {/* Background aurora effect */}
      <div 
        className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,#3a2d5b_0%,transparent_40%),radial-gradient(circle_at_80%_70%,#0f3460_0%,transparent_40%)]"
        style={{
          animation: 'aurora 20s infinite linear',
        }}
      />
      
      <style jsx>{`
        @keyframes aurora {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      
      <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="text-6xl mr-4">{product.icon}</div>
            <h1 className="text-3xl font-bold text-white">{product.name}</h1>
          </div>
          
          <div className="inline-flex items-center px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full">
            <svg className="w-5 h-5 text-green-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-green-300 font-medium">Access Granted</span>
          </div>
        </div>
        
        <div className="bg-white/10 border border-white/10 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Product Description</h2>
          <p className="text-gray-300">{product.description}</p>
        </div>
        
        <div className="bg-white/10 border border-white/10 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Content Access</h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            <a 
              href="#" 
              className="block p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors flex items-center"
            >
              <div className="bg-blue-500/20 p-3 rounded-lg mr-4">
                <svg className="w-6 h-6 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-medium">Product Document</h3>
                <p className="text-gray-400 text-sm">Download PDF guide</p>
              </div>
            </a>
            
            <a 
              href="#" 
              className="block p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors flex items-center"
            >
              <div className="bg-purple-500/20 p-3 rounded-lg mr-4">
                <svg className="w-6 h-6 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-medium">Video Tutorial</h3>
                <p className="text-gray-400 text-sm">Watch exclusive content</p>
              </div>
            </a>
          </div>
        </div>
        
        <div className="text-center mt-8 text-sm text-gray-500">
          Secured by GateFlow • {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
