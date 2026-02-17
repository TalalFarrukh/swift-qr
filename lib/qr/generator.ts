import QRCode from 'qrcode';
import sharp from 'sharp';

interface GenerateStaticQrOptions {
  text: string;
  fgColor?: string;
  bgColor?: string;
}

export async function generateStaticQrPng({
  text,
  fgColor = '#000000',
  bgColor = '#ffffff',
}: GenerateStaticQrOptions): Promise<Buffer> {
  const buffer = await QRCode.toBuffer(text, {
    type: 'png',
    errorCorrectionLevel: 'M',
    color: {
      dark: fgColor,
      light: bgColor,
    },
    margin: 2,
    scale: 8,
  });

  return buffer;
}

interface DynamicQrOptions {
  fgColor?: string;
  bgColor?: string;
  logoUrl?: string;
  style?: 'classic' | 'rounded' | 'dots';
}

export async function generateDynamicQrPng(redirectUrl: string, options?: DynamicQrOptions): Promise<Buffer> {
  const basePng = await generateStaticQrPng({
    text: redirectUrl,
    fgColor: options?.fgColor ?? '#000000',
    bgColor: options?.bgColor ?? '#ffffff',
  });

  // If no logo is provided, return the base QR image as-is.
  if (!options?.logoUrl) {
    return basePng;
  }

  try {
    const response = await fetch(options.logoUrl);
    if (!response.ok) {
      return basePng;
    }

    const arrayBuffer = await response.arrayBuffer();
    const logoBuffer = Buffer.from(arrayBuffer);

    const qrImage = sharp(basePng);
    const metadata = await qrImage.metadata();
    const size = Math.min(metadata.width ?? 256, metadata.height ?? 256);
    const logoSize = Math.floor(size * 0.25); // logo covers ~25% of QR width/height

    const resizedLogo = await sharp(logoBuffer)
      .resize(logoSize, logoSize, { fit: 'inside' })
      .png()
      .toBuffer();

    const composited = await qrImage
      .composite([
        {
          input: resizedLogo,
          gravity: 'center',
        },
      ])
      .png()
      .toBuffer();

    return composited;
  } catch {
    // If anything goes wrong with logo fetching/compositing, fall back to base QR.
    return basePng;
  }
}

