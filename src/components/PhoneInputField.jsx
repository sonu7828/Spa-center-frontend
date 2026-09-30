import { useState, useEffect } from 'react';
import { ChevronDown, CheckCircle, AlertCircle, Phone } from 'lucide-react';
import { formatPhoneNumber, validatePhoneNumber } from '../utils/phone';

/**
 * PhoneInputField — Premium phone number input with instant Country Code selection
 * Supports:
 *  - 🇨🇲 Cameroon (+237) — 9 digits (mobile 6XX, landline 2XX)
 *  - 🇮🇳 India (+91) — 10 digits
 *  - 🌐 Other / International
 */
export default function PhoneInputField({
  value = '',
  onChange,
  label = 'Phone / WhatsApp',
  required = false,
  error = '',
  className = '',
}) {
  // Determine current country code from value
  const detectCountry = (val) => {
    if (!val) return '+237';
    const clean = val.trim();
    if (clean.startsWith('+91') || clean.startsWith('91')) return '+91';
    if (clean.startsWith('+237') || clean.startsWith('237')) return '+237';
    if (clean.startsWith('+')) return 'custom';
    return '+237';
  };

  const [country, setCountry] = useState(() => detectCountry(value));

  // Sync country if external value changes drastically (e.g. client load)
  useEffect(() => {
    const detected = detectCountry(value);
    setCountry(detected);
  }, [value]);

  const handleCountrySwitch = (newCountry) => {
    setCountry(newCountry);
    // Extract existing digits
    let digits = (value || '').replace(/\D/g, '');
    if (digits.startsWith('237')) digits = digits.slice(3);
    else if (digits.startsWith('91')) digits = digits.slice(2);

    if (newCountry === '+237') {
      const formatted = formatPhoneNumber(`+237 ${digits.slice(0, 9)}`);
      onChange(formatted);
    } else if (newCountry === '+91') {
      const formatted = formatPhoneNumber(`+91 ${digits.slice(0, 10)}`);
      onChange(formatted);
    } else {
      onChange(`+${digits}`);
    }
  };

  const handleInputChange = (e) => {
    const inputVal = e.target.value;

    // If user typed/pasted a full international number with +
    if (inputVal.startsWith('+91')) {
      setCountry('+91');
    } else if (inputVal.startsWith('+237')) {
      setCountry('+237');
    }

    const formatted = formatPhoneNumber(inputVal);
    onChange(formatted);
  };

  const validation = validatePhoneNumber(value);
  const isComplete = validation.isValid;

  // Calculate digit count for display
  const getDigitsCount = () => {
    const cleaned = (value || '').replace(/\D/g, '');
    if (country === '+237') {
      const local = cleaned.startsWith('237') ? cleaned.slice(3) : cleaned;
      return { count: local.length, max: 9, label: 'Cameroon' };
    }
    if (country === '+91') {
      const local = cleaned.startsWith('91') ? cleaned.slice(2) : cleaned;
      return { count: local.length, max: 10, label: 'India' };
    }
    return null;
  };

  const digitInfo = getDigitsCount();

  return (
    <div className={`w-full ${className}`}>
      {/* Label and Quick Country Selector Pills */}
      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
        <label className="block text-[13px] font-medium text-muted-gray">
          {label} {required && <span className="text-terracotta">*</span>}
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleCountrySwitch('+237')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 ${
              country === '+237'
                ? 'bg-sage text-white shadow-xs'
                : 'bg-muted-gray/10 text-charcoal hover:bg-muted-gray/20'
            }`}
          >
            <span>🇨🇲</span> Cameroon (+237)
          </button>
          <button
            type="button"
            onClick={() => handleCountrySwitch('+91')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 ${
              country === '+91'
                ? 'bg-sage text-white shadow-xs'
                : 'bg-muted-gray/10 text-charcoal hover:bg-muted-gray/20'
            }`}
          >
            <span>🇮🇳</span> India (+91)
          </button>
        </div>
      </div>

      {/* Input container */}
      <div
        className={`flex items-center rounded-[11px] border bg-white overflow-hidden transition-all duration-150 ${
          error || (!isComplete && value.trim() && value.trim() !== '+237' && value.trim() !== '+91')
            ? 'border-amber-400 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-200'
            : isComplete
            ? 'border-emerald-500 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-200'
            : 'border-border focus-within:border-sage focus-within:ring-1 focus-within:ring-sage/30'
        }`}
      >
        {/* Country Selector Dropdown */}
        <div className="relative border-r border-border bg-sand/30 flex items-center">
          <select
            value={country}
            onChange={(e) => handleCountrySwitch(e.target.value)}
            className="appearance-none bg-transparent pl-3 pr-7 py-3 text-xs font-semibold text-charcoal outline-none cursor-pointer"
          >
            <option value="+237">🇨🇲 +237</option>
            <option value="+91">🇮🇳 +91</option>
            <option value="custom">🌐 Other</option>
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
            country === '+237'
              ? '+237 6XX XX XX XX'
              : country === '+91'
              ? '+91 XXXXX XXXXX'
              : '+ country code and number'
          }
          className="flex-1 h-[48px] px-3.5 bg-transparent text-sm text-charcoal placeholder:text-muted-gray/40 outline-none font-mono font-medium"
        />

        {/* Counter Badge */}
        {digitInfo && (
          <div className="pr-3 text-[11px] font-mono text-muted-gray">
            <span
              className={
                digitInfo.count === digitInfo.max
                  ? 'text-emerald-600 font-bold'
                  : digitInfo.count > digitInfo.max
                  ? 'text-terracotta font-bold'
                  : 'text-muted-gray'
              }
            >
              {digitInfo.count}/{digitInfo.max}
            </span>
          </div>
        )}
      </div>

      {/* Validation / Helper message */}
      <div className="mt-1 flex items-center justify-between text-xs min-h-[18px]">
        {value.trim() !== '' && value.trim() !== '+237' && value.trim() !== '+91' ? (
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
            {country === '+237'
              ? 'Cameroon numbers require 9 digits (starts with 6 or 2)'
              : country === '+91'
              ? 'Indian numbers require 10 digits (WhatsApp enabled)'
              : 'Include country code with +'
            }
          </span>
        )}
      </div>
    </div>
  );
}
