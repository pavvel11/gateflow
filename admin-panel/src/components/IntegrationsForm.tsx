'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { updateIntegrationsConfig, addScript, deleteScript, toggleScript } from '@/lib/actions/integrations'
import { IntegrationsInput, CustomScriptInput } from '@/lib/validations/integrations'
import CurrencySettings from '@/components/settings/CurrencySettings'
import GUSSettings from '@/components/settings/GUSSettings'
import { useToast } from '@/contexts/ToastContext'

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
  const t = useTranslations('integrations')
  const tCommon = useTranslations('common')
  const { addToast } = useToast()
  const [formData, setFormData] = useState<IntegrationsInput>(initialData)
  const [scripts, setScripts] = useState<Script[]>(initialScripts)

  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'analytics' | 'marketing' | 'consents' | 'scripts' | 'currency' | 'gus'>('analytics')

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
    try {
      const result = await updateIntegrationsConfig(formData)
      if (result.error) {
        addToast(result.error, 'error')
      } else {
        addToast(t('messages.saveSuccess'), 'success')
      }
    } catch (err) {
      addToast(t('messages.saveError', { error: 'Unknown' }), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof IntegrationsInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // --- SCRIPT HANDLERS ---
  const handleAddScript = async () => {
    setLoading(true)
    const result = await addScript(newScript)
    if (result.success) {
      addToast(t('messages.saveSuccess'), 'success')
      setIsScriptModalOpen(false)
      window.location.reload()
    } else {
      addToast(result.error || 'Failed', 'error')
    }
    setLoading(false)
  }

  const handleDeleteScript = async (id: string) => {
    if(!confirm(t('scripts.deleteConfirm'))) return
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
          <TabButton id="analytics" label={t('tabs.analytics')} />
          <TabButton id="marketing" label={t('tabs.marketing')} />
          <TabButton id="consents" label={t('tabs.consents')} />
          <TabButton id="scripts" label={t('tabs.code')} />
          <TabButton id="currency" label={t('tabs.currency')} />
          <TabButton id="gus" label={t('tabs.gus')} />
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleConfigSubmit}>
            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('gtm.title')}</h3>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('gtm.containerId')}</label>
                      <input type="text" placeholder="GTM-XXXXXX" value={formData.gtm_container_id || ''} onChange={(e) => handleChange('gtm_container_id', e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('gtm.serverContainerUrl')}
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Advanced)</span>
                      </label>
                      <input type="text" placeholder="https://gtm.yourdomain.com" value={formData.gtm_server_container_url || ''} onChange={(e) => handleChange('gtm_server_container_url', e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('gtm.serverContainerHelp')}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700 my-6"></div>

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('umami.title')}</h3>
                    <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800 font-medium">{t('umami.privacyFocused')}</span>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('umami.websiteId')}</label>
                      <input type="text" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={formData.umami_website_id || ''} onChange={(e) => handleChange('umami_website_id', e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('umami.scriptUrl')}</label>
                      <input type="text" placeholder="https://cloud.umami.is/script.js" value={formData.umami_script_url || ''} onChange={(e) => handleChange('umami_script_url', e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('umami.default')}: https://cloud.umami.is/script.js</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Marketing Tab */}
            {activeTab === 'marketing' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('facebook.title')}</h3>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('facebook.pixelId')}</label>
                      <input type="text" placeholder="1234567890" value={formData.facebook_pixel_id || ''} onChange={(e) => handleChange('facebook_pixel_id', e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('facebook.capiToken')}</label>
                        <input type="password" value={formData.facebook_capi_token || ''} onChange={(e) => handleChange('facebook_capi_token', e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('facebook.capiTokenHelp')}</p>
                    </div>
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="fb_capi_enabled"
                          checked={formData.fb_capi_enabled ?? false}
                          onChange={(e) => handleChange('fb_capi_enabled', e.target.checked)}
                          disabled={!formData.facebook_capi_token}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                        />
                        <label htmlFor="fb_capi_enabled" className={`text-sm font-medium ${!formData.facebook_capi_token ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {t('facebook.enableCAPI')}
                        </label>
                      </div>
                      {formData.fb_capi_enabled && !formData.facebook_capi_token && (
                        <p className="mt-1 text-xs text-amber-600">{t('facebook.capiTokenRequired')}</p>
                      )}
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
                    <label htmlFor="consent" className="text-sm font-medium text-gray-900 dark:text-white">{t('cookieConsent.requireConsent')}</label>
                 </div>
              </div>
            )}

            {!['scripts', 'currency', 'gus'].includes(activeTab) && (
                <div className="mt-6 border-t pt-4 flex justify-end">
                    <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">{loading ? t('messages.saving') : t('saveConfig')}</button>
                </div>
            )}
          </form>

          {/* SCRIPT MANAGER TAB */}
          {activeTab === 'scripts' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('scripts.title')}</h3>
                    <button onClick={() => setIsScriptModalOpen(true)} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm">+ {t('scripts.addScript')}</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-4 py-3">{t('scripts.table.name')}</th>
                                <th className="px-4 py-3">{t('scripts.table.location')}</th>
                                <th className="px-4 py-3">{t('scripts.table.category')}</th>
                                <th className="px-4 py-3">{t('scripts.table.status')}</th>
                                <th className="px-4 py-3">{t('scripts.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scripts.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-4 text-center">{t('scripts.noScripts')}</td></tr>
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
                                                {t(`scripts.categories.${script.category}`)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => handleToggleScript(script.id, script.is_active)} className={`px-2 py-1 rounded text-xs font-bold ${script.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {script.is_active ? tCommon('active') : tCommon('inactive')}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => handleDeleteScript(script.id)} className="text-red-600 hover:underline">{tCommon('delete')}</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
          )}

          {/* Currency Tab */}
          {activeTab === 'currency' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <CurrencySettings />
            </div>
          )}

          {/* GUS Tab */}
          {activeTab === 'gus' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <GUSSettings />
            </div>
          )}
        </div>
      </div>

      {/* ADD SCRIPT MODAL */}
      {isScriptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('scripts.modal.title')}</h3>
                
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('scripts.modal.name')}</label>
                    <input type="text" className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600" value={newScript.name} onChange={e => setNewScript({...newScript, name: e.target.value})} placeholder="e.g. Hotjar" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('scripts.modal.location')}</label>
                        <select className="w-full border rounded p-2 dark:bg-gray-700" value={newScript.script_location} onChange={e => setNewScript({...newScript, script_location: e.target.value as any})}>
                            <option value="head">HEAD</option>
                            <option value="body">BODY</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('scripts.modal.category')}</label>
                        <select className="w-full border rounded p-2 dark:bg-gray-700" value={newScript.category} onChange={e => setNewScript({...newScript, category: e.target.value as any})}>
                            <option value="marketing">{t('scripts.categories.marketing')}</option>
                            <option value="analytics">{t('scripts.categories.analytics')}</option>
                            <option value="essential">{t('scripts.categories.essential')}</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('scripts.modal.code')}</label>
                    <textarea rows={5} className="w-full border rounded p-2 font-mono text-sm dark:bg-gray-700" value={newScript.script_content} onChange={e => setNewScript({...newScript, script_content: e.target.value})} placeholder="<script>...</script>"></textarea>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setIsScriptModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">{t('scripts.modal.cancel')}</button>
                    <button onClick={handleAddScript} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">{t('scripts.modal.add')}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}