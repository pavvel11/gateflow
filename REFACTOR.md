# Checkout Flow Refactoring Plan

> **Status:** Planned (Post Link + Express Checkout implementation)
> **Priority:** High
> **Estimated Effort:** 2-3 days
> **Related:** Code review from 2026-01-15

## 📋 Overview

CustomPaymentForm.tsx currently has **755 lines** and **5+ responsibilities**, violating SOLID principles and containing significant code duplication. This document outlines a comprehensive refactoring plan to improve:

- ✅ **Testability** - Easier to unit test isolated hooks
- ✅ **Maintainability** - Smaller, focused components
- ✅ **Reusability** - Shared components and hooks
- ✅ **Performance** - Proper memoization
- ✅ **Type Safety** - No `any` types
- ✅ **Accessibility** - WCAG 2.1 AA compliance
- ✅ **Security** - Input validation, error handling

---

## 🎯 Goals

**Before:** 755-line monolith with mixed concerns
**After:** ~300-line component + 4 custom hooks + 2 reusable components

**Metrics to track:**
- Lines of code per file (max 250)
- Test coverage (target 80%+)
- Bundle size impact
- Lighthouse accessibility score

---

## 🔧 Phase 1: Extract Custom Hooks (P0)

### 1.1 Create `useProfileData` Hook

**File:** `/hooks/useProfileData.ts`

**Responsibilities:**
- Load user profile data on mount
- Handle loading states
- Error handling with toast notifications

**Interface:**
```typescript
interface UseProfileDataReturn {
  profileData: ProfileData | null;
  isLoadingProfile: boolean;
  error: string | null;
}

export function useProfileData(email?: string): UseProfileDataReturn
```

**Extracted from CustomPaymentForm:**
- Lines 92-125 (profile loading logic)
- State: `isLoadingProfile`, profile data
- useEffect with profile fetch

**Tests to write:**
- Should load profile for logged-in users
- Should not load for guest users
- Should handle fetch errors gracefully
- Should show toast on error

---

### 1.2 Create `useGUSAutoFill` Hook

**File:** `/hooks/useGUSAutoFill.ts`

**Responsibilities:**
- Fetch company data from Polish GUS registry
- Handle rate limiting
- Error states and validation
- Loading indicators

**Interface:**
```typescript
interface UseGUSAutoFillReturn {
  isLoadingGUS: boolean;
  gusError: string | null;
  gusSuccess: boolean;
  gusData: GUSCompanyData | null;
  fetchGUSData: (nip: string) => Promise<GUSCompanyData | null>;
  reset: () => void;
}

export function useGUSAutoFill(): UseGUSAutoFillReturn
```

**Extracted from CustomPaymentForm:**
- Lines 66-70, 138-203 (GUS integration)
- State: `isLoadingGUS`, `gusError`, `gusSuccess`, `gusData`
- GUS API fetch logic
- Error mapping

**Improvements:**
- Add client-side rate limiting (2s cooldown)
- Validate GUS response structure before using
- Add retry logic for network errors

**Tests to write:**
- Should fetch GUS data for valid NIP
- Should handle rate limit errors
- Should validate response structure
- Should respect cooldown period
- Should handle network errors

---

### 1.3 Create `useInvoiceForm` Hook

**File:** `/hooks/useInvoiceForm.ts`

**Responsibilities:**
- Manage invoice form fields
- NIP validation
- Auto-fill from GUS data
- Form state management

**Interface:**
```typescript
interface InvoiceFormData {
  nip: string;
  companyName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

interface UseInvoiceFormReturn {
  formData: InvoiceFormData;
  nipError: string | null;
  updateField: (field: keyof InvoiceFormData, value: string) => void;
  autofillFromGUSData: (data: GUSCompanyData) => void;
  validateNIP: () => boolean;
  reset: () => void;
}

export function useInvoiceForm(
  initialData?: Partial<InvoiceFormData>
): UseInvoiceFormReturn
```

**Extracted from CustomPaymentForm:**
- Lines 52-59 (invoice state)
- Lines 166-180 (GUS autofill logic)
- NIP validation logic

