'use client';

import { useInView, useMotionValue, useSpring, motion } from 'motion/react';
import { useEffect, useRef } from 'react';

interface NumberCounterProps {
  value: string;
  className?: string;
}

function extractNumber(val: string): number | null {
  const match = val.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

export function NumberCounter({ value, className }: NumberCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const num = extractNumber(value);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    stiffness: 60,
    damping: 25,
  });

  useEffect(() => {
    if (inView && num !== null) {
      motionValue.set(num);
    }
  }, [inView, num, motionValue]);

  useEffect(() => {
    if (num === null) return;

    const unsubscribe = spring.on('change', (latest) => {
      if (ref.current) {
        const rounded = num % 1 === 0 ? Math.round(latest) : latest.toFixed(1);
        ref.current.textContent = value.replace(/[\d.]+/, String(rounded));
      }
    });

    return unsubscribe;
  }, [spring, value, num]);

  if (num === null) {
    return (
      <motion.span
        ref={ref}
        className={className}
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      >
        {value}
      </motion.span>
    );
  }

  return <span ref={ref} className={className}>{value}</span>;
}
