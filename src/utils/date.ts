export function getLocalDateString(d: Date = new Date()): string {
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60 * 1000).toISOString().split('T')[0];
}

export function getLocalMonthString(d: Date = new Date()): string {
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60 * 1000).toISOString().slice(0, 7);
}
