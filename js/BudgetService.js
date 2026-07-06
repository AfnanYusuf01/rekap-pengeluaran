export const CATEGORY_MAP = {
  'Tabungan': 'tabungan',
  'Kost': 'kost',
  'Makan': 'makan',
  'Bensin': 'bensin',
  'Sabun': 'sabun',
  'Jalan-jalan': 'jalanjalan',
  'Bucin': 'bucin',
  'Dana Cadangan': 'cadangan',
  'Lain-lain': 'lainlain'
};

export const REVERSE_CATEGORY_MAP = {
  'tabungan': 'Tabungan',
  'kost': 'Kost',
  'makan': 'Makan',
  'bensin': 'Bensin',
  'sabun': 'Sabun',
  'jalanjalan': 'Jalan-jalan',
  'bucin': 'Bucin',
  'cadangan': 'Dana Cadangan',
  'lainlain': 'Lain-lain'
};

export class BudgetService {
  /**
   * Get the internal JSON key for a given category display name
   * @param {string} displayName 
   * @returns {string}
   */
  static getCategoryKey(displayName) {
    return CATEGORY_MAP[displayName] || 'lainlain';
  }

  /**
   * Get the display name for a given internal JSON key
   * @param {string} key 
   * @returns {string}
   */
  static getCategoryDisplayName(key) {
    return REVERSE_CATEGORY_MAP[key] || 'Lain-lain';
  }

  /**
   * Returns list of all categories with keys and display names in their ordered preference
   * @returns {Array<{key: string, displayName: string}>}
   */
  static getAllCategories() {
    return Object.keys(CATEGORY_MAP).map(displayName => ({
      key: CATEGORY_MAP[displayName],
      displayName: displayName
    }));
  }

  /**
   * Checks if category name is "Tabungan" (requires different report treatment)
   * @param {string} displayNameOrKey 
   * @returns {boolean}
   */
  static isTabungan(displayNameOrKey) {
    if (!displayNameOrKey) return false;
    const clean = displayNameOrKey.toLowerCase();
    return clean === 'tabungan';
  }
}
