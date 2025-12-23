'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { getRevenueStats } from '@/lib/actions/analytics'
import { useRealtime } from '@/contexts/RealtimeContext'

export default function RevenueGoal() {
  const t = useTranslations('admin.dashboard')
  const { addRefreshListener, removeRefreshListener } = useRealtime()
  const [goal, setGoal] = useState(1000000)
  const [currentRevenue, setCurrentRevenue] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const fetchRevenue = useCallback(async () => {
    try {
      const stats = await getRevenueStats()
      if (stats) {
        setCurrentRevenue(stats.totalRevenue)
      }
    } catch (err) {
      console.error('Failed to fetch revenue for goal', err)
    }
  }, [])

  useEffect(() => {
    // Load goal from local storage
    const savedGoal = localStorage.getItem('revenue_goal')
    if (savedGoal) {
      setGoal(parseInt(savedGoal, 10))
    }
    
    addRefreshListener(fetchRevenue)
    fetchRevenue() // Initial fetch

    return () => {
      removeRefreshListener(fetchRevenue)
    }
  }, [addRefreshListener, removeRefreshListener, fetchRevenue])

  const handleSave = () => {
    const newGoal = parseInt(inputValue.replace(/[^0-9]/g, ''), 10) * 100 // Convert to cents
    if (newGoal > 0) {
      setGoal(newGoal)
      localStorage.setItem('revenue_goal', newGoal.toString())
    }
    setIsEditing(false)
  }

  // Calculate raw percentage for display (can exceed 100%)
  const rawPercentage = goal > 0 ? Math.round((currentRevenue / goal) * 100) : 0
  // Calculate visual percentage for progress bar (capped at 100%)
  const visualPercentage = Math.min(rawPercentage, 100)

  // Listen for storage changes to sync goal across tabs
  useEffect(() => {
    const handleStorageChange = () => {
      const savedGoal = localStorage.getItem('revenue_goal')
      if (savedGoal) {
        setGoal(parseInt(savedGoal, 10))
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount / 100)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('revenueGoal', { defaultValue: 'Revenue Goal' })}
        </h3>
        {isEditing ? (
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="e.g. 50000"
              className="w-24 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
              autoFocus
            />
            <button 
              onClick={handleSave}
              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        ) : (
          <button 
            onClick={() => {
              setInputValue((goal / 100).toString())
              setIsEditing(true)
            }}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t('setGoal', { defaultValue: 'Set Goal' })}
          </button>
        )}
      </div>

      <div className="relative pt-1">
        <div className="flex mb-2 items-center justify-between">
          <div>
            <span className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${
              rawPercentage >= 100 
                ? 'text-green-600 bg-green-200 dark:bg-green-900 dark:text-green-200' 
                : 'text-blue-600 bg-blue-200 dark:bg-blue-900 dark:text-blue-200'
            }`}>
              {rawPercentage}%
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold inline-block text-blue-600 dark:text-blue-400">
              {formatCurrency(currentRevenue)} / {formatCurrency(goal)}
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200 dark:bg-gray-700">
          <div 
            style={{ width: `${visualPercentage}%` }} 
            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
              rawPercentage >= 100 ? 'bg-green-500' : 'bg-blue-500'
            }`}
          ></div>
        </div>
      </div>
    </div>
  )
}
