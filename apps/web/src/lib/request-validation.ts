export interface ChatPayload {
  question: string;
  top_k?: number;
}

export function parseChatPayload(body: string): ChatPayload {
  if (body.length > 24_000) throw new Error('Request is too large.');
  let value: unknown;
  try { value = JSON.parse(body); } catch { throw new Error('Expected valid JSON.'); }
  if (!value || typeof value !== 'object' || !('question' in value)) {
    throw new Error('A question is required.');
  }
  const { question } = value;
  if (typeof question !== 'string' || !question.trim() || question.length > 4000) {
    throw new Error('Question must contain between 1 and 4000 characters.');
  }
  const topK = 'top_k' in value ? value.top_k : undefined;
  if (topK !== undefined && (typeof topK !== 'number' || !Number.isInteger(topK) || topK < 1 || topK > 20)) {
    throw new Error('top_k must be an integer between 1 and 20.');
  }
  return { question: question.trim(), ...(topK === undefined ? {} : { top_k: topK }) };
}

export function validateDashboardDates(search: URLSearchParams): void {
  for (const name of ['from', 'to']) {
    const value = search.get(name);
    if (value === null) continue;
    const date = new Date(`${value}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new Error(`${name} must be a valid YYYY-MM-DD date.`);
    }
  }
  const to = search.get('to') || new Date().toISOString().slice(0, 10);
  const from = search.get('from');
  if (from && (from > to || (Date.parse(to) - Date.parse(from)) / 86_400_000 > 90)) {
    throw new Error('Choose an ordered date range of at most 90 days.');
  }
  const granularity = search.get('granularity');
  if (granularity && !['day', 'shift', 'line'].includes(granularity)) {
    throw new Error('Unsupported dashboard granularity.');
  }
}
