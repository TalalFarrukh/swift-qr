import path from 'path';
import { NextRequest } from 'next/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/server';

export async function trackScan(shortCode: string, qrCodeId: string, request: NextRequest): Promise<void> {
  try {
    const headers = await request.headers;
  const userAgent = headers.get('user-agent') ?? undefined;
  const referrer = headers.get('referer') ?? undefined;
  const forwarded = headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : headers.get('x-real-ip') ?? undefined;

  let deviceType: string | undefined;
  let os: string | undefined;
  let browser: string | undefined;
  if (userAgent) {
    try {
      // Import ua-parser-js - handle different module formats
      const uaParserModule = await import('ua-parser-js');
      let UAParser: any;
      
      // Try different ways to get the constructor
      if (uaParserModule.default) {
        UAParser = uaParserModule.default;
      } else if (uaParserModule.UAParser) {
        UAParser = uaParserModule.UAParser;
      } else {
        UAParser = uaParserModule;
      }
      
      // Handle if it's wrapped in another default
      if (UAParser.default) {
        UAParser = UAParser.default;
      }
      
      const parser = new UAParser(userAgent);
      const device = parser.getDevice();
      const osResult = parser.getOS();
      const browserResult = parser.getBrowser();
      deviceType = device.type ?? (device.vendor ? 'mobile' : 'desktop');
      os = osResult.name && osResult.version ? `${osResult.name} ${osResult.version}` : osResult.name;
      browser = browserResult.name && browserResult.version ? `${browserResult.name} ${browserResult.version}` : browserResult.name;
    } catch {
      // Fallback: try to extract basic info from user agent string
      if (userAgent.toLowerCase().includes('mobile') || userAgent.toLowerCase().includes('android') || userAgent.toLowerCase().includes('iphone')) {
        deviceType = 'mobile';
      } else {
        deviceType = 'desktop';
      }
      if (userAgent.includes('Chrome')) browser = 'Chrome';
      if (userAgent.includes('Android')) os = 'Android';
      if (userAgent.includes('iPhone')) os = 'iOS';
    }
  }

  let country: string | undefined;
  let countryCode: string | undefined;
  let city: string | undefined;
  if (ip) {
    try {
      // Skip geo lookup for localhost/private IPs
      const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.');
      if (!isLocalhost) {
        // Point geoip-lite at the project's data folder (Next.js may resolve __dirname elsewhere)
        const geoDataDir = path.join(process.cwd(), 'node_modules', 'geoip-lite', 'data');
        if (!process.env.GEODATADIR) {
          process.env.GEODATADIR = geoDataDir;
        }
        const geo = require('geoip-lite');
        const lookup = geo.lookup(ip);
        if (lookup) {
          country = lookup.country;
          countryCode = lookup.country;
          city = lookup.city;
        }
      }
    } catch {
      // Geo lookup failed. Skip silently; country/city stay null.
    }
  }

    const supabase = createServiceRoleSupabaseClient();
    const now = new Date().toISOString();

    const scanData = {
      qr_code_id: qrCodeId,
      short_code: shortCode,
      ip_address: ip ?? null,
      country: country ?? null,
      country_code: countryCode ?? null,
      city: city ?? null,
      user_agent: userAgent ?? null,
      device_type: deviceType ?? null,
      os: os ?? null,
      browser: browser ?? null,
      referrer: referrer ?? null,
    };

    const { error: insertError } = await supabase.from('scans').insert(scanData);

    if (insertError) {
      throw insertError;
    }

    // Update scan count and last_scanned_at
    const { error: rpcError } = await supabase.rpc('increment_scan_count', { p_short_code: shortCode });
    
    if (rpcError) {
      const { data: current } = await supabase
        .from('qr_codes')
        .select('scan_count')
        .eq('short_code', shortCode)
        .single();

      if (current) {
        await supabase
          .from('qr_codes')
          .update({
            scan_count: (current.scan_count ?? 0) + 1,
            last_scanned_at: now,
          })
          .eq('short_code', shortCode);
      }
    }

    await supabase
      .from('qr_codes')
      .update({ last_scanned_at: now })
      .eq('short_code', shortCode);
  } catch (error) {
    throw error;
  }
}
