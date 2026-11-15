const requests = new Map<string, number[]>();
let lastCleanup = 0;

export function allowRequest(ip: string, now = Date.now()): boolean {
  const cutoff = now - 60_000;
  if (now - lastCleanup >= 60_000) {
    for (const [key, times] of requests) {
      if (times[times.length - 1] <= cutoff) requests.delete(key);
    }
    lastCleanup = now;
  }
  const recent = (requests.get(ip) ?? []).filter(time => time > cutoff);
  if (recent.length >= 10) return false;
  requests.set(ip, [...recent, now]);
  return true;
}
