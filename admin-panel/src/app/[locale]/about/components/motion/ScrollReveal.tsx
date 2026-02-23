'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
}

const directionMap = {
  up: { y: 1 },
  down: { y: -1 },
  left: { x: 1 },
  right: { x: -1 },
} as const;

export function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = 'up',
  distance = 24,
}: ScrollRevealProps) {
  const d = directionMap[direction];
  const initial: { opacity: number; x?: number; y?: number } = { opacity: 0 };
  if ('y' in d) initial.y = d.y * distance;
  if ('x' in d) initial.x = d.x * distance;

  return (
    <motion.div
      initial={initial}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{
        type: 'spring',
        stiffness: 100,
        damping: 20,
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
