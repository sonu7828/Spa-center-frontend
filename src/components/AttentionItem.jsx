/**
 * AttentionItem — Dashboard attention/alert row
 *
 * Props:
 *   label — Description text
 *   count — Numeric count
 *   type  — "warning" | "error" (for soft color styling)
 *
 * Source: WIREFRAME.md Screen 01 "ATTENTION" section
 * Source: DESIGN-SYSTEM.md §21
 */

import { TriangleAlert } from 'lucide-react';

const typeStyles = {
  warning: {
    bg: 'bg-warning-soft',
    icon: 'text-warning',
    border: 'border-warning/20',
  },
  error: {
    bg: 'bg-error-soft',
    icon: 'text-error',
    border: 'border-error/20',
  },
};

export default function AttentionItem({ label, count, type = 'warning' }) {
  const style = typeStyles[type] || typeStyles.warning;

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 rounded-[12px] border ${style.bg} ${style.border}`}
    >
      <div className="flex items-center gap-3">
        <TriangleAlert size={18} className={style.icon} />
        <span className="text-sm font-medium text-charcoal">{label}</span>
      </div>
      <span className="text-sm font-semibold text-charcoal">{count}</span>
    </div>
  );
}
