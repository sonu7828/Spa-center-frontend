/**
 * Input — Form input with visible label
 *
 * Props:
 *   label       — Visible label text (mandatory per DESIGN-SYSTEM.md §15)
 *   type        — Input type
 *   value       — Controlled value
 *   onChange     — Change handler
 *   placeholder — Optional placeholder
 *
 * Source: DESIGN-SYSTEM.md §15
 */

export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  className = '',
  ...props
}) {
  return (
    <div className={className}>
      <label className="block text-[13px] font-medium text-muted-gray mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full h-[48px] px-4 bg-white border border-border rounded-[11px] text-sm text-charcoal placeholder:text-muted-gray/50 outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors duration-150"
        {...props}
      />
    </div>
  );
}
