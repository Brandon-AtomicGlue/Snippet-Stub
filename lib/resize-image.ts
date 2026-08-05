import { MAX_IMAGE_DIMENSION } from "@/lib/image-limits";

export interface ResizedImage {
  dataUrl: string;
  width: number;
  height: number;
}

const JPEG_QUALITY = 0.85;

export async function resizeImageFile(file: File): Promise<ResizedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read image");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const dataUrl = canvas.toDataURL(outputType, JPEG_QUALITY);

  return { dataUrl, width, height };
}
