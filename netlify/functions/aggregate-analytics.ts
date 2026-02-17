import type { Handler } from '@netlify/functions';

export const handler: Handler = async () => {
  const siteUrl = process.env.SITE_URL || process.env.URL || 'https://your-site.netlify.app';
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'CRON_SECRET not configured' }),
    };
  }

  try {
    const response = await fetch(`${siteUrl}/api/cron/aggregate-analytics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json().catch(() => ({ ok: false }));

    return {
      statusCode: response.ok ? 200 : 500,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Aggregate analytics cron error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to run aggregation', message: error instanceof Error ? error.message : 'Unknown error' }),
    };
  }
};
