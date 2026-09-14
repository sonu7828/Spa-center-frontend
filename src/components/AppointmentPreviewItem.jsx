/**
 * AppointmentPreviewItem — Compact appointment row for Dashboard (Responsive)
 *
 * Props:
 *   time       — Time string (e.g. "09:00")
 *   client     — Client name
 *   service    — Service type
 *   technician — Technician name
 *   category   — "nails" | "facial" | "massage" (for soft color accent)
 *
 * Source: WIREFRAME.md Screen 01, DESIGN-SYSTEM.md §19
 */

const categoryStyles = {
  nails: 'bg-dusty-rose-soft border-dusty-rose/20',
  facial: 'bg-sage-soft border-sage/20',
  massage: 'bg-warning-soft border-warning/20',
};

export default function AppointmentPreviewItem({
  time,
  client,
  service,
  technician,
  category = 'nails',
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 p-3 sm:px-4 sm:py-3 rounded-[12px] border ${categoryStyles[category] || categoryStyles.nails}`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span className="text-xs sm:text-sm font-bold text-charcoal shrink-0 font-mono">
          {time}
        </span>
        <span className="text-xs sm:text-sm font-semibold text-charcoal truncate">
          {client}
        </span>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-muted-gray">
        <span className="truncate">{service}</span>
        <span className="shrink-0 font-medium text-charcoal/80">· {technician}</span>
      </div>
    </div>
  );
}
