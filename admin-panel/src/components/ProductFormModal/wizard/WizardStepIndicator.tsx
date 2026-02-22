'use client';

import React from 'react';

interface Step {
  label: string;
  number: number;
}

interface WizardStepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

export const WizardStepIndicator: React.FC<WizardStepIndicatorProps> = ({
  steps,
  currentStep,
  onStepClick,
}) => {
  return (
    <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
      {/* Desktop view */}
      <div className="hidden sm:flex items-center justify-center">
        {steps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isClickable = step.number < currentStep;

          return (
            <React.Fragment key={step.number}>
              {index > 0 && (
                <div
                  className={`h-0.5 w-16 mx-2 transition-colors duration-200 ${
                    isCompleted
                      ? 'bg-blue-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.number)}
                disabled={!isClickable}
                className={`flex items-center gap-2 group ${
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <div
                  className={`
                    flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold
                    transition-all duration-200 flex-shrink-0
                    ${isCompleted
                      ? 'bg-blue-500 text-white'
                      : isCurrent
                        ? 'bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-500/50'
                        : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }
                    ${isClickable ? 'group-hover:ring-2 group-hover:ring-blue-300 dark:group-hover:ring-blue-500/50' : ''}
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`text-sm font-medium whitespace-nowrap ${
                    isCurrent
                      ? 'text-blue-600 dark:text-blue-400'
                      : isCompleted
                        ? 'text-gray-700 dark:text-gray-300'
                        : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile view */}
      <div className="flex sm:hidden items-center justify-between">
        <div className="flex items-center gap-2">
          {steps.map((step, index) => {
            const isCompleted = step.number < currentStep;
            const isCurrent = step.number === currentStep;
            const isClickable = step.number < currentStep;

            return (
              <React.Fragment key={step.number}>
                {index > 0 && (
                  <div
                    className={`h-0.5 w-6 transition-colors duration-200 ${
                      isCompleted
                        ? 'bg-blue-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(step.number)}
                  disabled={!isClickable}
                  className={`
                    flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold
                    transition-all duration-200
                    ${isCompleted
                      ? 'bg-blue-500 text-white'
                      : isCurrent
                        ? 'bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-500/50'
                        : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {steps[currentStep - 1]?.label}
        </span>
      </div>
    </div>
  );
};
