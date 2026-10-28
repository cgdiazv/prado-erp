export const SUPPORT_TIMEZONE = 'America/Chicago';
export const SUPPORT_START_HOUR = 9; // 9:00 AM CST/CDT
export const SUPPORT_END_HOUR = 18; // 6:00 PM CST/CDT

const WORKDAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

/**
 * Checks whether the given date falls within Prado Support live hours:
 * Monday to Friday, 9:00 AM to 6:00 PM CST (America/Chicago).
 */
export function isWithinSupportBusinessHours(date: Date = new Date()): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: SUPPORT_TIMEZONE,
      weekday: 'short',
      hour: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const weekday = parts.find((part) => part.type === 'weekday')?.value ?? '';
    const rawHour = parts.find((part) => part.type === 'hour')?.value ?? '';
    const hour = Number(rawHour) % 24;

    if (!WORKDAYS.has(weekday) || Number.isNaN(hour)) {
      return false;
    }

    return hour >= SUPPORT_START_HOUR && hour < SUPPORT_END_HOUR;
  } catch {
    return false;
  }
}

export function getSupportAutoReplyMessage(locale = 'en'): string {
  const isEs = locale.toLowerCase().startsWith('es');
  if (isEs) {
    return '¡Gracias por escribirnos! Nuestro horario de chat de soporte es de lunes a viernes de 9:00 AM a 6:00 PM CST. Hemos recibido tu mensaje y te responderemos tan pronto como lo veamos.';
  }
  return "Thanks for reaching out! Our support chat hours are Monday to Friday from 9:00 AM to 6:00 PM CST. We've received your message and will get back to you as soon as we see it.";
}

