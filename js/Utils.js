const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Format number to Indonesian Rupiah (e.g. Rp6.000.000)
 * @param {number} amount 
 * @returns {string}
 */
export function formatRupiah(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rp0';
  const sign = amount < 0 ? '-' : '';
  const absolute = Math.abs(amount);
  const formatter = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  return `${sign}Rp${formatter.format(absolute)}`;
}

/**
 * Convert YYYY-MM to Indonesian Month Year (e.g. 2026-07 -> Juli 2026)
 * @param {string} yearMonth 
 * @returns {string}
 */
export function formatMonthName(yearMonth) {
  if (!yearMonth || !yearMonth.includes('-')) return yearMonth;
  const [year, monthStr] = yearMonth.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${MONTHS_ID[monthIdx]} ${year}`;
  }
  return yearMonth;
}

/**
 * Convert Indonesian Month Year back to YYYY-MM (e.g. Juli 2026 -> 2026-07)
 * @param {string} indonesianMonthName 
 * @returns {string}
 */
export function parseMonthName(indonesianMonthName) {
  if (!indonesianMonthName) return '';
  const parts = indonesianMonthName.trim().split(/\s+/);
  if (parts.length !== 2) return '';
  const [monthName, year] = parts;
  const monthIdx = MONTHS_ID.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
  if (monthIdx === -1) return '';
  const monthStr = String(monthIdx + 1).padStart(2, '0');
  return `${year}-${monthStr}`;
}

/**
 * Get current year-month in local timezone YYYY-MM
 * @returns {string}
 */
export function getCurrentYearMonth() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get current date in local timezone YYYY-MM-DD
 * @returns {string}
 */
export function getCurrentDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get current timestamp in local ISO-ish format (e.g., 2026-07-05T09:00)
 * @returns {string}
 */
export function getCurrentDateTimeString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Generate unique integer ID
 * @returns {number}
 */
export function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

/**
 * Copy text to clipboard
 * @param {string} text 
 * @returns {Promise<boolean>}
 */
export async function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error("Failed to copy using navigator.clipboard", err);
    }
  }
  
  // Fallback method
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed"; // prevent scrolling
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Fallback: Oops, unable to copy", err);
    document.body.removeChild(textArea);
    return false;
  }
}
