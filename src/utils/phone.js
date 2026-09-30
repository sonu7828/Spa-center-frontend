/**
 * Phone formatting & validation utility for OMEGA SPA
 * 
 * Rules:
 *  - Cameroon (+237): Exactly 9 digits. Starts with 6 (mobile: MTN, Orange, Nexttel) or 2 (landlines/Camtel).
 *  - India (+91): Exactly 10 digits.
 *  - International: 8-15 digits E.164.
 */

export function formatPhoneNumber(input) {
  if (input === undefined || input === null) return '';

  // Allow user to backspace freely without being hijacked
  const trimmed = input.trim();
  if (
    trimmed === '' ||
    trimmed === '+' ||
    trimmed === '+2' ||
    trimmed === '+23' ||
    trimmed === '+237' ||
    trimmed === '+9' ||
    trimmed === '+91' ||
    input.length <= 4 && input.startsWith('+')
  ) {
    return input;
  }

  // If input starts with Cameroon code (+237 or 237)
  if (trimmed.startsWith('+237') || trimmed.startsWith('237')) {
    const rawDigits = trimmed.replace(/\D/g, '').slice(3); // strip 237
    const limited = rawDigits.slice(0, 9); // exactly 9 digits max

    if (limited.length === 0) return input.endsWith(' ') ? '+237 ' : '+237';
    if (limited.length <= 3) return `+237 ${limited}`;
    if (limited.length <= 5) return `+237 ${limited.slice(0, 3)} ${limited.slice(3)}`;
    if (limited.length <= 7) return `+237 ${limited.slice(0, 3)} ${limited.slice(3, 5)} ${limited.slice(5)}`;
    return `+237 ${limited.slice(0, 3)} ${limited.slice(3, 5)} ${limited.slice(5, 7)} ${limited.slice(7)}`;
  }

  // If input starts with India (+91 or 91)
  if (trimmed.startsWith('+91') || trimmed.startsWith('91')) {
    const rawDigits = trimmed.replace(/\D/g, '').slice(2);
    const limited = rawDigits.slice(0, 10); // max 10 digits
    if (limited.length === 0) return input.endsWith(' ') ? '+91 ' : '+91';
    if (limited.length <= 5) return `+91 ${limited}`;
    return `+91 ${limited.slice(0, 5)} ${limited.slice(5)}`;
  }

  // If user types a 9-digit local Cameroon number directly (e.g. 687673262)
  const onlyDigits = trimmed.replace(/\D/g, '');
  if ((onlyDigits.startsWith('6') || onlyDigits.startsWith('2')) && onlyDigits.length <= 9 && !trimmed.startsWith('+')) {
    const limited = onlyDigits.slice(0, 9);
    if (limited.length <= 3) return `+237 ${limited}`;
    if (limited.length <= 5) return `+237 ${limited.slice(0, 3)} ${limited.slice(3)}`;
    if (limited.length <= 7) return `+237 ${limited.slice(0, 3)} ${limited.slice(3, 5)} ${limited.slice(5)}`;
    return `+237 ${limited.slice(0, 3)} ${limited.slice(3, 5)} ${limited.slice(5, 7)} ${limited.slice(7)}`;
  }

  // Any other country code (e.g. +33, +1, etc.)
  return input;
}

export function validatePhoneNumber(phone) {
  if (!phone || phone.trim() === '' || phone.trim() === '+237' || phone.trim() === '+91') {
    return { isValid: false, message: 'Phone number is required' };
  }

  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Cameroon check
  if (cleaned.startsWith('+237') || cleaned.startsWith('237')) {
    const local = cleaned.startsWith('+237') ? cleaned.slice(4) : cleaned.slice(3);
    if (local.length === 0) {
      return { isValid: false, message: 'Please enter the 9-digit phone number' };
    }
    if (local.length < 9) {
      return {
        isValid: false,
        message: `Incomplete number (${local.length}/9 digits). Cameroon numbers need 9 digits.`,
      };
    }
    if (local.length > 9) {
      return {
        isValid: false,
        message: `Too many digits (${local.length}/9). Cameroon numbers must be exactly 9 digits.`,
      };
    }
    if (!local.startsWith('6') && !local.startsWith('2')) {
      return {
        isValid: false,
        message: 'Cameroon numbers must start with 6 (mobile) or 2 (fixed).',
      };
    }
    return { isValid: true, message: 'Valid Cameroon WhatsApp number ✓' };
  }

  // India check
  if (cleaned.startsWith('+91') || cleaned.startsWith('91')) {
    const local = cleaned.startsWith('+91') ? cleaned.slice(3) : cleaned.slice(2);
    if (local.length < 10) {
      return {
        isValid: false,
        message: `Incomplete number (${local.length}/10 digits). Indian numbers need 10 digits.`,
      };
    }
    if (local.length > 10) {
      return {
        isValid: false,
        message: `Too many digits (${local.length}/10 digits).`,
      };
    }
    return { isValid: true, message: 'Valid Indian WhatsApp number ✓' };
  }

  // International check
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length < 8 || digitsOnly.length > 15) {
    return { isValid: false, message: 'Invalid international number length' };
  }

  return { isValid: true, message: 'Valid international number ✓' };
}
