function parseBackendTimestamp(value) {
  if (typeof value !== 'string') return new Date(value);

  const trimmed = value.trim();
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  if (hasTimezone) return new Date(trimmed);

  return new Date(`${trimmed.replace(' ', 'T')}Z`);
}

export function formatSingaporeDateTime(value) {
  return new Intl.DateTimeFormat('en-SG', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).format(parseBackendTimestamp(value));
}
