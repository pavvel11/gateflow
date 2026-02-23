'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';

export function FAQSection() {
  const t = useTranslations('landing');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const items = t.raw('faq.items') as { q: string; a: string }[];

  function handleToggle(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <section className="py-24 md:py-32 bg-gf-deep">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="text-4xl md:text-5xl font-bold text-gf-heading mb-12 text-center"
        >
          {t('faq.title')}
        </motion.h2>

        <div>
          {items.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ type: 'spring', stiffness: 100, damping: 20, delay: i * 0.05 }}
                className="border-b border-gf-border"
              >
                <button
                  type="button"
                  onClick={() => handleToggle(i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${i}`}
                  className="w-full flex justify-between items-center py-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gf-accent rounded"
                >
                  <span className="text-lg font-semibold text-gf-heading pr-8">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gf-muted transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <div
                  id={`faq-answer-${i}`}
                  role="region"
                  className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
                    isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="pb-5 text-gf-body leading-relaxed">
                    {item.a}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
