'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '@/types';
import { BaseModal, ModalHeader, ModalBody, ModalFooter, Button, Message } from '@/components/ui/Modal';
import { useTranslations, useLocale } from 'next-intl';

import { useProductForm } from './hooks';
import { ProductPreview } from './components';
import {
  BasicInfoSection,
  PricingSection,
  SalePriceSection,
  AvailabilitySection,
  AccessSection,
  ContentDeliverySection,
  PostPurchaseSection,
  CategoriesSection,
  RefundSection,
  AdvancedSection,
} from './sections';
import { ProductFormData } from './types';

export interface ProductFormModalProps {
  product?: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: ProductFormData) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  product,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error
}) => {
  const t = useTranslations('admin.products.form');
  const router = useRouter();
  const locale = useLocale();

  const {
    formData,
    setFormData,
    priceDisplayValue,
    setPriceDisplayValue,
    salePriceDisplayValue,
    setSalePriceDisplayValue,
    slugModified,
    setSlugModified,
    currentDomain,
    nameInputRef,
    products,
    loadingProducts,
    allCategories,
    loadingCategories,
    omnibusEnabled,
    shopDefaultVatRate,
    oto,
    setOto,
    urlValidation,
    setUrlValidation,
    handleIconSelect,
    handleSubmit,
    generateSlug,
    validateContentItemUrl,
    waitlistWarning,
    proceedWithSubmit,
    dismissWaitlistWarning,
    hasWaitlistWebhook,
  } = useProductForm({ product, isOpen, onSubmit });

  if (!isOpen) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="xl" closeOnBackdropClick={false}>
      <ModalHeader
        title={product && product.id ? t('editProduct') : t('createNewProduct')}
        subtitle={product && product.id ? t('editing', { name: product.name }) : t('addToYourCatalog')}
        icon={
          <span className="text-2xl">{formData.icon}</span>
        }
        badge={!formData.is_active
          ? { text: t('inactive'), variant: 'neutral' }
          : !formData.is_listed
            ? { text: t('active'), variant: 'warning' }
            : { text: t('active'), variant: 'success' }
        }
      />

      <ModalBody>
        {error && (
          <Message
            type="error"
            title={t('error')}
            message={error}
            className="mb-6"
          />
        )}

        <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Product Preview */}
          <ProductPreview formData={formData} t={t} />

          {/* Basic Information */}
          <BasicInfoSection
            formData={formData}
            setFormData={setFormData}
            t={t}
            nameInputRef={nameInputRef}
            slugModified={slugModified}
            setSlugModified={setSlugModified}
            currentDomain={currentDomain}
            generateSlug={generateSlug}
          />

          {/* Content Delivery - essential, must be filled */}
          <ContentDeliverySection
            formData={formData}
            setFormData={setFormData}
            t={t}
            urlValidation={urlValidation}
            setUrlValidation={setUrlValidation}
            validateContentItemUrl={validateContentItemUrl}
          />

          {/* Pricing & Visual */}
          <PricingSection
            formData={formData}
            setFormData={setFormData}
            t={t}
            priceDisplayValue={priceDisplayValue}
            setPriceDisplayValue={setPriceDisplayValue}
            onIconSelect={handleIconSelect}
            shopDefaultVatRate={shopDefaultVatRate}
          />

          {/* Sale Price */}
          <SalePriceSection
            formData={formData}
            setFormData={setFormData}
            t={t}
            salePriceDisplayValue={salePriceDisplayValue}
            setSalePriceDisplayValue={setSalePriceDisplayValue}
            omnibusEnabled={omnibusEnabled}
          />

          {/* Temporal Availability */}
          <AvailabilitySection
            formData={formData}
            setFormData={setFormData}
            t={t}
            hasWaitlistWebhook={hasWaitlistWebhook}
          />

          {/* Auto-Grant Access */}
          <AccessSection
            formData={formData}
            setFormData={setFormData}
            t={t}
          />

          {/* Post-Purchase (Redirect & OTO) */}
          <PostPurchaseSection
            formData={formData}
            setFormData={setFormData}
            t={t}
            products={products}
            loadingProducts={loadingProducts}
            currentProductId={product?.id}
            oto={oto}
            setOto={setOto}
          />

          {/* Categories */}
          <CategoriesSection
            formData={formData}
            setFormData={setFormData}
            t={t}
            allCategories={allCategories}
            loadingCategories={loadingCategories}
          />

          {/* Refund Settings */}
          <RefundSection
            formData={formData}
            setFormData={setFormData}
            t={t}
          />

          {/* Advanced Settings */}
          <AdvancedSection
            formData={formData}
            setFormData={setFormData}
            t={t}
            omnibusEnabled={omnibusEnabled}
          />
        </form>
      </ModalBody>

      <ModalFooter>
        <Button onClick={onClose} variant="secondary">
          {t('cancel')}
        </Button>
        <Button
          type="submit"
          form="product-form"
          disabled={isSubmitting}
          loading={isSubmitting}
          variant="primary"
        >
          {product && product.id ? t('updateProduct') : t('createProduct')}
        </Button>
      </ModalFooter>

      {/* Waitlist Warning Modal */}
      {waitlistWarning.show && (
        <BaseModal isOpen={true} onClose={dismissWaitlistWarning} size="sm">
          <ModalHeader
            title={t('waitlistWarning.title')}
            icon={<span className="text-2xl">⚠️</span>}
          />
          <ModalBody>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {t('waitlistWarning.description')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('waitlistWarning.consequence')}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button onClick={dismissWaitlistWarning} variant="secondary">
              {t('cancel')}
            </Button>
            <Button
              onClick={() => {
                dismissWaitlistWarning();
                router.push(`/${locale}/dashboard/webhooks`);
              }}
              variant="secondary"
            >
              {t('waitlistWarning.configureWebhook')}
            </Button>
            <Button onClick={proceedWithSubmit} variant="danger">
              {t('waitlistWarning.saveAnyway')}
            </Button>
          </ModalFooter>
        </BaseModal>
      )}
    </BaseModal>
  );
};

// Re-export types for external use
export type { ProductFormData } from './types';
export default ProductFormModal;
