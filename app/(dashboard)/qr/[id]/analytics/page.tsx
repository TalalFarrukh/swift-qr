import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

interface QRAnalyticsPageProps {
  params: Promise<{ id: string }>;
}

interface TimelinePoint {
  date: string;
  totalScans: number;
  uniqueVisitors: number;
}

interface DevicesResponse {
  device: Record<string, number>;
  os: Record<string, number>;
  browser: Record<string, number>;
}

interface LocationsResponse {
  topCountries: { country: string; count: number }[];
  topCities: { city: string; count: number }[];
}

export default async function QRAnalyticsPage(props: QRAnalyticsPageProps) {
  const params = await props.params;
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const supabase = await createServerSupabaseClient();

  const { data: qrCode, error } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .eq('is_dynamic', true)
    .single();

  if (error || !qrCode) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  // Fetch aggregates directly from database
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 30);
  const fromStr = from.toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);

  const [{ data: aggregates }, { data: todayScans }] = await Promise.all([
    supabase
      .from('scans_aggregated')
      .select('date, total_scans, unique_ips, top_countries, top_cities, device_breakdown, os_breakdown, browser_breakdown')
      .eq('qr_code_id', qrCode.id)
      .gte('date', fromStr)
      .order('date', { ascending: true }),
    // Also fetch today's raw scans for real-time data
    supabase
      .from('scans')
      .select('scanned_at, country, city, device_type, os, browser, ip_address')
      .eq('qr_code_id', qrCode.id)
      .gte('scanned_at', `${todayStr}T00:00:00Z`)
      .order('scanned_at', { ascending: false }),
  ]);

  // Process timeline data - include today's raw scans
  const timeline: TimelinePoint[] = (aggregates ?? []).map((row) => ({
    date: row.date,
    totalScans: row.total_scans ?? 0,
    uniqueVisitors: row.unique_ips ?? 0,
  }));

  // Add today's data if we have raw scans
  if (todayScans && todayScans.length > 0) {
    const todayData = timeline.find((t) => t.date === todayStr);
    const uniqueIPs = new Set(todayScans.map((s) => s.ip_address).filter(Boolean));
    if (todayData) {
      // Update existing today entry with raw scan count
      todayData.totalScans = todayScans.length;
      todayData.uniqueVisitors = uniqueIPs.size;
    } else {
      // Add today if not in aggregates yet
      timeline.push({
        date: todayStr,
        totalScans: todayScans.length,
        uniqueVisitors: uniqueIPs.size,
      });
    }
  }

  // Process locations data - include today's raw scans
  const countryTotals: Record<string, number> = {};
  const cityTotals: Record<string, number> = {};
  for (const row of aggregates ?? []) {
    for (const entry of (row.top_countries as { country: string; count: number }[] | null) ?? []) {
      countryTotals[entry.country] = (countryTotals[entry.country] ?? 0) + entry.count;
    }
    for (const entry of (row.top_cities as { city: string; count: number }[] | null) ?? []) {
      cityTotals[entry.city] = (cityTotals[entry.city] ?? 0) + entry.count;
    }
  }
  // Add today's raw scan data
  for (const scan of todayScans ?? []) {
    if (scan.country) {
      countryTotals[scan.country as string] = (countryTotals[scan.country as string] ?? 0) + 1;
    }
    if (scan.city) {
      cityTotals[scan.city as string] = (cityTotals[scan.city as string] ?? 0) + 1;
    }
  }
  const locationsJson: LocationsResponse = {
    topCountries: Object.entries(countryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count })),
    topCities: Object.entries(cityTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([city, count]) => ({ city, count })),
  };

  // Process devices data - include today's raw scans
  const deviceTotals: Record<string, number> = {};
  const osTotals: Record<string, number> = {};
  const browserTotals: Record<string, number> = {};
  for (const row of aggregates ?? []) {
    const device = (row.device_breakdown as Record<string, number> | null) ?? {};
    for (const [key, value] of Object.entries(device)) {
      deviceTotals[key] = (deviceTotals[key] ?? 0) + (value ?? 0);
    }
    const os = (row.os_breakdown as Record<string, number> | null) ?? {};
    for (const [key, value] of Object.entries(os)) {
      osTotals[key] = (osTotals[key] ?? 0) + (value ?? 0);
    }
    const browser = (row.browser_breakdown as Record<string, number> | null) ?? {};
    for (const [key, value] of Object.entries(browser)) {
      browserTotals[key] = (browserTotals[key] ?? 0) + (value ?? 0);
    }
  }
  // Add today's raw scan data
  for (const scan of todayScans ?? []) {
    if (scan.device_type) {
      deviceTotals[scan.device_type as string] = (deviceTotals[scan.device_type as string] ?? 0) + 1;
    }
    if (scan.os) {
      osTotals[scan.os as string] = (osTotals[scan.os as string] ?? 0) + 1;
    }
    if (scan.browser) {
      browserTotals[scan.browser as string] = (browserTotals[scan.browser as string] ?? 0) + 1;
    }
  }
  const devicesJson: DevicesResponse = {
    device: deviceTotals,
    os: osTotals,
    browser: browserTotals,
  };
  const maxDailyScans = timeline.reduce((max, p) => (p.totalScans > max ? p.totalScans : max), 0) || 1;

  const totalScans = qrCode.scan_count ?? 0;
  const lastScannedAt = qrCode.last_scanned_at
    ? new Date(qrCode.last_scanned_at).toLocaleString()
    : 'Never';

  const renderBreakdownList = (items: Record<string, number>) => {
    const entries = Object.entries(items).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      return <p className="text-sm text-muted-foreground">No data yet.</p>;
    }
    return (
      <ul className="space-y-1 text-sm">
        {entries.map(([key, value]) => (
          <li key={key} className="flex items-center justify-between">
            <span className="truncate pr-2">{key || 'Unknown'}</span>
            <span className="font-medium">{value}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Analytics for {qrCode.name}</h2>
          <p className="text-sm text-muted-foreground">
            Short link:{' '}
            <span className="font-mono">
              {baseUrl}/r/{qrCode.short_code}
            </span>
          </p>
        </div>
        <Link
          href={`/qr/${qrCode.id}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Back to details
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Total scans</p>
          <p className="mt-1 text-2xl font-semibold">{totalScans}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Last scanned</p>
          <p className="mt-1 text-sm">{lastScannedAt}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Days with scans</p>
          <p className="mt-1 text-2xl font-semibold">{timeline.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Export</p>
          <Link
            href={`/api/analytics/${qrCode.id}/export`}
            className="mt-1 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Download CSV
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Scans over time</p>
          </div>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scans yet.</p>
          ) : (
            <div className="space-y-2">
              {timeline.map((point) => (
                <div key={point.date} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{point.date}</span>
                    <span>{point.totalScans} scans</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${(point.totalScans / maxDailyScans) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Top locations</p>
          {locationsJson.topCountries.length === 0 && locationsJson.topCities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No location data yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Countries</p>
                <ul className="space-y-1 text-sm">
                  {locationsJson.topCountries.map((c) => (
                    <li key={c.country} className="flex items-center justify-between">
                      <span className="truncate pr-2">{c.country || 'Unknown'}</span>
                      <span className="font-medium">{c.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Cities</p>
                <ul className="space-y-1 text-sm">
                  {locationsJson.topCities.map((c) => (
                    <li key={c.city} className="flex items-center justify-between">
                      <span className="truncate pr-2">{c.city || 'Unknown'}</span>
                      <span className="font-medium">{c.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Devices</p>
          {renderBreakdownList(devicesJson.device)}
        </div>
        <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Operating systems</p>
          {renderBreakdownList(devicesJson.os)}
        </div>
        <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Browsers</p>
          {renderBreakdownList(devicesJson.browser)}
        </div>
      </div>
    </div>
  );
}

