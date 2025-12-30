import { test, expect } from '@playwright/test';
import { calculateEffectivePrice, isSalePriceActive } from '../src/lib/services/omnibus';

test.describe('Effective Price Calculation', () => {
  test('should return regular price when no sale or coupon', () => {
    const result = calculateEffectivePrice(
      100, // price
      null, // sale_price
      null, // sale_price_until
      0 // coupon discount
    );

    expect(result.effectivePrice).toBe(100);
    expect(result.originalPrice).toBe(100);
    expect(result.showStrikethrough).toBe(false);
    expect(result.isUsingSalePrice).toBe(false);
    expect(result.isUsingCoupon).toBe(false);
  });

  test('should use sale_price when active and better than regular', () => {
    const result = calculateEffectivePrice(
      100, // price
      60, // sale_price
      null, // no expiration
      0 // no coupon
    );

    expect(result.effectivePrice).toBe(60);
    expect(result.originalPrice).toBe(100);
    expect(result.showStrikethrough).toBe(true);
    expect(result.isUsingSalePrice).toBe(true);
    expect(result.isUsingCoupon).toBe(false);
  });

  test('should use coupon when better than sale_price', () => {
    const result = calculateEffectivePrice(
      100, // price
      70, // sale_price (worse than coupon)
      null,
      50 // coupon discount (100 - 50 = 50, better than 70)
    );

    expect(result.effectivePrice).toBe(50);
    expect(result.originalPrice).toBe(100);
    expect(result.showStrikethrough).toBe(true);
    expect(result.isUsingSalePrice).toBe(false);
    expect(result.isUsingCoupon).toBe(true);
  });

  test('should use sale_price when better than coupon', () => {
    const result = calculateEffectivePrice(
      100, // price
      40, // sale_price (better than coupon)
      null,
      50 // coupon discount (100 - 50 = 50, worse than 40)
    );

    expect(result.effectivePrice).toBe(40);
    expect(result.originalPrice).toBe(100);
    expect(result.showStrikethrough).toBe(true);
    expect(result.isUsingSalePrice).toBe(true);
    expect(result.isUsingCoupon).toBe(false);
  });

  test('should ignore expired sale_price', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday
    const result = calculateEffectivePrice(
      100,
      60, // sale_price (expired)
      pastDate,
      0
    );

    expect(result.effectivePrice).toBe(100);
    expect(result.showStrikethrough).toBe(false);
    expect(result.isUsingSalePrice).toBe(false);
  });

  test('should use active future-dated sale_price', () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow
    const result = calculateEffectivePrice(
      100,
      60,
      futureDate,
      0
    );

    expect(result.effectivePrice).toBe(60);
    expect(result.isUsingSalePrice).toBe(true);
  });

  test('should choose best among all three: regular, sale, coupon', () => {
    // Price: 100, Sale: 55, Coupon: -70 (= 30)
    const result = calculateEffectivePrice(
      100,
      55,
      null,
      70 // Coupon gives best price: 30
    );

    expect(result.effectivePrice).toBe(30);
    expect(result.isUsingCoupon).toBe(true);
    expect(result.isUsingSalePrice).toBe(false);
  });
});

test.describe('Sale Price Active Check', () => {
  test('should return true for active indefinite sale', () => {
    expect(isSalePriceActive(50, null)).toBe(true);
  });

  test('should return false for null sale_price', () => {
    expect(isSalePriceActive(null, null)).toBe(false);
  });

  test('should return false for zero sale_price', () => {
    expect(isSalePriceActive(0, null)).toBe(false);
  });

  test('should return false for expired sale', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(isSalePriceActive(50, pastDate)).toBe(false);
  });

  test('should return true for future-dated sale', () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(isSalePriceActive(50, futureDate)).toBe(true);
  });
});
