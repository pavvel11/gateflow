'use client';

import React, { useState } from 'react';

export interface ThemeOption {
  value: string;
  label: string;
  color: string;
}

interface ThemeSelectorProps {
  selectedTheme: string;
  onSelectTheme: (theme: string) => void;
  themes: ThemeOption[];
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ 
  selectedTheme, 
  onSelectTheme,
  themes
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleSelectTheme = (themeValue: string) => {
    onSelectTheme(themeValue);
    setIsOpen(false);
  };

  // Find the currently selected theme
  const currentTheme = themes.find(theme => theme.value === selectedTheme) || themes[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleDropdown}
        className="mt-1 flex items-center justify-between w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      >
        <div className="flex items-center space-x-2">
          <div className={`w-4 h-4 rounded-full ${currentTheme.color}`}></div>
          <span>{currentTheme.label}</span>
        </div>
        <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-md bg-white dark:bg-gray-700 shadow-lg border border-gray-300 dark:border-gray-600">
          <div className="p-2">
            {themes.map((theme) => (
              <div 
                key={theme.value}
                onClick={() => handleSelectTheme(theme.value)}
                className={`cursor-pointer p-2 rounded-md flex items-center space-x-2 ${
                  theme.value === selectedTheme
                    ? 'bg-blue-500 text-white' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <div className={`w-4 h-4 rounded-full ${theme.color}`}></div>
                <span className={`text-sm ${
                  theme.value === selectedTheme
                    ? 'text-white' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}>{theme.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;
