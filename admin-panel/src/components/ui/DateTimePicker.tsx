'use client';

import React, { useState, useRef, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { convertLocalToUTC, convertUTCToLocal, addTimezoneInfo } from '@/lib/timezone';
import "react-datepicker/dist/react-datepicker.css";

interface DateTimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  showTimeSelect?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export default function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date and time",
  label,
  description,
  error,
  disabled = false,
  required = false,
  showTimeSelect = true,
  minDate,
  maxDate
}: DateTimePickerProps) {
  // Convert UTC value from database to local time for display
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(convertUTCToLocal(value)) : null
  );
  const [isOpen, setIsOpen] = useState(false);
  const datePickerRef = useRef<DatePicker>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      // Convert UTC from database to local time for display
      const localDatetimeString = convertUTCToLocal(value);
      setSelectedDate(localDatetimeString ? new Date(localDatetimeString) : null);
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  // Update data-theme attribute for calendar
  useEffect(() => {
    if (calendarRef.current) {
      // Check both class-based and media query dark mode
      const isDark = document.documentElement.classList.contains('dark') || 
                     window.matchMedia('(prefers-color-scheme: dark)').matches;
      calendarRef.current.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
  }, [isOpen]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    if (date) {
      // Format date to local datetime string (YYYY-MM-DDTHH:MM) without timezone conversion
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      const localDatetimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
      
      // Convert local time to UTC for database storage
      const utcIsoString = convertLocalToUTC(localDatetimeString);
      onChange(utcIsoString);
    } else {
      onChange('');
    }
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(null);
    onChange('');
    setIsOpen(false);
  };

  const formatDisplayValue = (date: Date | null) => {
    if (!date) return '';
    
    // Format in user's local timezone
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          {!required && <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(optional)</span>}
        </label>
      )}
      
      <div className="relative">
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`
            w-full px-3 py-2.5 text-left border rounded-lg shadow-sm transition-all duration-200 cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${disabled 
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' 
              : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-gray-500'
            }
            ${error 
              ? 'border-red-300 dark:border-red-600' 
              : 'border-gray-300 dark:border-gray-600'
            }
          `}
        >
          <div className="flex items-center justify-between">
            <span className={selectedDate ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
              {selectedDate ? formatDisplayValue(selectedDate) : placeholder}
            </span>
            <div className="flex items-center space-x-2">
              {selectedDate && !disabled && (
                <div
                  onClick={handleClear}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              <svg 
                className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${
                  disabled ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'
                }`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        {isOpen && (
          <div 
            ref={calendarRef}
            className="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden"
          >
            <DatePicker
              ref={datePickerRef}
              selected={selectedDate}
              onChange={handleDateChange}
              showTimeSelect={showTimeSelect}
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat={showTimeSelect ? "yyyy-MM-dd HH:mm" : "yyyy-MM-dd"}
              inline
              minDate={minDate}
              maxDate={maxDate}
              calendarClassName="modern-calendar"
              popperClassName="modern-calendar-popper"
            />
          </div>
        )}
      </div>

      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {addTimezoneInfo(description)}
        </p>
      )}
      
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
