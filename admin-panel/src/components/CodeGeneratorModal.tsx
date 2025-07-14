'use client';

import { useState } from 'react';
import BaseModal from './ui/BaseModal';
import { Product } from '@/types';

interface CodeGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

interface CodeOptions {
  mode: 'page' | 'element';
}

export default function CodeGeneratorModal({ isOpen, onClose, product }: CodeGeneratorModalProps) {
  const [options, setOptions] = useState<CodeOptions>({
    mode: 'page'
  });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const generateCode = () => {
    const domain = window.location.origin;
    
    if (options.mode === 'page') {
      return `<script src="${domain}/api/gatekeeper?productSlug=${product.slug}"></script><noscript><meta http-equiv="refresh" content="0;url=${domain}/p/${product.slug}"></noscript>`;
    } else {
      return `<!-- Add this to your page head -->
<script src="${domain}/api/gatekeeper"></script><noscript><meta http-equiv="refresh" content="0;url=${domain}/p/${product.slug}"></noscript>

<!-- Then mark elements you want to protect -->
<div data-gatekeeper-product="${product.slug}">
  <h2>Protected Content</h2>
  <p>This content is only visible to users with access to ${product.name}.</p>
  
  <!-- Fallback content for users without access -->
  <div data-no-access>
    <h2>🔒 Premium Content</h2>
    <p>This content requires access to ${product.name}.</p>
    <a href="${domain}/p/${product.slug}" class="upgrade-button">
      Get Access Now
    </a>
  </div>
</div>`;
    }
  };

  const handleCopy = async () => {
    const code = generateCode();
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const generatedCode = generateCode();

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Generate Protection Code
        </h2>
        
        <div className="space-y-6">
          {/* Product Info */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Product: {product.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Slug: {product.slug}</p>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Protection Mode
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setOptions({...options, mode: 'page'})}
                  className={`p-3 rounded-lg border text-left ${
                    options.mode === 'page'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="font-medium">🌐 Protect Entire Page</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Protects the whole page content
                  </div>
                </button>
                <button
                  onClick={() => setOptions({...options, mode: 'element'})}
                  className={`p-3 rounded-lg border text-left ${
                    options.mode === 'element'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="font-medium">🎯 Protect Elements</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Protects specific page elements
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Generated Code */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Generated Code
              </label>
              <button
                onClick={handleCopy}
                className={`px-3 py-1 text-sm rounded-lg transition ${
                  copiedCode === generatedCode
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/40'
                }`}
              >
                {copiedCode === generatedCode ? '✓ Copied!' : '📋 Copy Code'}
              </button>
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm whitespace-pre-wrap break-all">
              <code>{generatedCode}</code>
            </pre>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              📋 Implementation Instructions
            </h4>
            <div className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
              {options.mode === 'page' ? (
                <>
                  <p>1. Copy the script tag above</p>
                  <p>2. Paste it into the &lt;head&gt; section of your protected page</p>
                  <p>3. The entire page will be protected automatically</p>
                </>
              ) : (
                <>
                  <p>1. Add the script tag to your page &lt;head&gt;</p>
                  <p>2. Wrap content you want to protect with data-gatekeeper-product=&quot;{product.slug}&quot;</p>
                  <p>3. Add fallback content with data-no-access for users without access</p>
                  <p>4. The script will automatically show/hide content based on user access</p>
                </>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
            <h4 className="font-semibold text-amber-900 dark:text-amber-300 mb-2">
              ℹ️ Important Information
            </h4>
            <div className="text-sm text-amber-800 dark:text-amber-400 space-y-2">
              {options.mode === 'page' ? (
                <>
                  <p>
                    <strong>Frontend Protection:</strong> This solution operates entirely on the client-side, 
                    making it compatible with any website builder like WordPress, Webflow, Squarespace, or static HTML. 
                    While this approach is less secure than server-side protection, we&apos;ve implemented several 
                    obfuscation techniques to make circumvention more challenging than typical frontend solutions.
                  </p>
                  <p>
                    <strong>Use Case:</strong> Perfect for protecting landing pages, course content, or any standalone 
                    page where you want to control access based on user purchases or subscriptions.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>Selective Content Display:</strong> This method allows you to show or hide specific 
                    sections of a page based on user access. It&apos;s particularly useful for sales pages where 
                    you want to display different content to paying customers versus prospects.
                  </p>
                  <p>
                    <strong>Implementation:</strong> Add data-gatekeeper-product=&quot;{product.slug}&quot; to content 
                    that should be visible to users with access, and data-no-access=&quot;true&quot; to fallback content 
                    for users without access. The script will automatically manage visibility.
                  </p>
                  <p>
                    <strong>Common Use Case:</strong> Replace &quot;Buy Now&quot; buttons with &quot;Access Product&quot; buttons 
                    for existing customers, or show premium content sections only to subscribers.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Copy Code
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