**Tests to write:**
- Should update fields correctly
- Should auto-fill from GUS data
- Should validate NIP format
- Should handle empty NIP (valid - optional)
- Should reset form

---

### 1.4 Create `usePaymentSubmit` Hook

**File:** `/hooks/usePaymentSubmit.ts`

**Responsibilities:**
- Handle payment form submission
- Stripe Elements validation
- Metadata update
- Error handling
- Loading states

**Interface:**
```typescript
interface UsePaymentSubmitOptions {
  stripe: Stripe | null;
  elements: StripeElements | null;
  clientSecret?: string;
  onSuccess?: () => void;
}

interface UsePaymentSubmitReturn {
  isProcessing: boolean;
  errorMessage: string;
  submitPayment: (data: PaymentFormData) => Promise<void>;
}

export function usePaymentSubmit(
  options: UsePaymentSubmitOptions
): UsePaymentSubmitReturn
```

**Extracted from CustomPaymentForm:**
- Lines 218-366 (handleSubmit logic)
- Payment confirmation flow
- Metadata update API call
- Error handling

**Improvements:**
- Better error messages for specific Stripe errors
- Retry logic for metadata update
- Warning if invoice data fails to save

**Tests to write:**
- Should validate form before submit
- Should update metadata before payment
- Should handle Stripe errors correctly
- Should track payment events
- Should prevent double submission

---

## 🧩 Phase 2: Extract Reusable Components (P1)

### 2.1 Create `FormInput` Component

**File:** `/components/forms/FormInput.tsx`

**Replaces:** 5 repeated input field patterns (lines 606-656)

**Props:**
```typescript
interface FormInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel';
  required?: boolean;
  disabled?: boolean;
  error?: string | null;
  className?: string;
  'aria-describedby'?: string;
}
```

**Features:**
- Consistent styling
- Error state handling
- Accessibility labels
- Dark mode support

**Usage:**
```tsx
<FormInput
  id="companyName"
  label={t('companyNameLabel')}
  value={companyName}
  onChange={setCompanyName}
  error={companyNameError}
  required
/>
```

---

### 2.2 Create `InvoiceFormFields` Component

**File:** `/components/forms/InvoiceFormFields.tsx`

**Extracts:** Invoice fields group (lines 606-656)

**Props:**
```typescript
interface InvoiceFormFieldsProps {
  formData: InvoiceFormData;
  updateField: (field: keyof InvoiceFormData, value: string) => void;
  errors?: Partial<Record<keyof InvoiceFormData, string>>;
  disabled?: boolean;
}
```

**Features:**
- All invoice fields in one component
- Consistent validation
- Easy to test
- Reusable in profile settings

---

### 2.3 Create `ExpressCheckoutSection` Component

**File:** `/components/payment/ExpressCheckoutSection.tsx`

**Extracts:** Express Checkout UI (lines 393-424)

**Props:**
```typescript
interface ExpressCheckoutSectionProps {
  visible: boolean;
  onReady: (event: ExpressCheckoutReadyEvent) => void;
  onConfirm: () => Promise<void>;
  separatorText?: string;
}
```

**Benefits:**
- Isolated Express Checkout logic
- Easy to toggle on/off
- Testable independently

---

## 🔐 Phase 3: Security & Validation (P1)

### 3.1 Add GUS Data Validation

**File:** `/lib/validation/gus.ts`

```typescript
interface GUSCompanyData {
  nazwa: string;
  ulica: string;
  nrNieruchomosci: string;
  nrLokalu?: string;
  miejscowosc: string;
  kodPocztowy: string;
}

export function isValidGUSData(data: unknown): data is GUSCompanyData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as any).nazwa === 'string' &&
    typeof (data as any).ulica === 'string' &&
    typeof (data as any).nrNieruchomosci === 'string' &&
    typeof (data as any).miejscowosc === 'string' &&
    typeof (data as any).kodPocztowy === 'string' &&
    (data as any).nazwa.length > 0 &&
    (data as any).ulica.length > 0
  );
}
```

**Usage in `useGUSAutoFill`:**
```typescript
if (result.success && result.data) {
  if (!isValidGUSData(result.data)) {
    setGusError('Nieprawidłowe dane z GUS. Wprowadź dane ręcznie.');
    return null;
  }
  setGusData(result.data);
  return result.data;
}
```

