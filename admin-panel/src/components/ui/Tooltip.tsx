'use client';

import { useState, useRef, cloneElement, isValidElement } from 'react';
import type { ReactNode, ReactElement } from 'react';
import {
  useFloating,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  offset,
  flip,
  shift,
  arrow,
  FloatingPortal,
  FloatingArrow,
} from '@floating-ui/react';
import type { Placement } from '@floating-ui/react';

interface TooltipProps {
  /** Tooltip content — string or JSX */
  content: ReactNode;
  /** Trigger element (must accept ref) */
  children: ReactElement;
  /** Preferred placement */
  side?: Placement;
  /** Delay before showing (ms) */
  delay?: number;
  /** Max width of the tooltip */
  maxWidth?: number;
}

export function Tooltip({
  content,
  children,
  side = 'top',
  delay = 300,
  maxWidth = 240,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef(null);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: side,
    middleware: [
      offset(8),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      arrow({ element: arrowRef }),
    ],
  });

  const hover = useHover(context, { delay: { open: delay, close: 0 } });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  if (!content) return children;

  return (
    <>
      {isValidElement(children) &&
        cloneElement(children, {
          ref: refs.setReference,
          ...getReferenceProps(),
        } as Record<string, unknown>)}
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{ ...floatingStyles, maxWidth, zIndex: 9999 }}
            className="rounded-md bg-sf-tooltip-bg text-sf-tooltip-text px-2.5 py-1.5 text-xs leading-relaxed shadow-lg transition-opacity duration-150"
            {...getFloatingProps()}
          >
            {content}
            <FloatingArrow
              ref={arrowRef}
              context={context}
              className="fill-sf-tooltip-bg"
              width={10}
              height={5}
            />
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
