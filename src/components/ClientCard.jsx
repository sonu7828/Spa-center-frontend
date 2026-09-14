/**
 * ClientCard — Client list item (Responsive card/list)
 *
 * Props:
 *   name        — Client name
 *   phone       — Phone number
 *   quartier    — Neighborhood
 *   lastService — Last service name
 *   onView      — View button callback
 *
 * Source: DESIGN-SYSTEM.md §17, WIREFRAME.md Screen 02
 */

import Button from './Button';

export default function ClientCard({ name, phone, quartier, lastService, status = 'ACTIVE', onView }) {
  return (
    <div className="bg-white border border-border rounded-[14px] p-3.5 sm:px-4 sm:py-3 shadow-card hover:shadow-md transition-shadow w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-charcoal leading-tight truncate">
              {name}
            </h3>
            {status === 'INACTIVE' ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F3F0EC] text-muted-gray border border-border/70 shrink-0">
                Inactive
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sage-soft text-sage border border-sage/30 shrink-0">
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-muted-gray mt-0.5 truncate">
            {phone} · Quartier: {quartier || '—'}
          </p>
          {lastService && (
            <p className="text-xs text-charcoal/80 mt-1 block sm:hidden">
              <span className="text-muted-gray text-[11px]">Last Service: </span>
              <span className="font-semibold text-charcoal">{lastService}</span>
            </p>
          )}
        </div>

        <div className="shrink-0 text-right mr-2 hidden sm:block">
          <p className="text-[10px] text-muted-gray uppercase tracking-wider">Last Service</p>
          <p className="text-[13px] font-semibold text-charcoal">{lastService || '—'}</p>
        </div>

        <Button
          variant="secondary"
          onClick={onView}
          className="w-full sm:w-auto h-9 sm:h-8 px-3.5 text-xs font-semibold shrink-0"
        >
          View Client
        </Button>
      </div>
    </div>
  );
}
