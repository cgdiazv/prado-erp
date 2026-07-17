function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toICSDate(dateStr: string) {
  // dateStr is YYYY-MM-DD
  return dateStr.replace(/-/g, '');
}

function nextDay(dateStr: string) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function dtstamp() {
  const now = new Date();
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
}

export interface ICSJobData {
  id: string;
  scheduled_date: string;
  job_type: string;
  cost_amount?: number | string | null;
  street_address?: string | null;
  truck_name?: string | null;
}

export function generateICS(job: ICSJobData): string {
  const address = job.street_address || '';
  const cost = Number(job.cost_amount || 0).toFixed(2);
  const truckLine = job.truck_name ? `\\nTruck: ${job.truck_name}` : '';
  const summary = [job.job_type, address].filter(Boolean).join(' — ');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Prado ERP//Job Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${job.id}@prado-erp`,
    `DTSTAMP:${dtstamp()}`,
    `DTSTART;VALUE=DATE:${toICSDate(job.scheduled_date)}`,
    `DTEND;VALUE=DATE:${nextDay(job.scheduled_date)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:Job Type: ${job.job_type}\\nAddress: ${address}\\nCost: $${cost}${truckLine}`,
    address ? `LOCATION:${address}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter((l) => l !== '');

  return lines.join('\r\n');
}

export function downloadICS(job: ICSJobData) {
  const content = generateICS(job);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `job-${job.scheduled_date}-${job.id.slice(0, 8)}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
