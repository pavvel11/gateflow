'use client';

import { motion } from 'motion/react';
import { Children, type ReactNode } from 'react';

interface StaggerRevealProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  baseDelay?: number;
}

export function StaggerReveal({
  children,
  className,
  staggerDelay = 0.08,
  baseDelay = 0,
}: StaggerRevealProps) {
  return (
    <div className={className}>
      {Children.map(children, (child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{
            type: 'spring',
            stiffness: 100,
            damping: 20,
            delay: baseDelay + i * staggerDelay,
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
