/**
 * API Integration Tests: Products
 *
 * Tests the /api/v1/products endpoints
 * Run: npm run test:api (requires dev server running)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { get, post, patch, del, testData, cleanup, deleteTestApiKey } from './setup';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  is_active: boolean;
}

interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string };
  pagination?: { cursor: string | null; has_more: boolean };
}

describe('Products API', () => {
  const createdProductIds: string[] = [];

  afterAll(async () => {
    await cleanup({ products: createdProductIds });
    await deleteTestApiKey();
  });

  describe('GET /api/v1/products', () => {
    it('returns a list of products', async () => {
      const { status, data } = await get<ApiResponse<Product[]>>('/api/v1/products');

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('supports pagination with limit', async () => {
      const { status, data } = await get<ApiResponse<Product[]>>('/api/v1/products?limit=5');

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data!.length).toBeLessThanOrEqual(5);
      expect(data.pagination).toBeDefined();
    });

    it('supports status filter', async () => {
      const { status, data } = await get<ApiResponse<Product[]>>('/api/v1/products?status=active');

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
      // All returned products should be active
      data.data!.forEach(product => {
        expect(product.is_active).toBe(true);
      });
    });

    it('supports search filter', async () => {
      // First create a product with unique name
      const uniqueName = `SearchTest${Date.now()}`;
      const createResult = await post<ApiResponse<Product>>('/api/v1/products', testData.product({ name: uniqueName }));
      if (createResult.data.data?.id) {
        createdProductIds.push(createResult.data.data.id);
      }

      // Then search for it
      const { status, data } = await get<ApiResponse<Product[]>>(`/api/v1/products?search=${uniqueName}`);

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data!.some(p => p.name === uniqueName)).toBe(true);
    });
  });

  describe('POST /api/v1/products', () => {
    it('creates a new product', async () => {
      const productData = testData.product();
      const { status, data } = await post<ApiResponse<Product>>('/api/v1/products', productData);

      expect(status).toBe(201);
      expect(data.data).toBeDefined();
      expect(data.data!.name).toBe(productData.name);
      expect(data.data!.slug).toBe(productData.slug);
      expect(data.data!.price).toBe(productData.price);

      if (data.data?.id) {
        createdProductIds.push(data.data.id);
      }
    });

    it('validates required fields', async () => {
      const { status, data } = await post<ApiResponse<Product>>('/api/v1/products', {});

      expect(status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.error!.code).toBe('VALIDATION_ERROR');
    });

    it('validates price is positive', async () => {
      const { status, data } = await post<ApiResponse<Product>>('/api/v1/products', testData.product({ price: -10 }));

      expect(status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('validates slug uniqueness', async () => {
      const productData = testData.product();

      // Create first product
      const first = await post<ApiResponse<Product>>('/api/v1/products', productData);
      if (first.data.data?.id) {
        createdProductIds.push(first.data.data.id);
      }

      // Try to create second with same slug
      const { status, data } = await post<ApiResponse<Product>>('/api/v1/products', {
        ...testData.product(),
        slug: productData.slug, // Same slug
      });

      expect(status).toBe(409);
      expect(data.error).toBeDefined();
    });
  });

  describe('GET /api/v1/products/:id', () => {
    let testProductId: string;

    beforeAll(async () => {
      const { data } = await post<ApiResponse<Product>>('/api/v1/products', testData.product());
      testProductId = data.data!.id;
      createdProductIds.push(testProductId);
    });

    it('returns a single product', async () => {
      const { status, data } = await get<ApiResponse<Product>>(`/api/v1/products/${testProductId}`);

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data!.id).toBe(testProductId);
    });

    it('returns 404 for non-existent product', async () => {
      const { status, data } = await get<ApiResponse<Product>>('/api/v1/products/00000000-0000-0000-0000-000000000000');

      expect(status).toBe(404);
      expect(data.error).toBeDefined();
      expect(data.error!.code).toBe('NOT_FOUND');
    });

    it('returns 400 for invalid UUID', async () => {
      const { status, data } = await get<ApiResponse<Product>>('/api/v1/products/invalid-uuid');

      expect(status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('PATCH /api/v1/products/:id', () => {
    let testProductId: string;

    beforeAll(async () => {
      const { data } = await post<ApiResponse<Product>>('/api/v1/products', testData.product());
      testProductId = data.data!.id;
      createdProductIds.push(testProductId);
    });

    it('updates product fields', async () => {
      const newName = `Updated Product ${Date.now()}`;
      const { status, data } = await patch<ApiResponse<Product>>(`/api/v1/products/${testProductId}`, {
        name: newName,
      });

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data!.name).toBe(newName);
    });

    it('updates product price', async () => {
      const newPrice = 199.99;
      const { status, data } = await patch<ApiResponse<Product>>(`/api/v1/products/${testProductId}`, {
        price: newPrice,
      });

      expect(status).toBe(200);
      expect(data.data!.price).toBe(newPrice);
    });

    it('toggles product status', async () => {
      const { status, data } = await patch<ApiResponse<Product>>(`/api/v1/products/${testProductId}`, {
        is_active: false,
      });

      expect(status).toBe(200);
      expect(data.data!.is_active).toBe(false);
    });

    it('returns 404 for non-existent product', async () => {
      const { status, data } = await patch<ApiResponse<Product>>('/api/v1/products/00000000-0000-0000-0000-000000000000', {
        name: 'Updated',
      });

      expect(status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });

  describe('DELETE /api/v1/products/:id', () => {
    it('deletes a product', async () => {
      // Create a product to delete
      const { data: createData } = await post<ApiResponse<Product>>('/api/v1/products', testData.product());
      const productId = createData.data!.id;

      // Delete it
      const { status } = await del<ApiResponse<null>>(`/api/v1/products/${productId}`);
      expect(status).toBe(204);

      // Verify it's gone
      const { status: getStatus } = await get<ApiResponse<Product>>(`/api/v1/products/${productId}`);
      expect(getStatus).toBe(404);
    });

    it('returns 404 for non-existent product', async () => {
      const { status, data } = await del<ApiResponse<null>>('/api/v1/products/00000000-0000-0000-0000-000000000000');

      expect(status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });
});
