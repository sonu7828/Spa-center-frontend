import { useState, useEffect } from 'react';
import { ChevronDown, CheckCircle, AlertCircle } from 'lucide-react';
import { formatPhoneNumber, validatePhoneNumber } from '../utils/phone';

/**
 * PhoneInputField — Tailored for Cameroon (+237) with International Number Support
 * 
 * Default: Cameroon (+237) — 9 digits (starts with 6 or 2)
 * Other: Any international phone number with country code (+)
 */
export default function PhoneInputField({
  value = '',
  onChange,
  label = 'Phone / WhatsApp',
  required = false,
  error = '',
  className = '',
}) {
  // Detect if Cameroon or Other
  const isCameroon = (val) => {
    if (!val) return true;
    const clean = val.trim();
    if (clean.startsWith('+237') || clean.startsWith('237')) return true;
    if (clean.startsWith('+')) return false;
    return true;
  };

  const [mode, setMode] = useState(() => (isCameroon(value) ? '+237' : 'other'));

  useEffect(() => {
    setMode(isCameroon(value) ? '+237' : 'other');
  }, [value]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    let digits = (value || '').replace(/\D/g, '');
    if (digits.startsWith('237')) digits = digits.slice(3);

    if (newMode === '+237') {
      const formatted = formatPhoneNumber(`+237 ${digits.slice(0, 9)}`);
      onChange(formatted);
    } else {
      onChange(digits ? `+${digits}` : '+');
    }
  };

  const handleInputChange = (e) => {
    const inputVal = e.target.value;
    if (inputVal.startsWith('+237')) {
      setMode('+237');
    } else if (inputVal.startsWith('+') && !inputVal.startsWith('+237')) {
      setMode('other');
    }
    const formatted = formatPhoneNumber(inputVal);
    onChange(formatted);
  };

  const validation = validatePhoneNumber(value);
  const isComplete = validation.isValid;

  // Cameroon digit counter
  const getCameroonDigits = () => {
    const cleaned = (value || '').replace(/\D/g, '');
    const local = cleaned.startsWith('237') ? cleaned.slice(3) : cleaned;
    return local.length;
  };

  const cameroonDigits = getCameroonDigits();

  return (
    <div className={`w-full ${className}`}>
      {/* Label */}
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-[13px] font-medium text-muted-gray">
          {label} {required && <span className="text-terracotta">*</span>}
        </label>
        {mode === 'other' && (
          <button
            type="button"
            onClick={() => handleModeChange('+237')}
            className="text-[11px] font-semibold text-sage hover:underline flex items-center gap-1 cursor-pointer"
          >
            🇨🇲 Switch to Cameroon (+237)
          </button>
        )}
      </div>

      {/* Input container */}
      <div
        className={`flex items-center rounded-[11px] border bg-white overflow-hidden transition-all duration-150 ${
          error || (!isComplete && value.trim() && value.trim() !== '+237')
            ? 'border-amber-400 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-200'
            : isComplete
            ? 'border-emerald-500 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-200'
            : 'border-border focus-within:border-sage focus-within:ring-1 focus-within:ring-sage/30'
        }`}
      >
        {/* Country Selector Dropdown */}
        <div className="relative border-r border-border bg-sand/30 flex items-center">
          <select
            value={mode}
            onChange={(e) => handleModeChange(e.target.value)}
            className="appearance-none bg-transparent pl-3 pr-7 py-3 text-xs font-semibold text-charcoal outline-none cursor-pointer"
          >
            <option value="+237">🇨🇲 +237</option>
            <option value="other">🌐 Other (+)</option>
          </select>
          <ChevronDown
            size={13}
            className="absolute right-2 text-muted-gray pointer-events-none"
          />
        </div>

        {/* Text Input */}
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={
            mode === '+237'
              ? '+237 6XX XX XX XX'
              : '+ country code and phone number'
          }
          className="flex-1 h-[48px] px-3.5 bg-transparent text-sm text-charcoal placeholder:text-muted-gray/40 outline-none font-mono font-medium"
        />

        {/* Counter Badge for Cameroon */}
        {mode === '+237' && (
          <div className="pr-3 text-[11px] font-mono text-muted-gray">
            <span
              className={
                cameroonDigits === 9
                  ? 'text-emerald-600 font-bold'
                  : cameroonDigits > 9
                  ? 'text-terracotta font-bold'
                  : 'text-muted-gray'
              }
            >
              {cameroonDigits}/9
            </span>
          </div>
        )}
      </div>

      {/* Validation / Helper message */}
      <div className="mt-1 flex items-center justify-between text-xs min-h-[18px]">
        {value.trim() !== '' && value.trim() !== '+237' ? (
          validation.isValid ? (
            <span className="text-emerald-600 flex items-center gap-1 font-medium">
              <CheckCircle size={13} /> {validation.message}
            </span>
          ) : (
            <span className="text-amber-600 flex items-center gap-1 font-medium">
              <AlertCircle size={13} /> {error || validation.message}
            </span>
          )
        ) : (
          <span className="text-muted-gray/70 text-[11px]">
            {mode === '+237'
              ? 'Cameroon numbers require 9 digits (starts with 6 or 2)'
              : 'Include full international number with + and country code'
            }
          </span>
        )}
      </div>
    </div>
  );
}
