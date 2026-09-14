/**
 * PageHeader — Minimal responsive page header
 *
 * Props:
 *   title     — Page title (28px, weight 600)
 *   subtitle  — Optional muted description
 *   action    — Optional right-side React element (button, etc.)
 *
 * Source: DESIGN-SYSTEM.md §11
 */

export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl sm:text-[28px] font-semibold sm:leading-[36px] text-charcoal">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-muted-gray mt-0.5 sm:mt-1 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="shrink-0 w-full sm:w-auto flex flex-wrap items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
}
