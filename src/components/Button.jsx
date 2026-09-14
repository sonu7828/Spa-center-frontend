/**
 * Button — Reusable button component
 *
 * Variants:
 *   primary   — Muted Sage bg, Deep Charcoal text
 *   secondary — White bg, soft border, Deep Charcoal text
 *   warning   — Soft terracotta for destructive/warning actions
 *
 * Source: DESIGN-SYSTEM.md §14
 */

export default function Button({
  children,
  variant = 'primary',
  onClick,
  className = '',
  type = 'button',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold text-sm rounded-[11px] h-[46px] px-5 transition-all duration-150 cursor-pointer select-none disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-[#E5ECE5] disabled:text-[#8C9B8D] disabled:border-[#D4DDD4]';

  const variants = {
    primary:
      'bg-sage text-charcoal hover:bg-sage-hover active:bg-sage-hover',
    secondary:
      'bg-white text-charcoal border border-border hover:bg-soft-cream active:bg-soft-cream',
    warning:
      'bg-error-soft text-error border border-error/20 hover:bg-error/10 active:bg-error/15',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${base} ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
