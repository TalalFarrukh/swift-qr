export type QRCodeType = 'url' | 'vcard' | 'text' | 'wifi' | 'email' | 'sms' | 'phone';

export type QRStyle = 'classic' | 'rounded' | 'dots';

export interface QRCustomization {
  fgColor?: string;
  bgColor?: string;
  logoUrl?: string;
  style?: QRStyle;
}

export interface QRCode {
  id: string;
  user_id: string;
  name: string;
  short_code: string;
  type: string;
  is_dynamic: boolean;
  // Core destination
  destination_url: string | null;
  qr_image_url: string;
  customization: QRCustomization;
  // Campaign fields (used by marketing campaigns)
  campaign_type?: 'one-shot' | 'fidelity' | 'membership' | null;
  scan_limit?: number | null;
  scan_count: number;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_scanned_at: string | null;
}

// Subset of fields needed for list/card views
export type QRCodeSummary = Pick<
  QRCode,
  | 'id'
  | 'name'
  | 'short_code'
  | 'type'
  | 'destination_url'
  | 'qr_image_url'
  | 'scan_count'
  | 'is_active'
  | 'created_at'
  | 'last_scanned_at'
  | 'campaign_type'
  | 'scan_limit'
  | 'valid_from'
  | 'valid_until'
>;
