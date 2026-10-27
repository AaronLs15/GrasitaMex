// app/admin/products/actions.ts
'use server';

import { createClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase/server';

type CleanupJob = { id: number; bucket_id: string; object_path: string };

async function requireAdmin() {
  const supa = await supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) throw new Error('No autorizado');
  const { data: profile, error } = await supa.from('profiles').select('role').eq('id', user.id).single();
  if (error || profile?.role !== 'admin') throw new Error('Solo un administrador puede realizar esta acción');
  return supa;
}

async function processImageCleanupQueue() {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data, error } = await service.rpc('claim_storage_cleanup_jobs', { p_limit: 100 });
  if (error) throw error;
  const jobs = (data ?? []) as CleanupJob[];
  let failed = 0;

  for (const job of jobs) {
    const { error: removeError } = await service.storage.from(job.bucket_id).remove([job.object_path]);
    const { error: finishError } = await service.rpc('finish_storage_cleanup_job', {
      p_job_id: job.id,
      p_error: removeError?.message ?? null,
    });
    if (removeError || finishError) failed += 1;
  }
  const { count } = await service.from('storage_cleanup_jobs').select('id', { count: 'exact', head: true }).is('completed_at', null);
  return failed + (count ?? 0);
}

export async function deleteProduct(productId: number) {
  const supa = await requireAdmin();
  const { data, error } = await supa.from('products').delete().eq('id', productId).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No se encontró el producto o no tienes permiso para eliminarlo');
  let cleanupPending = false;
  try { cleanupPending = (await processImageCleanupQueue()) > 0; } catch { cleanupPending = true; }
  return { cleanupPending };
}

export async function deleteProductImage(imageId: number) {
  const supa = await requireAdmin();
  const { data, error } = await supa.from('product_images').delete().eq('id', imageId).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No se encontró la imagen o no tienes permiso para eliminarla');
  let cleanupPending = false;
  try { cleanupPending = (await processImageCleanupQueue()) > 0; } catch { cleanupPending = true; }
  return { cleanupPending };
}

export async function createProduct(form: FormData) {
  const supa = await supabaseServer();
  const title = String(form.get('title'));
  const price = Math.round(Number(form.get('price_mxn')) * 100);
  const initialprice = Math.round(Number(form.get('initial_price_mxn') || 0) * 100);
  const slug = String(form.get('slug') || title.toLowerCase().replace(/\s+/g,'-'));

  // RLS permite a admin insertar
  const { data, error } = await supa.from('products').insert({
    title,
    slug,
    price_cents: price,
    initialprice_cents: initialprice,
    currency: 'MXN',
    published: false,
  }).select('*').single();

  if (error) throw error;
  return data;
}
