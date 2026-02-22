'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Product } from '@/types';
import { BaseModal, ModalHeader, ModalBody, Message } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Modal';
import { useProductForm } from '../hooks';
import { WizardStepIndicator } from './WizardStepIndicator';
import { WizardFooter } from './WizardFooter';
import { StepEssentials } from './steps/StepEssentials';
import { StepContentDetails } from './steps/StepContentDetails';
import { StepSalesSettings } from './steps/StepSalesSettings';
import type { ProductFormData } from '../types';

const TOTAL_STEPS = 3;

export interface ProductCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: ProductFormData) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
  product?: Product | null; // for duplicate mode
}

const ProductCreationWizard: React.FC<ProductCreationWizardProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  product,
}) => {
  const t = useTranslations('admin.products.form');
  const router = useRouter();
  const locale = useLocale();

  const [currentStep, setCurrentStep] = useState(1);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

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

  // Check if form has been touched (for exit confirmation)
  const isFormDirty = useCallback(() => {
    return formData.name !== '' || formData.price > 0 || formData.description !== '';
  }, [formData.name, formData.price, formData.description]);

  // Validate step 1 before proceeding
  const validateStep1 = useCallback((): boolean => {
    return formData.name.trim() !== '' && formData.description.trim() !== '';
  }, [formData.name, formData.description]);

  const handleClose = useCallback(() => {
    if (isFormDirty()) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  }, [isFormDirty, onClose]);

  const handleContinue = useCallback(() => {
    if (currentStep === 1 && !validateStep1()) {
      return; // don't advance if step 1 is incomplete
    }
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, validateStep1]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleStepClick = useCallback((step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
    }
  }, [currentStep]);

  // Trigger the form submit via the hook's handleSubmit
  const handleWizardSubmit = useCallback(() => {
    // Create a synthetic form event to trigger handleSubmit
    const syntheticEvent = {
      preventDefault: () => {},
    } as React.FormEvent;
    handleSubmit(syntheticEvent);
  }, [handleSubmit]);

  const steps = [
    { number: 1, label: t('wizard.step1') },
    { number: 2, label: t('wizard.step2') },
    { number: 3, label: t('wizard.step3') },
  ];

  if (!isOpen) return null;

  return (
    <>
      <BaseModal isOpen={isOpen} onClose={handleClose} size="xl" closeOnBackdropClick={false}>
        <ModalHeader
          title={t('wizard.title')}
          subtitle={t('wizard.subtitle')}
          icon={
            <span className="text-2xl">{formData.icon}</span>
          }
        />

        <WizardStepIndicator
          steps={steps}
          currentStep={currentStep}
          onStepClick={handleStepClick}
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

          {/* Step 1 hint banner */}
          {currentStep === 1 && (
            <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t('wizard.earlyCreateHint')}
              </p>
            </div>
          )}

          <form id="wizard-form" onSubmit={handleSubmit}>
            {currentStep === 1 && (
              <StepEssentials
                formData={formData}
                setFormData={setFormData}
                t={t}
                nameInputRef={nameInputRef}
                slugModified={slugModified}
                setSlugModified={setSlugModified}
                currentDomain={currentDomain}
                generateSlug={generateSlug}
                priceDisplayValue={priceDisplayValue}
                setPriceDisplayValue={setPriceDisplayValue}
                onIconSelect={handleIconSelect}
                shopDefaultVatRate={shopDefaultVatRate}
              />
            )}

            {currentStep === 2 && (
              <StepContentDetails
                formData={formData}
                setFormData={setFormData}
                t={t}
                urlValidation={urlValidation}
                setUrlValidation={setUrlValidation}
                validateContentItemUrl={validateContentItemUrl}
                allCategories={allCategories}
                loadingCategories={loadingCategories}
              />
            )}

            {currentStep === 3 && (
              <StepSalesSettings
                formData={formData}
                setFormData={setFormData}
                t={t}
                salePriceDisplayValue={salePriceDisplayValue}
                setSalePriceDisplayValue={setSalePriceDisplayValue}
                omnibusEnabled={omnibusEnabled}
                hasWaitlistWebhook={hasWaitlistWebhook}
                products={products}
                loadingProducts={loadingProducts}
                currentProductId={product?.id}
                oto={oto}
                setOto={setOto}
              />
            )}
          </form>
        </ModalBody>

        <WizardFooter
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
          isSubmitting={isSubmitting}
          onBack={handleBack}
          onContinue={handleContinue}
          onSubmit={handleWizardSubmit}
          onCancel={handleClose}
          t={t}
        />

        {/* Waitlist Warning Modal */}
        {waitlistWarning.show && (
          <BaseModal isOpen={true} onClose={dismissWaitlistWarning} size="sm">
            <ModalHeader
              title={t('waitlistWarning.title')}
              icon={<span className="text-2xl">&#9888;&#65039;</span>}
            />
            <ModalBody>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('waitlistWarning.description')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('waitlistWarning.consequence')}
              </p>
            </ModalBody>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl flex items-center justify-end space-x-3">
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
            </div>
          </BaseModal>
        )}
      </BaseModal>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <BaseModal isOpen={true} onClose={() => setShowExitConfirm(false)} size="sm">
          <ModalHeader
            title={t('wizard.exitTitle')}
          />
          <ModalBody>
            <p className="text-gray-600 dark:text-gray-300">
              {t('wizard.exitMessage')}
            </p>
          </ModalBody>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl flex items-center justify-end space-x-3">
            <Button onClick={() => setShowExitConfirm(false)} variant="secondary">
              {t('wizard.exitKeepEditing')}
            </Button>
            <Button
              onClick={() => {
                setShowExitConfirm(false);
                onClose();
              }}
              variant="danger"
            >
              {t('wizard.exitDiscard')}
            </Button>
          </div>
        </BaseModal>
      )}
    </>
  );
};

export default ProductCreationWizard;
