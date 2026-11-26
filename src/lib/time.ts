// Hamai vaqt va sana bo mintaqai vaqti Tojikiston
export const TZ = "Asia/Dushanbe";

export function formatDushanbe(d: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
