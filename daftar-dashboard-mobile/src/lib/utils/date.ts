export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function extractTimeParts(value: string): {
  hours: number;
  minutes: number;
  seconds: number;
} {
  if (value.includes('T')) {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return {
        hours: parsed.getHours(),
        minutes: parsed.getMinutes(),
        seconds: parsed.getSeconds(),
      };
    }
  }

  const [timePart = '00:00:00'] = value.split(' ');
  const [hours = '0', minutes = '0', seconds = '0'] = timePart.split(':');

  return {
    hours: Number(hours) || 0,
    minutes: Number(minutes) || 0,
    seconds: Number(seconds) || 0,
  };
}

export function combineLocalDateAndTimeToIso(
  bookingDate: string,
  startTime: string,
): string {
  const [year, month, day] = bookingDate.split('-').map(Number);
  const { hours, minutes, seconds } = extractTimeParts(startTime);

  const combined = new Date(
    year,
    (month || 1) - 1,
    day || 1,
    hours,
    minutes,
    seconds,
    0,
  );

  return combined.toISOString();
}
