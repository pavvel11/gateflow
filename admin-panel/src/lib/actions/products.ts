'use server';

import { createClient } from '@/lib/supabase/server';

export interface ProductListItem {
  id: string;
  name: string;
}

export async function getProductsList(): Promise<ProductListItem[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('products')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true });
  
  if (error) {
    console.error('Error fetching products list:', error);
    return [];
  }
  
  return data || [];
}
