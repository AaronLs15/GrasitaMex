// app/admin/products/actions.ts
'use server';

import { supabaseServer } from '@/lib/supabase/server';

export async function createProduct(form: FormData) {
  const supa = await supabaseServer();
  const title = String(form.get('title'));
  const price = Math.round(Number(form.get('price_mxn')) * 100);
  const slug = String(form.get('slug') || title.toLowerCase().replace(/\s+/g,'-'));

  // RLS permite a admin insertar
  const { data, error } = await supa.from('products').insert({
    title, slug, price_cents: price, currency: 'MXN', published: false
  }).select('*').single();

  if (error) throw error;
  return data;
}