---

### 3.2 Centralize Validation Logic

**File:** `/lib/validation/payment.ts`

```typescript
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateEmail(email: string): ValidationResult {
  if (!email || !email.trim()) {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  return { isValid: true };
}

export function validateFullName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Full name is required' };
  }

  if (name.trim().length < 3) {
    return { isValid: false, error: 'Name must be at least 3 characters' };
  }

  return { isValid: true };
}
```

---

## ♿ Phase 4: Accessibility Improvements (P2)

### 4.1 Add ARIA Labels to Loading States

```tsx
{isLoadingGUS && (
  <div
    className="absolute right-3 top-1/2 -translate-y-1/2"
    role="status"
    aria-live="polite"
    aria-label="Loading company data from GUS registry"
  >
    <svg
      className="animate-spin h-5 w-5 text-blue-400"
      aria-hidden="true"
      /* ... */
    />
    <span className="sr-only">Loading company data...</span>
  </div>
)}
```

---

### 4.2 Add Error Role to Messages

```tsx
{errorMessage && (
  <div
    className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg"
    role="alert"
    aria-live="assertive"
  >
    <p className="text-red-300 text-sm">{errorMessage}</p>
  </div>
)}
```

---

### 4.3 Improve Checkbox Accessibility

```tsx
<input
  type="checkbox"
  checked={termsAccepted}
  onChange={(e) => setTermsAccepted(e.target.checked)}
  aria-required="true"
  aria-describedby="terms-description"
  aria-invalid={!termsAccepted && attemptedSubmit}
  className="..."
  required
/>
<span id="terms-description" className="...">
  {/* Terms text */}
</span>
```

---

## 🛡️ Phase 5: Error Handling & Boundaries (P0)

### 5.1 Add Payment Error Boundary

**File:** `/components/ErrorBoundary.tsx`

```typescript
import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class PaymentErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Payment form error:', error, errorInfo);
    // Optional: Send to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 bg-red-900/30 border border-red-500/50 rounded-xl">
          <h3 className="text-lg font-semibold text-red-300 mb-2">
            Payment System Error
          </h3>
          <p className="text-red-100/90 text-sm mb-4">
            We encountered an issue loading the payment form.
            Please refresh the page or contact support.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Usage in PaidProductForm:**
```tsx
<PaymentErrorBoundary>
  <CustomPaymentForm {...props} />
</PaymentErrorBoundary>
```

---

### 5.2 Improve Error Messages

**File:** `/lib/errors/stripe.ts`

```typescript
export function getStripeErrorMessage(error: StripeError, t: TranslateFunction): string {
  const errorMessages: Record<string, string> = {
    card_declined: t('payment.cardDeclined', {
      defaultValue: 'Your card was declined. Please try a different payment method.'
    }),
    insufficient_funds: t('payment.insufficientFunds', {
      defaultValue: 'Insufficient funds. Please use a different card.'
    }),
    expired_card: t('payment.expiredCard', {
      defaultValue: 'Your card has expired. Please update your card details.'
    }),
    incorrect_cvc: t('payment.incorrectCvc', {
      defaultValue: 'Incorrect security code. Please check and try again.'
    }),
    processing_error: t('payment.processingError', {
      defaultValue: 'Payment processing error. Please try again.'
    }),
    authentication_required: t('payment.authRequired', {
      defaultValue: 'Payment requires authentication. Please complete the verification.'
    }),
  };

  return (
    errorMessages[error.code || ''] ||
    error.message ||
    t('payment.genericError', {
      defaultValue: 'Payment failed. Please try again or contact support.'
    })
  );
}
```

---

## 📁 Final File Structure

```
/admin-panel/src
├── app/[locale]/checkout/[slug]/components
│   ├── CustomPaymentForm.tsx (~300 lines - slimmed down)
│   ├── PaidProductForm.tsx (existing)
│   └── ProductShowcase.tsx (existing)
│
├── components
│   ├── forms
│   │   ├── FormInput.tsx
│   │   └── InvoiceFormFields.tsx
│   ├── payment
│   │   ├── ExpressCheckoutSection.tsx
│   │   └── OrderSummary.tsx (future)
│   └── ErrorBoundary.tsx
│
├── hooks
│   ├── useProfileData.ts
│   ├── useGUSAutoFill.ts
│   ├── useInvoiceForm.ts
│   ├── usePaymentSubmit.ts
│   └── usePricing.ts (existing)
│
├── lib
│   ├── validation
│   │   ├── nip.ts (existing)
│   │   ├── gus.ts (new)
│   │   └── payment.ts (new)
│   ├── errors
│   │   └── stripe.ts (new)
│   └── ...
│
└── types
    ├── payment.ts (new - OrderBump, AppliedCoupon, etc.)
    └── gus.ts (new - GUSCompanyData)
