// Shared IMEI Length Constants and Format Detector (Pack #18 / Pack #20)
export const IMEI_MIN_LENGTH = 14;
export const IMEI_MAX_LENGTH = 16;

export function isImeiFormat(val) {
  const clean = String(val || "").replace(/\s+/g, "");
  return /^\d+$/.test(clean) && clean.length >= IMEI_MIN_LENGTH && clean.length <= IMEI_MAX_LENGTH;
}
