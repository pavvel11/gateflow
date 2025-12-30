'use client';

import { Product } from '@/types';
import { formatPrice } from '@/lib/constants';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslations } from 'next-intl';
import OmnibusPrice from '@/components/OmnibusPrice';

interface ProductShowcaseProps {
  product: Product;
}

export default function ProductShowcase({ product }: ProductShowcaseProps) {
  const t = useTranslations('checkout');

  // Check if sale price is active
  const isSaleActive =
    product.sale_price &&
    product.sale_price > 0 &&
    (!product.sale_price_until || new Date(product.sale_price_until) > new Date());

  // Determine effective price (sale price if active, otherwise regular price)
  const effectivePrice = isSaleActive ? product.sale_price! : product.price;

  // Calculate net price if VAT is included
  const vatRate = product.vat_rate || 23;
  const grossPrice = effectivePrice;
  const netPrice = product.price_includes_vat
    ? grossPrice / (1 + vatRate / 100)
    : grossPrice;
  const vatAmount = grossPrice - netPrice;

  return (
    <div className="w-full lg:w-1/2 lg:pr-8 lg:border-r border-white/10 mb-8 lg:mb-0">
      {/* Product Image */}
      {product.image_url ? (
        <div className="relative w-full aspect-video mb-6 rounded-2xl overflow-hidden bg-white/5">
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
            priority
          />
        </div>
      ) : (
        /* Placeholder when no image */
        <div className="relative w-full aspect-video mb-6 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 flex items-center justify-center border border-white/10">
          <span className="text-9xl opacity-50">{product.icon}</span>
        </div>
      )}

      {/* Product Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{product.icon}</span>
            <h1 className="text-2xl lg:text-3xl font-bold text-white leading-tight">
              {product.name}
            </h1>
          </div>
          {product.description && (
            <p className="text-gray-300 text-sm leading-relaxed">
              {product.description}
            </p>
          )}
        </div>
      </div>

      {/* Price Display - Clean & Minimal (EasyCart-inspired) */}
      <div className="mb-8">
        {/* Strikethrough regular price if on sale */}
        {isSaleActive && (
          <div className="text-2xl font-medium text-gray-500 line-through mb-1">
            {formatPrice(product.price, product.currency)} {product.currency}
          </div>
        )}

        <div className="text-5xl font-bold text-white mb-2 tracking-tight">
          {formatPrice(grossPrice, product.currency)} {product.currency}
        </div>

        {product.vat_rate && product.vat_rate > 0 && (
          <div className="text-sm text-gray-400">
            {t('includingVat', { defaultValue: 'including VAT' })} {vatRate}%
          </div>
        )}

        {/* Sale end date */}
        {isSaleActive && product.sale_price_until && (
          <div className="text-sm text-yellow-400 mt-2 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('saleEndsAt', {
              date: new Date(product.sale_price_until).toLocaleString('pl-PL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            })}
          </div>
        )}

        {/* EU Omnibus Directive - Lowest price from last 30 days */}
        <div className="mt-3">
          <OmnibusPrice
            productId={product.id}
            currentPrice={grossPrice}
            currency={product.currency}
          />
        </div>
      </div>

      {/* Long Description with Markdown Support */}
      {product.long_description && (
        <div className="mb-8 prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Custom styling for Markdown elements
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold text-white mb-4">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-bold text-white mb-3 mt-6">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-semibold text-white mb-2 mt-4">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="text-gray-300 leading-relaxed mb-4">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside text-gray-300 space-y-2 mb-4">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="text-gray-300">{children}</li>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline transition-colors"
                >
                  {children}
                </a>
              ),
              strong: ({ children }) => (
                <strong className="font-bold text-white">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="italic text-gray-200">{children}</em>
              ),
              code: ({ children }) => (
                <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm text-blue-300 font-mono">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="p-4 bg-black/40 rounded-lg overflow-x-auto mb-4 border border-white/10">
                  {children}
                </pre>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-purple-500 pl-4 italic text-gray-300 my-4">
                  {children}
                </blockquote>
              ),
            }}
          >
            {product.long_description}
          </ReactMarkdown>
        </div>
      )}

      {/* Features Sections */}
      {product.features && product.features.length > 0 && (
        <div className="space-y-6">
          {product.features.map((featureSection, sectionIndex) => (
            <div key={sectionIndex} className="space-y-3">
              <h3 className="text-xl font-bold text-white">
                {featureSection.title}
              </h3>
              <ul className="space-y-2">
                {featureSection.items.map((item, itemIndex) => (
                  <li
                    key={itemIndex}
                    className="flex items-start gap-3 text-gray-300"
                  >
                    <svg
                      className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
