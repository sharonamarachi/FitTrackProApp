/**
 * Sanitise numeric text-input values.
 *
 * 1. Strips every character that isn't a digit.
 * 2. Removes leading zeros (e.g. "007" → "7").
 * 3. Caps the result at `maxLength` digits (default 3).
 *
 * Passing an empty string through returns "" so the field can be cleared.
 */
export const onlyNumbers = (text: string, maxLength = 3): string => {
  const digits = text.replace(/[^0-9]/g, "");
  const noLeadingZeros = digits.replace(/^0+(\d)/, "$1");
  return noLeadingZeros.slice(0, maxLength);
};
