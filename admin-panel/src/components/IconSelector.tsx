'use client';

import React, { useState } from 'react';
import { ICON_PATHS } from '@/utils/themeUtils';

interface IconSelectorProps {
  selectedIcon: string;
  onSelectIcon: (icon: string) => void;
}

// Create icon options from the paths
const ICONS = Object.entries(ICON_PATHS).map(([id, path]) => ({ id, path }));

const IconSelector: React.FC<IconSelectorProps> = ({ selectedIcon, onSelectIcon }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleSelectIcon = (iconId: string) => {
    onSelectIcon(iconId);
    setIsOpen(false);
  };

  // Find the currently selected icon
  const currentIcon = ICONS.find(icon => icon.id === selectedIcon) || ICONS[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleDropdown}
        className="mt-1 flex items-center justify-between w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      >
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={currentIcon.path} />
          </svg>
          <span>{currentIcon.id}</span>
        </div>
        <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-md bg-white dark:bg-gray-700 shadow-lg border border-gray-300 dark:border-gray-600">
          <div className="p-2 grid grid-cols-4 gap-2">
            {ICONS.map((icon) => (
              <div 
                key={icon.id}
                onClick={() => handleSelectIcon(icon.id)}
                className={`cursor-pointer p-2 rounded-md flex flex-col items-center ${
                  icon.id === selectedIcon
                    ? 'bg-blue-500 text-white' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon.path} />
                </svg>
                <span className={`text-xs mt-1 ${
                  icon.id === selectedIcon
                    ? 'text-white' 
                    : 'text-gray-600 dark:text-gray-300'
                }`}>{icon.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IconSelector;
