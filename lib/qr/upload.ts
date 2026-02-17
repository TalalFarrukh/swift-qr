import type { SupabaseClient } from '@supabase/supabase-js';
import { QR_IMAGES_BUCKET } from '@/lib/constants';

export async function uploadQrImageToStorage(
  supabase: SupabaseClient,
  pngBuffer: Buffer,
  userId: string,
  shortCode: string,
): Promise<string> {
  const path = `${userId}/${shortCode}.png`;

  const { error } = await supabase.storage.from(QR_IMAGES_BUCKET).upload(path, pngBuffer, {
    contentType: 'image/png',
    upsert: true,
  });

  if (error) {
    throw new Error(`Failed to upload QR image: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(QR_IMAGES_BUCKET).getPublicUrl(path);
  return publicUrl;
}
