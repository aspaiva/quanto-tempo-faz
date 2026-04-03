import { DateEvent } from "./events";

export function generateICS(event: DateEvent, recurrence: "once" | "yearly" = "once"): string {
  const d = new Date(event.date);
  const dateStr = d.toISOString().replace(/[-:]/g, "").split("T")[0];
  const now = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Quanto Tempo Faz//PT",
    "BEGIN:VEVENT",
    `DTSTART;VALUE=DATE:${dateStr}`,
    `DTEND;VALUE=DATE:${dateStr}`,
    `SUMMARY:${event.label}`,
    `DESCRIPTION:${event.category}`,
    `DTSTAMP:${now}`,
    `UID:${event.id}@quantotempofaz`,
  ];

  if (recurrence === "yearly") {
    lines.push("RRULE:FREQ=YEARLY");
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadICS(event: DateEvent) {
  const ics = generateICS(event);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.label.replace(/[^a-zA-Z0-9À-ú ]/g, "").trim()}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
