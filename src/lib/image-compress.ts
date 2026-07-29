// lib/image-compress.ts
// Compresión de imágenes en el cliente antes de subirlas a Supabase Storage.
// Necesario porque el sitio sirve las imágenes sin optimizador de servidor
// (next.config: images.unoptimized = true), así que el archivo subido es el
// archivo que descargan los clientes.

const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.8;
const JPEG_QUALITY = 0.85;

export type PreparedImage = {
  blob: Blob;
  extension: string; // '' si el archivo original no tenía extensión
};

function getOriginalExtension(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  // Si no hay punto o el "ext" es el nombre completo, no hay extensión real
  return file.name.includes(".") ? ext : "";
}

function loadImage(
  file: File
): Promise<{ img: HTMLImageElement; objectUrl: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, objectUrl });
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo decodificar la imagen"));
    };
    img.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * Redimensiona (máx. MAX_DIMENSION px por lado) y re-codifica a WebP
 * (fallback a JPEG si el navegador no codifica WebP, p. ej. Safari viejo).
 *
 * Si el archivo no es procesable (GIF animado, SVG, HEIC no decodificable)
 * o el resultado no mejora al original, devuelve el archivo intacto.
 */
export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  const fallback: PreparedImage = {
    blob: file,
    extension: getOriginalExtension(file),
  };

  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallback;
  }

  // Intentar con cualquier imagen raster que el navegador pueda decodificar.
  // Se excluyen GIF (perdería animación) y SVG (vectorial, mejor intacto).
  const isRasterImage =
    file.type.startsWith("image/") &&
    file.type !== "image/gif" &&
    file.type !== "image/svg+xml";
  const isUnknownType = file.type === "";
  if (!isRasterImage && !isUnknownType) return fallback;

  try {
    const { img, objectUrl } = await loadImage(file);
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    if (!srcW || !srcH) {
      URL.revokeObjectURL(objectUrl);
      return fallback;
    }

    const scale = Math.min(1, MAX_DIMENSION / Math.max(srcW, srcH));
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(objectUrl);
      return fallback;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(objectUrl);

    // Preferir WebP. Ojo: algunos navegadores devuelven PNG silenciosamente
    // si no soportan codificar WebP; hay que verificar blob.type.
    const webp = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
    if (webp && webp.type === "image/webp" && webp.size < file.size) {
      return { blob: webp, extension: "webp" };
    }

    const jpeg = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
    if (jpeg && jpeg.size > 0 && jpeg.size < file.size) {
      return { blob: jpeg, extension: "jpg" };
    }

    return fallback;
  } catch {
    return fallback;
  }
}
