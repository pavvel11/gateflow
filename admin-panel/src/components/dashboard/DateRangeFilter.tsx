'use client';

import React, { useState, useRef, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useTranslations } from 'next-intl';

interface DateRangeFilterProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
}

export default function DateRangeFilter({ startDate, endDate, onChange }: DateRangeFilterProps) {
  const t = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Local state for partial selection (before both dates are selected)
  const [localStart, setLocalStart] = useState<Date | null>(startDate);
  const [localEnd, setLocalEnd] = useState<Date | null>(endDate);

  // Sync local state with props when they change externally (e.g., preset buttons)
  useEffect(() => {
    setLocalStart(startDate);
    setLocalEnd(endDate);
  }, [startDate, endDate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Ignore clicks on elements that are no longer in the DOM (e.g. after React re-render)
      if (!target.isConnected) {
        return;
      }
      
      // Check if click is inside the container
      const isInsideContainer = containerRef.current && containerRef.current.contains(target as Node);
      
      // Check if click is inside the datepicker portal (just in case, though we use inline)
      const isInsideDatepicker = target.closest('.react-datepicker-popper') || target.closest('.react-datepicker');

      if (!isInsideContainer && !isInsideDatepicker) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;

    // Update local state immediately for visual feedback
    setLocalStart(start);
    setLocalEnd(end);

    // Only propagate to parent and close when both dates are selected
    if (start && end) {
      onChange(start, end);
      setIsOpen(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>
          {startDate && endDate 
            ? `${formatDate(startDate)} - ${formatDate(endDate)}`
            : t('filter')}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-4">
          <DatePicker
            selected={localStart}
            onChange={handleChange}
            startDate={localStart}
            endDate={localEnd}
            selectsRange
            inline
            monthsShown={2}
            maxDate={new Date()}
            shouldCloseOnSelect={false} // Explicitly prevent auto-closing
          />
        </div>
      )}
    </div>
  );
}