```

---

## ✅ Testing Strategy

### Unit Tests

**Hooks:**
- `useProfileData.test.ts` (5 tests)
- `useGUSAutoFill.test.ts` (7 tests)
- `useInvoiceForm.test.ts` (6 tests)
- `usePaymentSubmit.test.ts` (8 tests)

**Components:**
- `FormInput.test.tsx` (6 tests)
- `InvoiceFormFields.test.tsx` (5 tests)
- `ExpressCheckoutSection.test.tsx` (4 tests)

**Utilities:**
- `gus.test.ts` - Validation (4 tests)
- `payment.test.ts` - Validation (6 tests)
- `stripe.test.ts` - Error messages (5 tests)

**Total:** ~56 unit tests

### Integration Tests

- CustomPaymentForm with all hooks (E2E-like but with mocked Stripe)
- Invoice flow with GUS auto-fill
- Express Checkout flow

**Total:** ~8 integration tests

### E2E Tests (Playwright)

- Guest checkout with invoice
- Logged-in user checkout with profile data
- Express Checkout one-click payment
- GUS API failure handling
- Payment error scenarios

**Total:** ~10 E2E tests (existing + 3 new)

---

## 📊 Success Metrics

| Metric | Before | Target | How to Measure |
|--------|--------|--------|----------------|
| Lines in CustomPaymentForm | 755 | <300 | `wc -l` |
| Number of responsibilities | 5+ | 1-2 | Manual review |
| Test coverage | ~20% | 80%+ | Vitest coverage |
| Bundle size increase | - | <5KB | `bun build --analyze` |
| Lighthouse Accessibility | Unknown | 95+ | Lighthouse CI |
| Type errors | 4 `any` | 0 | `tsc --noEmit` |
| Re-render count (profiler) | High | -30% | React DevTools |

---

## 🚀 Implementation Timeline

**Week 1:**
- ✅ Day 1-2: Extract hooks (useProfileData, useGUSAutoFill, useInvoiceForm)
- ✅ Day 3: Write hook tests
- ✅ Day 4: Extract reusable components (FormInput, InvoiceFormFields)
- ✅ Day 5: Write component tests

**Week 2:**
- ✅ Day 6: Add validation utilities
- ✅ Day 7: Add error boundary and improved error messages
- ✅ Day 8: Accessibility improvements
- ✅ Day 9: Integration testing
- ✅ Day 10: Performance profiling and optimization

**Week 3:**
- ✅ Code review
- ✅ QA testing
- ✅ Documentation update
- ✅ Deploy to staging
- ✅ Production deployment

---

## 🔗 Related Issues

- [ ] #TBD - Extract payment form hooks
- [ ] #TBD - Create reusable form components
- [ ] #TBD - Add payment error boundary
- [ ] #TBD - Improve checkout accessibility
- [ ] #TBD - Add comprehensive payment tests

---

## 📚 References

**Best Practices:**
- [React Hook Patterns](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/hooks/)
- [SOLID Principles in React](https://konstantinlebedev.com/solid-in-react/)
- [Component Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

**Stripe Documentation:**
- [Payment Element Best Practices](https://docs.stripe.com/payments/payment-element/best-practices)
- [Express Checkout Element](https://docs.stripe.com/elements/express-checkout-element)

**Accessibility:**
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

---

**Created:** 2026-01-15
**Author:** Code Review Analysis
**Status:** Ready for Implementation
