import { createServiceRoleSupabaseClient } from '@/lib/supabase/server';
import { SHORT_CODE_CHARS, SHORT_CODE_LENGTH } from '@/lib/constants';

export function generateShortCode(): string {
  let result = '';
  const chars = SHORT_CODE_CHARS;
  for (let i = 0; i < SHORT_CODE_LENGTH; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const MAX_SHORT_CODE_ATTEMPTS = 10;

export async function generateUniqueShortCode(): Promise<string> {
  const supabase = createServiceRoleSupabaseClient();
  for (let i = 0; i < MAX_SHORT_CODE_ATTEMPTS; i++) {
    const code = generateShortCode();
    const { data } = await supabase
      .from('qr_codes')
      .select('short_code')
      .eq('short_code', code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error('Could not generate unique short code');
}
