'use client';

import React from 'react';
import { ModalSection } from '@/components/ui/Modal';
import { ProductContentConfig } from '@/types';
import { ContentDeliverySectionProps } from '../types';

export function ContentDeliverySection({
  formData,
  setFormData,
  t,
  urlValidation,
  setUrlValidation,
  validateContentItemUrl,
}: ContentDeliverySectionProps) {
  const contentItems = (formData.content_config as ProductContentConfig)?.content_items || [];
  const hasVideoEmbeds = contentItems.some(item => item.type === 'video_embed');
  const hasDownloadLinks = contentItems.some(item => item.type === 'download_link');

  const handleContentTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      content_delivery_type: e.target.value as 'redirect' | 'content'
    }));
  };

  const handleRedirectUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      content_config: { redirect_url: e.target.value }
    }));
  };

  const handleItemTypeChange = (index: number, newType: 'video_embed' | 'download_link') => {
    const newItems = [...contentItems];
    newItems[index] = { ...newItems[index], type: newType };
    setFormData(prev => ({
      ...prev,
      content_config: { ...prev.content_config, content_items: newItems }
    }));
    // Clear validation for this item when type changes
    setUrlValidation(prev => {
      const newValidation = { ...prev };
      delete newValidation[index];
      return newValidation;
    });
  };

  const handleItemTitleChange = (index: number, title: string) => {
    const newItems = [...contentItems];
    newItems[index] = { ...newItems[index], title };
    setFormData(prev => ({
      ...prev,
      content_config: { ...prev.content_config, content_items: newItems }
    }));
  };

  const handleItemUrlChange = (index: number, url: string) => {
    const newItems = [...contentItems];
    const configKey = newItems[index].type === 'video_embed' ? 'embed_url' : 'download_url';
    newItems[index] = {
      ...newItems[index],
      config: { ...newItems[index].config, [configKey]: url }
    };
    setFormData(prev => ({
      ...prev,
      content_config: { ...prev.content_config, content_items: newItems }
    }));
  };

  const handleItemUrlBlur = (index: number, url: string, type: 'video_embed' | 'download_link') => {
    if (url) {
      const validation = validateContentItemUrl(url, type);
      setUrlValidation(prev => ({
        ...prev,
        [index]: validation
      }));
    } else {
      setUrlValidation(prev => {
        const newValidation = { ...prev };
        delete newValidation[index];
        return newValidation;
      });
    }
  };

  const handleVideoOptionChange = (index: number, option: string, checked: boolean) => {
    const newItems = [...contentItems];
    newItems[index] = {
      ...newItems[index],
      config: { ...newItems[index].config, [option]: checked }
    };
    setFormData(prev => ({
      ...prev,
      content_config: { ...prev.content_config, content_items: newItems }
    }));
  };

  const handleRemoveItem = (index: number) => {
    const newItems = contentItems.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      content_config: { ...prev.content_config, content_items: newItems }
    }));
    // Rebuild validation state with shifted indices
    setUrlValidation(prev => {
      const newValidation: Record<number, { isValid: boolean; message: string }> = {};
      Object.keys(prev).forEach(key => {
        const idx = parseInt(key);
        if (idx < index) {
          newValidation[idx] = prev[idx];
        } else if (idx > index) {
          newValidation[idx - 1] = prev[idx];
        }
      });
      return newValidation;
    });
  };

  const handleAddItem = () => {
    const newItems = [...contentItems, {
      id: `temp-${Date.now()}`,
      type: 'video_embed' as const,
      title: '',
      config: { embed_url: '' },
      order: contentItems.length + 1,
      is_active: true
    }];
    setFormData(prev => ({
      ...prev,
      content_config: { ...prev.content_config, content_items: newItems }
    }));
  };

  return (
    <ModalSection title={t('contentDelivery')} collapsible defaultExpanded={true}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('contentDeliveryType')}
          </label>
          <select
            value={formData.content_delivery_type}
            onChange={handleContentTypeChange}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="content">{t('contentItems')}</option>
            <option value="redirect">{t('redirect')}</option>
          </select>
        </div>

        {formData.content_delivery_type === 'redirect' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('redirectUrl')}
            </label>
            <input
              type="text"
              placeholder={t('redirectPlaceholder')}
              value={(formData.content_config as { redirect_url?: string })?.redirect_url || ''}
              onChange={handleRedirectUrlChange}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('redirectDescription')}
            </p>
          </div>
        )}

        {formData.content_delivery_type === 'content' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('contentItems')}
            </label>

            {/* Video platforms info */}
            {hasVideoEmbeds && (
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">Supported Video Platforms</h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Paste any URL format - we&apos;ll convert it to the proper embed URL automatically!
                    </p>
                    <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                      📺 YouTube • 🎬 Vimeo • 🐰 Bunny.net • 🎥 Loom • 📹 Wistia • 🎞️ DailyMotion • 🎮 Twitch
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Download providers info */}
            {hasDownloadLinks && (
              <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-green-800 dark:text-green-200">Trusted Storage Providers for Downloads</h4>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      Download URLs must use HTTPS and be from trusted storage providers for security.
                    </p>
                    <div className="mt-2 text-xs text-green-600 dark:text-green-400 leading-relaxed">
                      <div>☁️ Cloud: AWS S3, Google Cloud Storage, Supabase Storage</div>
                      <div>📁 Personal: Google Drive, Dropbox, OneDrive, Box, SharePoint</div>
                      <div>🌐 CDN: Bunny CDN, Cloudinary, Imgix, Fastly</div>
                      <div>📤 File Sharing: Mega, MediaFire, WeTransfer, SendSpace</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {contentItems.map((item, index) => (
                <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <select
                      value={item.type}
                      onChange={(e) => handleItemTypeChange(index, e.target.value as 'video_embed' | 'download_link')}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                    >
                      <option value="video_embed">{t('videoEmbed')}</option>
                      <option value="download_link">{t('downloadLink')}</option>
                    </select>
                    <input
                      type="text"
                      placeholder={t('title')}
                      value={item.title}
                      onChange={(e) => handleItemTitleChange(index, e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                    />
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder={t('url')}
                        value={item.config?.embed_url || item.config?.download_url || ''}
                        onChange={(e) => handleItemUrlChange(index, e.target.value)}
                        onBlur={(e) => handleItemUrlBlur(index, e.target.value, item.type as 'video_embed' | 'download_link')}
                        className={`w-full px-2 py-1 pr-8 border rounded text-sm dark:bg-gray-700 dark:text-white ${
                          urlValidation[index]
                            ? urlValidation[index].isValid
                              ? 'border-green-500 dark:border-green-600'
                              : 'border-red-500 dark:border-red-600'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {urlValidation[index] && (
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          {urlValidation[index].isValid ? (
                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="px-2 py-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      {t('remove')}
                    </button>
                  </div>

                  {/* URL Validation Message */}
                  {urlValidation[index] && (
                    <div className={`mt-2 text-xs flex items-start space-x-1 ${
                      urlValidation[index].isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {urlValidation[index].isValid ? (
                        <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      )}
                      <span>{urlValidation[index].message}</span>
                    </div>
                  )}

                  {/* Video Embed Options */}
                  {item.type === 'video_embed' && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Video Options</div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {['autoplay', 'loop', 'muted', 'preload'].map(option => (
                          <label key={option} className="flex items-center space-x-1 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(item.config?.[option as 'autoplay' | 'loop' | 'muted' | 'preload'])}
                              onChange={(e) => handleVideoOptionChange(index, option, e.target.checked)}
                              className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-gray-700 dark:text-gray-300 capitalize">{option}</span>
                          </label>
                        ))}
                        <label className="flex items-center space-x-1 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.config?.controls !== false}
                            onChange={(e) => handleVideoOptionChange(index, 'controls', e.target.checked)}
                            className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-gray-700 dark:text-gray-300">Controls</span>
                        </label>
                      </div>
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        💡 Options support varies by platform (YouTube, Vimeo, Bunny.net, etc.)
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                {t('addContentItem')}
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalSection>
  );
}
