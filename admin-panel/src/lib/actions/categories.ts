'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isDemoMode, DEMO_MODE_ERROR } from '@/lib/demo-guard'

export interface Category {
  id: string
  name: string
  slug: string
  description?: string | null
  parent_id?: string | null
  created_at: string
}

export async function getCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data as Category[]
}

export async function createCategory(data: { name: string; slug: string; description?: string }) {
  if (isDemoMode()) return { success: false, error: DEMO_MODE_ERROR }
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('categories')
    .insert(data)
  
  if (error) throw error
  revalidatePath('/dashboard/categories')
  return { success: true }
}

export async function updateCategory(id: string, data: { name: string; slug: string; description?: string }) {
  if (isDemoMode()) return { success: false, error: DEMO_MODE_ERROR }
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('categories')
    .update(data)
    .eq('id', id)
  
  if (error) throw error
  revalidatePath('/dashboard/categories')
  return { success: true }
}

export async function deleteCategory(id: string) {
  if (isDemoMode()) return { success: false, error: DEMO_MODE_ERROR }
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
  
  if (error) throw error
  revalidatePath('/dashboard/categories')
  return { success: true }
}

export async function getProductCategories(productId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('product_categories')
    .select('category_id')
    .eq('product_id', productId)
  
  if (error) throw error
  return data.map(row => row.category_id) as string[]
}

export async function updateProductCategories(productId: string, categoryIds: string[]) {
  if (isDemoMode()) return { success: false, error: DEMO_MODE_ERROR }
  const supabase = await createClient()
  
  // 1. Delete existing
  const { error: deleteError } = await supabase
    .from('product_categories')
    .delete()
    .eq('product_id', productId)
  
  if (deleteError) throw deleteError
  
  // 2. Insert new (if any)
  if (categoryIds.length > 0) {
    const { error: insertError } = await supabase
      .from('product_categories')
      .insert(categoryIds.map(catId => ({
        product_id: productId,
        category_id: catId
      })))
    
    if (insertError) throw insertError
  }
  
  revalidatePath('/dashboard/products')
  return { success: true }
}
