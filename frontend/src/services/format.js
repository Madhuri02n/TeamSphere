// Small helpers that make dates, times and durations easy to read.

// "2026-10-18" -> "18 Oct 2026"
export function formatDate(date) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// "18:00" -> "6:00 PM"
export function formatTime(time) {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

// 115 -> "1h 55m"
export function formatDuration(minutes) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
