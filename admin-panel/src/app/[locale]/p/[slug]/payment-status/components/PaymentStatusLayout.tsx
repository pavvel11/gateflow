import { Product } from '../types';

interface PaymentStatusLayoutProps {
  product: Product;
  children: React.ReactNode;
  statusInfo?: {
    emoji: string;
    title: string;
    color: string;
    bgColor: string;
  };
}

export default function PaymentStatusLayout({ 
  product, 
  children, 
  statusInfo
}: PaymentStatusLayoutProps) {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden relative font-sans">
      {/* Aurora background effect */}
      <div 
        className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,#3a2d5b_0%,transparent_40%),radial-gradient(circle_at_80%_70%,#0f3460_0%,transparent_40%)]"
        style={{ animation: 'aurora 20s infinite linear' }}
      />
      
      <style jsx>{`
        @keyframes aurora {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes fadeInPulse {
          0% { 
            opacity: 0; 
            transform: scale(0.95); 
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          50% { 
            transform: scale(1.02); 
            box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
          }
          100% { 
            opacity: 1; 
            transform: scale(1); 
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
        }
        
        @keyframes slideInLeft {
          0% { 
            opacity: 0; 
            transform: translateX(-20px); 
          }
          100% { 
            opacity: 1; 
            transform: translateX(0); 
          }
        }
        
        .animate-fadeInPulse {
          animation: fadeInPulse 1.5s ease-out forwards;
        }
        
        .animate-slideInLeft {
          animation: slideInLeft 0.6s ease-out forwards;
          opacity: 0;
        }
        
        .delay-100 {
          animation-delay: 0.1s;
        }
        
        .delay-200 {
          animation-delay: 0.2s;
        }
        
        .delay-300 {
          animation-delay: 0.3s;
        }
      `}</style>

      {/* Main Content */}
      <div className={`max-w-4xl mx-auto p-8 bg-gradient-to-br ${statusInfo?.bgColor || 'from-blue-900/20 to-blue-800/20'} backdrop-blur-md border border-white/10 rounded-xl shadow-2xl z-10 text-center`}>
        {statusInfo && (
          <>
            <div className="text-5xl mb-4">{statusInfo.emoji}</div>
            <h2 className={`text-3xl font-bold ${statusInfo.color} mb-2`}>
              {statusInfo.title}
            </h2>
          </>
        )}
        
        {children}
        
        {/* Product Info Footer */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <div className="text-3xl">{product.icon}</div>
          <div>
            <h3 className="text-xl font-semibold text-white">{product.name}</h3>
            <p className="text-gray-300">{product.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
