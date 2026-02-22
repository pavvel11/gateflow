'use client';

import React from 'react';
import { BasicInfoSection, PricingSection } from '../../sections';
import { ProductPreview } from '../../components';
import type { ProductFormData, TranslationFunction } from '../../types';

interface StepEssentialsProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  t: TranslationFunction;
  nameInputRef: React.RefObject<HTMLInputElement | null>;
  slugModified: boolean;
  setSlugModified: (value: boolean) => void;
  currentDomain: string;
  generateSlug: (name: string) => string;
  priceDisplayValue: string;
  setPriceDisplayValue: (value: string) => void;
  onIconSelect: (icon: string) => void;
  shopDefaultVatRate: number | null;
}

export const StepEssentials: React.FC<StepEssentialsProps> = ({
  formData,
  setFormData,
  t,
  nameInputRef,
  slugModified,
  setSlugModified,
  currentDomain,
  generateSlug,
  priceDisplayValue,
  setPriceDisplayValue,
  onIconSelect,
  shopDefaultVatRate,
}) => {
  return (
    <div className="space-y-6">
      <ProductPreview formData={formData} t={t} />

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

      <PricingSection
        formData={formData}
        setFormData={setFormData}
        t={t}
        priceDisplayValue={priceDisplayValue}
        setPriceDisplayValue={setPriceDisplayValue}
        onIconSelect={onIconSelect}
        shopDefaultVatRate={shopDefaultVatRate}
      />
    </div>
  );
};
