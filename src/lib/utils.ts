import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(s: string) {
  return s
    .normalize('NFD')                 // elimina acentos
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')      // reemplaza todo lo que no sea alfanumérico por guiones
    .replace(/(^-|-$)+/g, '')         // elimina guiones al inicio/final
}

/**
 * Convierte una public URL de Supabase Storage a su "path" interno
 * p. ej.:
 *  https://<proj>.supabase.co/storage/v1/object/public/product-images/123/uuid.jpg
 *   -> "123/uuid.jpg"
 */
export function storagePathFromPublicUrl(url: string) {
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/object/public/')
    if (parts.length < 2) return ''
    const after = parts[1] // "product-images/123/uuid.jpg"
    const [, ...rest] = after.split('/') // descarta el bucket id ("product-images")
    return rest.join('/')
  } catch {
    // fallback por si no es una URL válida
    const m = url.match(/\/object\/public\/product-images\/(.+)$/)
    return m?.[1] ?? ''
  }
}