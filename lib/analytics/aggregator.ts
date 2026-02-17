import { createServiceRoleSupabaseClient } from '@/lib/supabase/server';

interface AggregateOptions {
  date?: string; // 'YYYY-MM-DD'; defaults to yesterday in UTC
}

export async function aggregateScansForDate(options: AggregateOptions = {}): Promise<void> {
  const supabase = createServiceRoleSupabaseClient();

  const targetDate = options.date
    ? new Date(options.date)
    : (() => {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - 1);
        d.setUTCHours(0, 0, 0, 0);
        return d;
      })();

  const from = new Date(targetDate);
  const to = new Date(targetDate);
  to.setUTCDate(to.getUTCDate() + 1);

  // Fetch all scans for that day.
  const { data: scans, error } = await supabase
    .from('scans')
    .select(
      'qr_code_id, scanned_at, country, city, device_type, os, browser, ip_address',
    )
    .gte('scanned_at', from.toISOString())
    .lt('scanned_at', to.toISOString());

  if (error || !scans || scans.length === 0) {
    return;
  }

  const byQr: Record<
    string,
    {
      totalScans: number;
      ips: Set<string>;
      countries: Record<string, number>;
      cities: Record<string, number>;
      device: Record<string, number>;
      os: Record<string, number>;
      browser: Record<string, number>;
      hourly: Record<string, number>;
    }
  > = {};

  for (const scan of scans) {
    const qrId = scan.qr_code_id as string;
    if (!byQr[qrId]) {
      byQr[qrId] = {
        totalScans: 0,
        ips: new Set(),
        countries: {},
        cities: {},
        device: {},
        os: {},
        browser: {},
        hourly: {},
      };
    }

    const agg = byQr[qrId];
    agg.totalScans += 1;

    if (scan.ip_address) {
      agg.ips.add(scan.ip_address as string);
    }

    if (scan.country) {
      const key = scan.country as string;
      agg.countries[key] = (agg.countries[key] ?? 0) + 1;
    }

    if (scan.city) {
      const key = scan.city as string;
      agg.cities[key] = (agg.cities[key] ?? 0) + 1;
    }

    if (scan.device_type) {
      const key = scan.device_type as string;
      agg.device[key] = (agg.device[key] ?? 0) + 1;
    }

    if (scan.os) {
      const key = scan.os as string;
      agg.os[key] = (agg.os[key] ?? 0) + 1;
    }

    if (scan.browser) {
      const key = scan.browser as string;
      agg.browser[key] = (agg.browser[key] ?? 0) + 1;
    }

    if (scan.scanned_at) {
      const scannedAt = new Date(scan.scanned_at as string);
      const hour = scannedAt.getUTCHours().toString();
      agg.hourly[hour] = (agg.hourly[hour] ?? 0) + 1;
    }
  }

  const dateStr = targetDate.toISOString().slice(0, 10); // YYYY-MM-DD

  const upserts = Object.entries(byQr).map(([qrCodeId, agg]) => {
    const topCountries = Object.entries(agg.countries)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }));

    const topCities = Object.entries(agg.cities)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([city, count]) => ({ city, count }));

    return {
      qr_code_id: qrCodeId,
      date: dateStr,
      total_scans: agg.totalScans,
      unique_ips: agg.ips.size,
      top_countries: topCountries,
      top_cities: topCities,
      device_breakdown: agg.device,
      os_breakdown: agg.os,
      browser_breakdown: agg.browser,
      hourly_distribution: agg.hourly,
    };
  });

  if (upserts.length === 0) return;

  await supabase.from('scans_aggregated').upsert(upserts, {
    onConflict: 'qr_code_id,date',
  });
}

