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
  destination_url: string | null;
  qr_image_url: string;
  customization: QRCustomization;
  scan_count: number;
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
>;
