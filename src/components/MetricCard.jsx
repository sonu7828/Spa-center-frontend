/**
 * MetricCard — Dashboard metric display (Responsive)
 *
 * Props:
 *   label — Small muted label text
 *   value — Large metric value (26px, weight 600)
 *   icon  — Optional Lucide icon component
 *
 * Source: DESIGN-SYSTEM.md §13
 */

export default function MetricCard({ label, value, icon: Icon }) {
  return (
    <div className="bg-white border border-border rounded-[16px] p-3.5 sm:p-5 shadow-card min-w-0 w-full">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs font-medium text-muted-gray uppercase tracking-wide truncate">
            {label}
          </p>
          <p className="text-xl sm:text-[26px] font-semibold text-charcoal mt-0.5 sm:mt-1 truncate">
            {value}
          </p>
        </div>
        {Icon && (
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-[12px] bg-sage-soft flex items-center justify-center shrink-0">
            <Icon size={18} className="text-sage" />
          </div>
        )}
      </div>
    </div>
  );
}
