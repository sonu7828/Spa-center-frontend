/**
 * Tabs — Responsive tab switcher with local horizontal scroll
 *
 * Props:
 *   tabs       — Array of { key, label }
 *   activeTab  — Currently active tab key
 *   onChange   — Callback with tab key
 *
 * Source: DESIGN-SYSTEM.md §10 (active sage style)
 */

export default function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="flex gap-1 border-b border-border overflow-x-auto pb-0.5 scrollbar-thin">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`px-3 sm:px-4 h-[44px] text-xs sm:text-sm font-medium rounded-t-[10px] transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0
            ${
              activeTab === key
                ? 'bg-sage-soft text-charcoal font-semibold border-b-2 border-sage'
                : 'text-muted-gray hover:text-charcoal hover:bg-sage-soft/30'
            }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
