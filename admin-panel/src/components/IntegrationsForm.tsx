'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { updateIntegrationsConfig, addScript, deleteScript, toggleScript } from '@/lib/actions/integrations'
import { IntegrationsInput, CustomScriptInput } from '@/lib/validations/integrations'

interface Script {
  id: string
  name: string
  script_location: 'head' | 'body'
  script_content: string
  category: 'essential' | 'analytics' | 'marketing'
  is_active: boolean
  created_at: string
}

interface IntegrationsFormProps {
  initialData: IntegrationsInput
  initialScripts: Script[]
}

export default function IntegrationsForm({ initialData, initialScripts }: IntegrationsFormProps) {
  const t = useTranslations('integrations') // Ensure translations exist for scripts
  const [formData, setFormData] = useState<IntegrationsInput>(initialData)
  const [scripts, setScripts] = useState<Script[]>(initialScripts)
  
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'analytics' | 'marketing' | 'consents' | 'scripts'>('analytics')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Script Modal State
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false)
  const [newScript, setNewScript] = useState<CustomScriptInput>({
    name: '',
    script_location: 'head',
    script_content: '',
    category: 'marketing',
    is_active: true
  })

  // --- CONFIG HANDLERS ---
  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const result = await updateIntegrationsConfig(formData)
      if (result.error) setMessage({ type: 'error', text: result.error })
      else setMessage({ type: 'success', text: 'Settings saved' })
    } catch (err) { setMessage({ type: 'error', text: 'Error' }) }
    finally { setLoading(false) }
  }

  const handleChange = (field: keyof IntegrationsInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // --- SCRIPT HANDLERS ---
  const handleAddScript = async () => {
    setLoading(true)
    const result = await addScript(newScript)
    if (result.success) {
      setIsScriptModalOpen(false)
      // Optimistic update or refresh needed. For now, simple reload or we rely on revalidatePath
      // But revalidatePath only refreshes server components. We need to update local state or router.refresh()
      window.location.reload() 
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed' })
    }
    setLoading(false)
  }

  const handleDeleteScript = async (id: string) => {
    if(!confirm('Delete script?')) return
    await deleteScript(id)
    setScripts(prev => prev.filter(s => s.id !== id))
  }

  const handleToggleScript = async (id: string, current: boolean) => {
    await toggleScript(id, !current)
    setScripts(prev => prev.map(s => s.id === id ? { ...s, is_active: !current } : s))
  }

  // --- UI COMPONENTS ---
  const TabButton = ({ id, label }: { id: typeof activeTab, label: string }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        activeTab === id
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Tabs Header */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <TabButton id="analytics" label="Analytics" />
          <TabButton id="marketing" label="Marketing" />
          <TabButton id="consents" label="Consents" />
          <TabButton id="scripts" label="Script Manager" />
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleConfigSubmit}>
            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Google Tag Manager</h3>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Container ID</label>
                      <input type="text" placeholder="GTM-XXXXXX" value={formData.gtm_container_id || ''} onChange={(e) => handleChange('gtm_container_id', e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>
                </div>
                {/* ... Google Ads ... */}
              </div>
            )}

            {/* Marketing Tab */}
            {activeTab === 'marketing' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Meta (Facebook)</h3>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pixel ID</label>
                      <input type="text" placeholder="1234567890" value={formData.facebook_pixel_id || ''} onChange={(e) => handleChange('facebook_pixel_id', e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CAPI Token</label>
                        <input type="password" value={formData.facebook_capi_token || ''} onChange={(e) => handleChange('facebook_capi_token', e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Consents Tab */}
            {activeTab === 'consents' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                 <div className="flex items-center h-5 gap-3">
                    <input id="consent" type="checkbox" checked={formData.cookie_consent_enabled} onChange={(e) => handleChange('cookie_consent_enabled', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                    <label htmlFor="consent" className="text-sm font-medium text-gray-900 dark:text-white">Require Consent (Recommended)</label>
                 </div>
              </div>
            )}

            {activeTab !== 'scripts' && (
                <div className="mt-6 border-t pt-4 flex justify-end">
                    <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">{loading ? 'Saving...' : 'Save Config'}</button>
                </div>
            )}
          </form>

          {/* SCRIPT MANAGER TAB */}
          {activeTab === 'scripts' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Custom Scripts</h3>
                    <button onClick={() => setIsScriptModalOpen(true)} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm">+ Add Script</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Location</th>
                                <th className="px-4 py-3">Category (GDPR)</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scripts.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-4 text-center">No custom scripts added.</td></tr>
                            ) : (
                                scripts.map(script => (
                                    <tr key={script.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{script.name}</td>
                                        <td className="px-4 py-3 uppercase">{script.script_location}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs ${
                                                script.category === 'essential' ? 'bg-gray-100 text-gray-800' :
                                                script.category === 'marketing' ? 'bg-purple-100 text-purple-800' :
                                                'bg-blue-100 text-blue-800'
                                            }`}>
                                                {script.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => handleToggleScript(script.id, script.is_active)} className={`px-2 py-1 rounded text-xs font-bold ${script.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {script.is_active ? 'ACTIVE' : 'INACTIVE'}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => handleDeleteScript(script.id)} className="text-red-600 hover:underline">Delete</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
          )}
        </div>
      </div>

      {/* ADD SCRIPT MODAL */}
      {isScriptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add New Script</h3>
                
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Name</label>
                    <input type="text" className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600" value={newScript.name} onChange={e => setNewScript({...newScript, name: e.target.value})} placeholder="e.g. Hotjar" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Location</label>
                        <select className="w-full border rounded p-2 dark:bg-gray-700" value={newScript.script_location} onChange={e => setNewScript({...newScript, script_location: e.target.value as any})}>
                            <option value="head">HEAD</option>
                            <option value="body">BODY</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Category (GDPR)</label>
                        <select className="w-full border rounded p-2 dark:bg-gray-700" value={newScript.category} onChange={e => setNewScript({...newScript, category: e.target.value as any})}>
                            <option value="marketing">Marketing (Requires Consent)</option>
                            <option value="analytics">Analytics (Requires Consent)</option>
                            <option value="essential">Essential (Always Load)</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Script Code</label>
                    <textarea rows={5} className="w-full border rounded p-2 font-mono text-sm dark:bg-gray-700" value={newScript.script_content} onChange={e => setNewScript({...newScript, script_content: e.target.value})} placeholder="<script>...</script>"></textarea>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setIsScriptModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                    <button onClick={handleAddScript} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add Script</button>
                </div>
            </div>
        </div>
      )}

      {message && <div className={`fixed bottom-4 right-4 p-4 rounded shadow-lg ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>{message.text}</div>}
    </div>
  )
}