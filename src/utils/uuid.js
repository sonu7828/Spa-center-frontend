/**
 * Utility to reliably check if a string is a standard 36-character UUID
 */
export const isUUID = (val) => {
  if (!val || typeof val !== 'string') return false;
  const str = val.trim();
  if (
    str.startsWith('INV-') ||
    str.startsWith('apt-') ||
    str.startsWith('retail-') ||
    str.startsWith('asvc-') ||
    str.startsWith('svc-')
  ) {
    return false;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};
