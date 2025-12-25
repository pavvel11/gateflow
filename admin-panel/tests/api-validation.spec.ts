import { test, expect } from '@playwright/test';

test.describe('API Validation Logic', () => {
  
  test('should accept a valid, non-disposable email', async ({ request }) => {
    const res = await request.post('/api/validate-email', {
      data: { email: 'test@gmail.com' }
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    
    expect(json.success).toBe(true);
    expect(json.data.isValid).toBe(true);
    expect(json.data.isDisposable).toBe(false);
  });

  test('should reject disposable email addresses from a list of known providers', async ({ request }) => {
    const disposableDomains = [
      'temp-mail.org',
      'mailinator.com',
      '10minutemail.com',
      'guerrillamail.com',
      'throwawaymail.com'
    ];

    for (const domain of disposableDomains) {
      console.log(`Testing disposable domain: ${domain}`);
      const res = await request.post('/api/validate-email', {
        data: { email: `test@${domain}` }
      });
      
      const json = await res.json();
      
      expect(json.success).toBe(true); // The API request itself should succeed
      expect(json.data.isValid).toBe(false);
      expect(json.data.isDisposable).toBe(true);
    }
  });

  test('should reject an email with an invalid format', async ({ request }) => {
    const res = await request.post('/api/validate-email', {
      data: { email: 'invalid-email' }
    });
    const json = await res.json();

    expect(json.success).toBe(false);
    expect(res.status()).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

});