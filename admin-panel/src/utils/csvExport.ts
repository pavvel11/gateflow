import { Product } from '@/types';

/**
 * Convert an array of products to CSV and trigger download
 * 
 * @param products - Array of products to export
 * @param filename - Name of the downloaded file
 */
export function exportProductsToCsv(products: Product[], filename = 'products.csv'): void {
  // Define the CSV headers
  const headers = [
    'ID',
    'Name',
    'Slug',
    'Description',
    'Price',
    'Status',
    'Created',
    'Updated',
    'Icon'
  ];

  // Convert the products to CSV rows
  const rows = products.map(product => [
    product.id,
    `"${product.name.replace(/"/g, '""')}"`, // Escape quotes in the name
    product.slug,
    `"${product.description.replace(/"/g, '""')}"`, // Escape quotes in the description
    product.price.toString(),
    product.is_active ? 'Active' : 'Inactive',
    new Date(product.created_at).toISOString().split('T')[0], // Format date as YYYY-MM-DD
    product.updated_at ? new Date(product.updated_at).toISOString().split('T')[0] : '',
    product.icon || ''
  ]);

  // Join the headers and rows to create the CSV content
  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create a blob from the CSV content
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  // Create a link element and trigger the download
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
