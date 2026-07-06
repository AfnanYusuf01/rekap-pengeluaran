import { CONFIG } from '../config.js';
import { GitHubService } from './GitHubService.js';

export class StorageService {
  constructor() {
    this.config = this.loadConfig();
    this.data = null; // finance-data.json structure
    this.sha = null;  // Git blob SHA
  }

  /**
   * Load credentials from config.js and override with LocalStorage if defined
   * @returns {Object}
   */
  loadConfig() {
    const local = localStorage.getItem('expense_tracker_config');
    const localConfig = local ? JSON.parse(local) : {};

    return {
      githubUsername: localConfig.githubUsername || CONFIG.githubUsername || '',
      repoName: localConfig.repoName || CONFIG.repoName || '',
      branch: localConfig.branch || CONFIG.branch || 'main',
      filePath: localConfig.filePath || CONFIG.filePath || 'finance-data.json',
      personalAccessToken: localConfig.personalAccessToken || CONFIG.personalAccessToken || ''
    };
  }

  /**
   * Save configuration to LocalStorage (allows changing credentials dynamically)
   * @param {Object} newConfig 
   */
  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem('expense_tracker_config', JSON.stringify(this.config));
  }

  /**
   * Check if GitHub API configurations are loaded
   * @returns {boolean}
   */
  hasCredentials() {
    return !!(this.config.githubUsername && this.config.repoName && this.config.personalAccessToken);
  }

  /**
   * Load data from GitHub API and update local cache
   * @returns {Promise<Object>}
   */
  async syncFromGitHub() {
    if (!this.hasCredentials()) {
      // Fallback: load cache or default data
      this.data = this.getCachedData() || GitHubService.getDefaultData();
      this.sha = localStorage.getItem('expense_tracker_sha_cache') || null;
      return this.data;
    }

    try {
      const result = await GitHubService.getFile(this.config);
      this.data = result.data;
      this.sha = result.sha;
      
      // Update local storage cache
      localStorage.setItem('expense_tracker_data_cache', JSON.stringify(this.data));
      localStorage.setItem('expense_tracker_sha_cache', this.sha || '');
      return this.data;
    } catch (error) {
      console.warn("Using offline cached data due to API sync error:", error);
      this.data = this.getCachedData() || GitHubService.getDefaultData();
      this.sha = localStorage.getItem('expense_tracker_sha_cache') || null;
      throw error;
    }
  }

  /**
   * Push current state to GitHub with conflict resolution
   * @returns {Promise<Object>}
   */
  async syncToGitHub() {
    if (!this.hasCredentials()) {
      // If no credentials, we only save locally in cached state
      localStorage.setItem('expense_tracker_data_cache', JSON.stringify(this.data));
      return this.data;
    }

    try {
      // Fetch latest file content & SHA from GitHub to do optimistic updates
      const latest = await GitHubService.getFile(this.config);
      
      // Merge latest remote transactions with local transactions
      const mergedTransactions = this.mergeTransactions(latest.data.transactions || {}, this.data.transactions || {});
      
      this.data = {
        settings: this.data.settings || latest.data.settings || GitHubService.getDefaultData().settings,
        transactions: mergedTransactions
      };

      // Push updated data
      const newSha = await GitHubService.updateFile(this.config, this.data, latest.sha);
      this.sha = newSha;

      // Update cache
      localStorage.setItem('expense_tracker_data_cache', JSON.stringify(this.data));
      localStorage.setItem('expense_tracker_sha_cache', this.sha);
      return this.data;
    } catch (error) {
      console.error("Gagal sinkronisasi data ke GitHub:", error);
      // Save locally in cache anyway
      localStorage.setItem('expense_tracker_data_cache', JSON.stringify(this.data));
      throw error;
    }
  }

  /**
   * Helper to merge local and remote transactions chronologically based on ID
   * @param {Object} remoteTx 
   * @param {Object} localTx 
   * @returns {Object}
   */
  mergeTransactions(remoteTx, localTx) {
    const merged = { ...remoteTx };
    for (const [month, txList] of Object.entries(localTx)) {
      if (!merged[month]) {
        merged[month] = txList;
      } else {
        const txMap = new Map();
        // Index by ID
        merged[month].forEach(tx => txMap.set(tx.id, tx));
        txList.forEach(tx => txMap.set(tx.id, tx));
        // Rebuild list and sort by date ascending
        merged[month] = Array.from(txMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
      }
    }
    return merged;
  }

  /**
   * Get cached data from LocalStorage
   * @returns {Object|null}
   */
  getCachedData() {
    const cached = localStorage.getItem('expense_tracker_data_cache');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Failed to parse cached data:", e);
      }
    }
    return null;
  }

  /**
   * Retrieve active settings
   * @returns {Object}
   */
  getSettings() {
    if (!this.data) {
      this.data = this.getCachedData() || GitHubService.getDefaultData();
    }
    return this.data.settings;
  }

  /**
   * Update active settings (Salary & budgets)
   * @param {number} salary 
   * @param {Object} budgets 
   */
  async updateSettings(salary, budgets) {
    this.getSettings(); // ensure structure initialized
    this.data.settings.salary = Number(salary);
    this.data.settings.budgets = budgets;
    await this.syncToGitHub();
  }

  /**
   * Get transactions list for a given month
   * @param {string} yearMonth (e.g. YYYY-MM)
   * @returns {Array}
   */
  getTransactions(yearMonth) {
    if (!this.data) {
      this.data = this.getCachedData() || GitHubService.getDefaultData();
    }
    if (!this.data.transactions) {
      this.data.transactions = {};
    }
    return this.data.transactions[yearMonth] || [];
  }

  /**
   * Add a new transaction
   * @param {Object} transaction 
   */
  async addTransaction(transaction) {
    this.getSettings();
    if (!this.data.transactions) {
      this.data.transactions = {};
    }
    
    const monthKey = transaction.date.substring(0, 7); // YYYY-MM
    if (!this.data.transactions[monthKey]) {
      this.data.transactions[monthKey] = [];
    }

    this.data.transactions[monthKey].push(transaction);
    this.data.transactions[monthKey].sort((a, b) => new Date(a.date) - new Date(b.date));

    await this.syncToGitHub();
  }

  /**
   * Update an existing transaction details
   * @param {number|string} id 
   * @param {Object} updatedTx 
   */
  async updateTransaction(id, updatedTx) {
    this.getSettings();
    let found = false;

    for (const [monthKey, txList] of Object.entries(this.data.transactions)) {
      const idx = txList.findIndex(tx => tx.id === id);
      if (idx !== -1) {
        const originalDate = txList[idx].date;
        const newDate = updatedTx.date;
        const originalMonth = originalDate.substring(0, 7);
        const newMonth = newDate.substring(0, 7);

        if (originalMonth === newMonth) {
          // Date remained in same month
          txList[idx] = { ...txList[idx], ...updatedTx };
          txList.sort((a, b) => new Date(a.date) - new Date(b.date));
        } else {
          // Date moved to a different month
          txList.splice(idx, 1);
          if (!this.data.transactions[newMonth]) {
            this.data.transactions[newMonth] = [];
          }
          this.data.transactions[newMonth].push({ ...updatedTx, id });
          this.data.transactions[newMonth].sort((a, b) => new Date(a.date) - new Date(b.date));
        }
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error(`Transaksi dengan ID ${id} tidak ditemukan.`);
    }

    await this.syncToGitHub();
  }

  /**
   * Delete an existing transaction
   * @param {number|string} id 
   */
  async deleteTransaction(id) {
    this.getSettings();
    let found = false;

    for (const [monthKey, txList] of Object.entries(this.data.transactions)) {
      const idx = txList.findIndex(tx => tx.id === id);
      if (idx !== -1) {
        txList.splice(idx, 1);
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error(`Transaksi dengan ID ${id} tidak ditemukan.`);
    }

    await this.syncToGitHub();
  }

  /**
   * Get list of unique available months with transactions, sorted descending (latest first)
   * @returns {Array<string>}
   */
  getAvailableMonths() {
    this.getSettings();
    const months = new Set();
    
    if (this.data.transactions) {
      Object.keys(this.data.transactions).forEach(m => {
        // Only show if it has transactions or if it's the current month
        if (this.data.transactions[m].length > 0) {
          months.add(m);
        }
      });
    }
    
    // Always include current month
    const currentMonth = new Date().toISOString().substring(0, 7);
    months.add(currentMonth);

    return Array.from(months).sort().reverse();
  }
}
