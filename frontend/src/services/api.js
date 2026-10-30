const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE_URL}/api/health`);
  if (!res.ok) throw new Error('Failed to fetch system health');
  return res.json();
}

export async function fetchDateBounds() {
  const res = await fetch(`${API_BASE_URL}/api/dates`);
  if (!res.ok) throw new Error('Failed to fetch date boundaries');
  return res.json();
}

export async function fetchSummary({ dateFrom, dateTo, cutoffMode, customTime, alignmentMode }) {
  const params = new URLSearchParams({
    dateFrom: dateFrom || '2026-01-01',
    dateTo: dateTo || '2026-01-31',
    cutoffMode: cutoffMode || 'd_minus_1_1200',
    customTime: customTime || '12:00',
    alignmentMode: alignmentMode || 'block_hourly',
  });
  const res = await fetch(`${API_BASE_URL}/api/summary?${params}`);
  if (!res.ok) throw new Error('Failed to fetch executive summary');
  return res.json();
}

export async function fetchComparison({ dateFrom, dateTo, cutoffMode, customTime, alignmentMode }) {
  const params = new URLSearchParams({
    dateFrom: dateFrom || '2026-01-01',
    dateTo: dateTo || '2026-01-31',
    cutoffMode: cutoffMode || 'd_minus_1_1200',
    customTime: customTime || '12:00',
    alignmentMode: alignmentMode || 'block_hourly',
  });
  const res = await fetch(`${API_BASE_URL}/api/comparison?${params}`);
  if (!res.ok) throw new Error('Failed to fetch generation comparison');
  return res.json();
}

export async function fetchDailyAccuracy({ dateFrom, dateTo, cutoffMode, customTime, alignmentMode }) {
  const params = new URLSearchParams({
    dateFrom: dateFrom || '2026-01-01',
    dateTo: dateTo || '2026-01-31',
    cutoffMode: cutoffMode || 'd_minus_1_1200',
    customTime: customTime || '12:00',
    alignmentMode: alignmentMode || 'block_hourly',
  });
  const res = await fetch(`${API_BASE_URL}/api/daily-accuracy?${params}`);
  if (!res.ok) throw new Error('Failed to fetch daily accuracy');
  return res.json();
}

export async function fetchIntradayProfile({ dateFrom, dateTo, cutoffMode, customTime, alignmentMode }) {
  const params = new URLSearchParams({
    dateFrom: dateFrom || '2026-01-01',
    dateTo: dateTo || '2026-01-31',
    cutoffMode: cutoffMode || 'd_minus_1_1200',
    customTime: customTime || '12:00',
    alignmentMode: alignmentMode || 'block_hourly',
  });
  const res = await fetch(`${API_BASE_URL}/api/intraday-profile?${params}`);
  if (!res.ok) throw new Error('Failed to fetch intraday profile');
  return res.json();
}

export async function fetchForecastEvolution({ targetStartTime, cutoffMode, customTime }) {
  const params = new URLSearchParams({
    targetStartTime,
    cutoffMode: cutoffMode || 'd_minus_1_1200',
    customTime: customTime || '12:00',
  });
  const res = await fetch(`${API_BASE_URL}/api/forecast-evolution?${params}`);
  if (!res.ok) throw new Error('Failed to fetch forecast evolution');
  return res.json();
}
