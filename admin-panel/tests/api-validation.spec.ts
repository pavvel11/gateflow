import { test, expect } from '@playwright/test';

test.describe('API Validation Logic', () => {
  
  test('should validate disposable email addresses', async ({ request }) => {
    // 1. Valid Email
    const validRes = await request.post('/api/validate-email', {
      data: { email: 'test@gmail.com' }
    });
    expect(validRes.ok()).toBeTruthy();
    const validJson = await validRes.json();
    
    // Structure is { success: true, data: { isValid: true, ... } }
    expect(validJson.success).toBe(true);
    expect(validJson.data.isValid).toBe(true);

    // 2. Disposable Email
    const disposableRes = await request.post('/api/validate-email', {
      data: { email: 'spammer@temp-mail.org' }
    });
    
    const disposableJson = await disposableRes.json();
    
    // We expect valid: false
    expect(disposableJson.success).toBe(true); // Request succeeded
    expect(disposableJson.data.isValid).toBe(false);
    expect(disposableJson.data.isDisposable).toBe(true);
  });

});