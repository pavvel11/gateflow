'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { updateIntegrationsConfig } from '@/lib/actions/integrations'
import { IntegrationsInput } from '@/lib/validations/integrations'

interface IntegrationsFormProps {
  initialData: IntegrationsInput
}

export default function IntegrationsForm({ initialData }: IntegrationsFormProps) {

  const t = useTranslations('integrations')

  const [formData, setFormData] = useState<IntegrationsInput>(initialData)

  const [loading, setLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<'analytics' | 'marketing' | 'consents' | 'code'>('analytics')

  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault()

    setLoading(true)

    setMessage(null)



    try {

      const result = await updateIntegrationsConfig(formData)

      if (result.error) {

        setMessage({ type: 'error', text: t('messages.saveError', { error: result.error }) })

      } else {

        setMessage({ type: 'success', text: t('messages.saveSuccess') })

      }

    } catch (err) {

      setMessage({ type: 'error', text: t('messages.saveError', { error: 'Unexpected error' }) })

    } finally {

      setLoading(false)

    }

  }



  const handleChange = (field: keyof IntegrationsInput, value: any) => {

    setFormData(prev => ({ ...prev, [field]: value }))

  }



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

    <form onSubmit={handleSubmit} className="space-y-6">

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">

        {/* Tabs Header */}

        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">

          <TabButton id="analytics" label={t('tabs.analytics')} />

          <TabButton id="marketing" label={t('tabs.marketing')} />

          <TabButton id="consents" label={t('tabs.consents')} />

          <TabButton id="code" label={t('tabs.code')} />

        </div>



        {/* Content */}

        <div className="p-6 space-y-6">

          

          {/* Analytics Tab */}

          {activeTab === 'analytics' && (

            <div className="space-y-6 animate-in fade-in duration-300">

              <div>

                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('gtm.title')}</h3>

                <div className="grid gap-6 md:grid-cols-2">

                  <div>

                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">

                      {t('gtm.containerId')}

                    </label>

                    <input

                      type="text"

                      placeholder="GTM-XXXXXX"

                      value={formData.gtm_container_id || ''}

                      onChange={(e) => handleChange('gtm_container_id', e.target.value)}

                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"

                    />

                    <p className="mt-1 text-xs text-gray-500">

                      {t('gtm.help')}

                    </p>

                  </div>

                </div>

              </div>



              <div className="border-t border-gray-100 dark:border-gray-700 pt-6">

                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('googleAds.title')}</h3>

                <div className="grid gap-6 md:grid-cols-2">

                  <div>

                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">

                      {t('googleAds.conversionId')}

                    </label>

                    <input

                      type="text"

                      placeholder="AW-XXXXXX"

                      value={formData.google_ads_conversion_id || ''}

                      onChange={(e) => handleChange('google_ads_conversion_id', e.target.value)}

                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"

                    />

                  </div>

                  <div>

                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">

                      {t('googleAds.conversionLabel')}

                    </label>

                    <input

                      type="text"

                      placeholder="e.g. AbC_xYz123"

                      value={formData.google_ads_conversion_label || ''}

                      onChange={(e) => handleChange('google_ads_conversion_label', e.target.value)}

                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"

                    />

                  </div>

                </div>

              </div>

            </div>

          )}



          {/* Marketing Tab */}

          {activeTab === 'marketing' && (

            <div className="space-y-6 animate-in fade-in duration-300">

              <div>

                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('facebook.title')}</h3>

                <div className="grid gap-6 md:grid-cols-2">

                  <div>

                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">

                      {t('facebook.pixelId')}

                    </label>

                    <input

                      type="text"

                      placeholder="1234567890"

                      value={formData.facebook_pixel_id || ''}

                      onChange={(e) => handleChange('facebook_pixel_id', e.target.value)}

                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"

                    />

                    <p className="mt-1 text-xs text-gray-500">

                      {t('facebook.pixelHelp')}

                    </p>

                  </div>

                  

                  <div className="md:col-span-2 border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">

                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center">

                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>

                      {t('facebook.capiTitle')}

                    </h4>

                    <p className="text-sm text-gray-500 mb-4">

                      {t('facebook.capiHelp')}

                    </p>

                    

                    <div className="space-y-4">

                      <div>

                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">

                          {t('facebook.accessToken')}

                        </label>

                        <input

                          type="password"

                          placeholder="EAA..."

                          value={formData.facebook_capi_token || ''}

                          onChange={(e) => handleChange('facebook_capi_token', e.target.value)}

                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"

                        />

                        <p className="mt-1 text-xs text-gray-500">

                          {t('facebook.tokenHelp')}

                        </p>

                      </div>

                      

                      <div>

                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">

                          {t('facebook.testCode')}

                        </label>

                        <input

                          type="text"

                          placeholder="TESTXXXX"

                          value={formData.facebook_test_event_code || ''}

                          onChange={(e) => handleChange('facebook_test_event_code', e.target.value)}

                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-48"

                        />

                        <p className="mt-1 text-xs text-gray-500">

                          {t('facebook.testCodeHelp')}

                        </p>

                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          )}



          {/* Consents Tab */}

          {activeTab === 'consents' && (

            <div className="space-y-6 animate-in fade-in duration-300">

              <div>

                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('cookieConsent.title')}</h3>

                

                <div className="space-y-4">

                  <div className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">

                    <div className="flex items-center h-5">

                      <input

                        id="cookie_consent_enabled"

                        type="checkbox"

                        checked={formData.cookie_consent_enabled}

                        onChange={(e) => handleChange('cookie_consent_enabled', e.target.checked)}

                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"

                      />

                    </div>

                    <div className="flex-1 text-sm">

                      <label htmlFor="cookie_consent_enabled" className="font-medium text-gray-900 dark:text-white">

                        {t('cookieConsent.requireConsent')}

                      </label>

                      <p className="text-gray-500 mt-1">

                        {t('cookieConsent.requireConsentHelp')}

                      </p>

                    </div>

                  </div>



                  <div className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">

                    <div className="flex items-center h-5">

                      <input

                        id="consent_logging_enabled"

                        type="checkbox"

                        checked={formData.consent_logging_enabled}

                        onChange={(e) => handleChange('consent_logging_enabled', e.target.checked)}

                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"

                      />

                    </div>

                    <div className="flex-1 text-sm">

                      <label htmlFor="consent_logging_enabled" className="font-medium text-gray-900 dark:text-white">

                        {t('cookieConsent.enableLogging')}

                      </label>

                      <p className="text-gray-500 mt-1">

                        {t('cookieConsent.enableLoggingHelp')}

                        <br/><span className="text-yellow-600 dark:text-yellow-400 font-medium">{t('cookieConsent.loggingWarning')}</span>

                      </p>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          )}



          {/* Custom Code Tab */}

          {activeTab === 'code' && (

            <div className="space-y-6 animate-in fade-in duration-300">

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">

                <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center">

                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />

                  </svg>

                  {t('customCode.warning')}

                </p>

              </div>



              <div>

                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">

                  {t('customCode.headCode')}

                </label>

                <p className="text-xs text-gray-500 mb-2">{t('customCode.headHelp')}</p>

                <textarea

                  rows={6}

                  value={formData.custom_head_code || ''}

                  onChange={(e) => handleChange('custom_head_code', e.target.value)}

                  placeholder="<script>...</script>"

                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"

                />

              </div>



              <div>

                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">

                  {t('customCode.bodyCode')}

                </label>

                <p className="text-xs text-gray-500 mb-2">{t('customCode.bodyHelp')}</p>

                <textarea

                  rows={6}

                  value={formData.custom_body_code || ''}

                  onChange={(e) => handleChange('custom_body_code', e.target.value)}

                  placeholder="<noscript>...</noscript>"

                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"

                />

              </div>

            </div>

          )}



        </div>



        {/* Footer */}

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">

          <div className="flex-1">

            {message && (

              <div className={`text-sm font-medium ${message.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>

                {message.text}

              </div>

            )}

          </div>

          <button

            type="submit"

            disabled={loading}

            className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-sm ${

              loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-md'

            }`}

          >

            {loading ? t('messages.saving') : t('common.save', { defaultValue: 'Save Changes' })}

          </button>

        </div>

      </div>

    </form>

  )

}


