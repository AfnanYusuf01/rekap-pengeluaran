import { BudgetService } from './BudgetService.js';
import { ReportService } from './ReportService.js';
import { formatRupiah, formatMonthName, getCurrentDateString } from './Utils.js';

export class UIService {
  constructor() {
    // Select essential DOM elements
    this.elements = {
      currentMonthDisplay: document.getElementById('current-month-display'),
      syncStatusIndicator: document.getElementById('sync-status-indicator'),
      syncStatusLabel: document.getElementById('sync-status-label'),
      
      summarySalary: document.getElementById('summary-salary'),
      summaryExpenses: document.getElementById('summary-expenses'),
      summaryBalance: document.getElementById('summary-balance'),
      summarySavings: document.getElementById('summary-savings'),
      
      categoriesContainer: document.getElementById('categories-container'),
      
      // Floating Buttons
      btnAddTx: document.getElementById('btn-add-tx'),
      btnHistory: document.getElementById('btn-history'),
      btnCopyReport: document.getElementById('btn-copy-report'),
      btnSettings: document.getElementById('btn-settings'),
      
      // Modals
      transactionModal: document.getElementById('transaction-modal'),
      historyModal: document.getElementById('history-modal'),
      settingsModal: document.getElementById('settings-modal'),
      loadingOverlay: document.getElementById('loading-overlay'),
      loadingText: document.getElementById('loading-text'),
      toastContainer: document.getElementById('toast-container'),
      
      // Forms
      txForm: document.getElementById('tx-form'),
      txTitle: document.getElementById('tx-modal-title'),
      txIdInput: document.getElementById('tx-id'),
      txAmountInput: document.getElementById('tx-amount'),
      txCategorySelect: document.getElementById('tx-category'),
      txDescriptionInput: document.getElementById('tx-description'),
      txDateInput: document.getElementById('tx-date'),
      btnDeleteTx: document.getElementById('btn-delete-tx'),
      
      settingsForm: document.getElementById('settings-form'),
      settingsSalaryInput: document.getElementById('settings-salary')
    };

    this.initializeCategoryDropdown();
    this.bindThousandSeparators();
  }

  /**
   * Bind dynamic thousand separators to input fields
   */
  bindThousandSeparators() {
    if (this.elements.txAmountInput) {
      this.applyThousandSeparator(this.elements.txAmountInput);
    }
    if (this.elements.settingsSalaryInput) {
      this.applyThousandSeparator(this.elements.settingsSalaryInput);
    }
  }

  /**
   * Utility to format numbers dynamically as user types, preserving cursor position
   * @param {HTMLInputElement} inputEl 
   */
  applyThousandSeparator(inputEl) {
    inputEl.addEventListener('input', (e) => {
      const cursor = e.target.selectionStart;
      const cleanVal = e.target.value.replace(/\D/g, '');
      if (!cleanVal) {
        e.target.value = '';
        return;
      }
      const formatted = Number(cleanVal).toLocaleString('id-ID');
      
      // Keep cursor position
      const beforeCursor = e.target.value.substring(0, cursor);
      const cleanBeforeCursor = beforeCursor.replace(/\D/g, '');
      
      e.target.value = formatted;
      
      let targetCursor = 0;
      let digitsCount = 0;
      const targetDigits = cleanBeforeCursor.length;
      
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          digitsCount++;
        }
        targetCursor = i + 1;
        if (digitsCount === targetDigits) {
          break;
        }
      }
      e.target.setSelectionRange(targetCursor, targetCursor);
    });
  }

  /**
   * Populate the transaction form category dropdown options
   */
  initializeCategoryDropdown() {
    if (!this.elements.txCategorySelect) return;
    this.elements.txCategorySelect.innerHTML = '';
    
    BudgetService.getAllCategories().forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.displayName; // Store capitalized name as transaction.category
      option.textContent = cat.displayName;
      this.elements.txCategorySelect.appendChild(option);
    });
  }

  /**
   * Show application loading screen
   * @param {string} message 
   */
  showLoading(message = 'Memuat...') {
    if (this.elements.loadingOverlay && this.elements.loadingText) {
      this.elements.loadingText.textContent = message;
      this.elements.loadingOverlay.classList.add('active');
    }
  }

  /**
   * Hide application loading screen
   */
  hideLoading() {
    if (this.elements.loadingOverlay) {
      this.elements.loadingOverlay.classList.remove('active');
    }
  }

  /**
   * Show alert/toast notification
   * @param {string} message 
   * @param {'success'|'error'|'info'} type 
   */
  showToast(message, type = 'success') {
    if (!this.elements.toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '🔔';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
    `;
    
    this.elements.toastContainer.appendChild(toast);
    
    // Auto-remove toast after 3 seconds
    setTimeout(() => {
      toast.classList.add('fade-out');
      // Force remove after transition finishes
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  /**
   * Update sync status in header
   * @param {'synced'|'syncing'|'error'|'unconfigured'} status 
   */
  updateSyncStatus(status) {
    if (!this.elements.syncStatusIndicator || !this.elements.syncStatusLabel) return;
    
    this.elements.syncStatusIndicator.className = 'status-dot';
    this.elements.syncStatusIndicator.classList.add(status);
    
    switch (status) {
      case 'synced':
        this.elements.syncStatusLabel.textContent = 'Synced with GitHub';
        break;
      case 'syncing':
        this.elements.syncStatusLabel.textContent = 'Syncing...';
        break;
      case 'error':
        this.elements.syncStatusLabel.textContent = 'Sync Failed';
        break;
      case 'unconfigured':
        this.elements.syncStatusLabel.textContent = 'Not Synced (Local)';
        break;
    }
  }

  /**
   * Dynamic greeting based on current local hour
   */
  updateGreeting() {
    const greetingEl = document.getElementById('header-greeting');
    if (!greetingEl) return;
    
    const hour = new Date().getHours();
    let greeting = 'Selamat Pagi';
    
    if (hour >= 11 && hour < 15) {
      greeting = 'Selamat Siang';
    } else if (hour >= 15 && hour < 19) {
      greeting = 'Selamat Sore';
    } else if (hour >= 19 || hour < 5) {
      greeting = 'Selamat Malam';
    }
    
    greetingEl.textContent = `${greeting}, Kak! 👋`;
  }

  /**
   * Main dashboard render
   * @param {Object} settings 
   * @param {Array} transactions 
   * @param {string} yearMonth 
   * @param {Function} onSelectTransaction Callback when transaction is clicked for edit
   */
  renderDashboard(settings, transactions, yearMonth, onSelectTransaction) {
    // 0. Update dynamic greeting
    this.updateGreeting();

    // 1. Update Month title
    if (this.elements.currentMonthDisplay) {
      this.elements.currentMonthDisplay.textContent = formatMonthName(yearMonth);
    }

    // 2. Compute Summary
    const summary = ReportService.calculateSummary(settings, transactions);

    // 3. Update Summary Card UI
    if (this.elements.summarySalary) {
      this.elements.summarySalary.textContent = formatRupiah(summary.salary);
    }
    if (this.elements.summaryExpenses) {
      this.elements.summaryExpenses.textContent = formatRupiah(summary.totalPengeluaran);
    }
    if (this.elements.summaryBalance) {
      this.elements.summaryBalance.textContent = formatRupiah(summary.sisaSaldo);
    }
    if (this.elements.summarySavings) {
      const savedPct = summary.targetTabungan > 0 ? (summary.sudahDitabung / summary.targetTabungan) * 100 : 0;
      this.elements.summarySavings.innerHTML = `
        <div class="savings-info">
          <span>Target Tabungan: <strong>${formatRupiah(summary.targetTabungan)}</strong></span>
          <span>Sudah: <strong>${formatRupiah(summary.sudahDitabung)}</strong></span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar bg-green" style="width: ${Math.min(100, savedPct)}%"></div>
        </div>
        <div class="savings-info sub-info">
          <span>Sisa Target: <strong>${formatRupiah(summary.sisaTargetTabungan)}</strong></span>
          <span>Progress: <strong>${savedPct.toFixed(0)}%</strong></span>
        </div>
      `;
    }

    // 4. Render Category Cards
    if (this.elements.categoriesContainer) {
      this.elements.categoriesContainer.innerHTML = '';
      
      const categories = BudgetService.getAllCategories();
      
      categories.forEach(cat => {
        const isTab = BudgetService.isTabungan(cat.key);
        const budgetVal = settings.budgets[cat.key] || 0;
        const txList = summary.categoryTransactions[cat.key] || [];

        // Sum up category transactions
        const categoryTotal = txList.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
        
        // Progress percentage
        const progressPct = budgetVal > 0 ? (categoryTotal / budgetVal) * 100 : 0;
        const isOverBudget = !isTab && categoryTotal > budgetVal && budgetVal > 0;

        // Card Element
        const card = document.createElement('div');
        const catColorClass = `cat-${cat.key}`;
        card.className = `category-card ${catColorClass} ${isOverBudget ? 'over-budget' : ''}`;
        
        // Card Header
        let headerHTML = '';
        if (isTab) {
          headerHTML = `
            <div class="card-header">
              <h3 class="category-title">1. ${cat.displayName.toUpperCase()}</h3>
              <span class="budget-limit">Target: <strong>${formatRupiah(budgetVal)}</strong></span>
            </div>
          `;
        } else {
          headerHTML = `
            <div class="card-header">
              <h3 class="category-title">${cat.displayName.toUpperCase()}</h3>
              <span class="budget-limit">Budget: <strong>${formatRupiah(budgetVal)}</strong></span>
            </div>
          `;
        }

        // Transactions List
        let txListHTML = '';
        if (txList.length === 0) {
          txListHTML = `<div class="no-tx-placeholder">Belum ada transaksi</div>`;
        } else {
          txListHTML = `<div class="tx-list">`;
          txList.forEach((tx, i) => {
            const letter = String.fromCharCode(97 + i); // a, b, c...
            txListHTML += `
              <div class="tx-item" data-id="${tx.id}">
                <div class="tx-item-left">
                  <span class="tx-bullet">${letter}.</span>
                  <div class="tx-details">
                    <span class="tx-description">${tx.description || 'Tanpa keterangan'}</span>
                    <span class="tx-date">${tx.date}</span>
                  </div>
                </div>
                <div class="tx-item-right">
                  <span class="tx-amount">${formatRupiah(tx.amount)}</span>
                </div>
              </div>
            `;
          });
          txListHTML += `</div>`;
        }

        // Card Footer
        let footerHTML = '';
        if (isTab) {
          footerHTML = `
            <div class="card-footer tabungan-footer">
              <div class="footer-row">
                <span>Sudah Ditabung</span>
                <span class="val text-green">${formatRupiah(categoryTotal)}</span>
              </div>
              <div class="footer-row">
                <span>Sisa Target</span>
                <span class="val font-semibold">${formatRupiah(Math.max(0, budgetVal - categoryTotal))}</span>
              </div>
            </div>
          `;
        } else {
          const sisaBudget = budgetVal - categoryTotal;
          footerHTML = `
            <div class="card-footer">
              <div class="footer-row">
                <span>Total</span>
                <span class="val">${formatRupiah(categoryTotal)}</span>
              </div>
              <div class="footer-row">
                <span>Sisa Budget</span>
                <span class="val font-semibold ${sisaBudget < 0 ? 'text-red' : 'text-green'}">${formatRupiah(sisaBudget)}</span>
              </div>
            </div>
          `;
        }

        card.innerHTML = `
          ${headerHTML}
          ${!isTab && budgetVal > 0 ? `
            <div class="progress-bar-container mini">
              <div class="progress-bar ${isOverBudget ? 'bg-red' : 'bg-green'}" style="width: ${Math.min(100, progressPct)}%"></div>
            </div>
          ` : ''}
          ${txListHTML}
          ${footerHTML}
        `;

        // Attach listeners to transaction items
        card.querySelectorAll('.tx-item').forEach(item => {
          item.addEventListener('click', () => {
            const txId = Number(item.getAttribute('data-id'));
            const tx = transactions.find(t => t.id === txId);
            if (tx) onSelectTransaction(tx);
          });
        });

        this.elements.categoriesContainer.appendChild(card);
      });
    }
  }

  /**
   * Render lists of months inside the Month Selector bottom sheet
   * @param {Array<string>} availableMonths 
   * @param {string} activeMonth 
   * @param {Function} onSelect 
   */
  renderHistoryMonths(availableMonths, activeMonth, onSelect) {
    if (!this.elements.historyMonthList) return;
    this.elements.historyMonthList.innerHTML = '';
    
    availableMonths.forEach(m => {
      const btn = document.createElement('button');
      btn.className = `month-select-btn ${m === activeMonth ? 'active' : ''}`;
      btn.innerHTML = `
        <span class="month-name">${formatMonthName(m)}</span>
        ${m === activeMonth ? '<span class="active-tick">✓</span>' : ''}
      `;
      btn.addEventListener('click', () => {
        onSelect(m);
        this.closeModal(this.elements.historyModal);
      });
      this.elements.historyMonthList.appendChild(btn);
    });
  }

  /**
   * Open a specific modal
   * @param {HTMLElement} modal 
   */
  openModal(modal) {
    if (modal) {
      modal.classList.add('active');
      document.body.classList.add('modal-open');
    }
  }

  /**
   * Close a specific modal
   * @param {HTMLElement} modal 
   */
  closeModal(modal) {
    if (modal) {
      modal.classList.remove('active');
      document.body.classList.remove('modal-open');
    }
  }

  /**
   * Setup & display the Transaction Add/Edit modal
   * @param {Object|null} transaction Pass object to edit, null to create new
   * @param {Function} onSubmit handleSubmit callback
   * @param {Function} onDelete handleDelete callback
   */
  openTransactionModal(transaction = null, onSubmit, onDelete) {
    if (!this.elements.transactionModal) return;
    
    this.elements.txForm.reset();
    
    if (transaction) {
      // Edit mode
      this.elements.txTitle.textContent = 'Ubah Transaksi';
      this.elements.txIdInput.value = transaction.id;
      this.elements.txAmountInput.value = Number(transaction.amount).toLocaleString('id-ID');
      this.elements.txCategorySelect.value = transaction.category;
      this.elements.txDescriptionInput.value = transaction.description;
      this.elements.txDateInput.value = transaction.date;
      
      this.elements.btnDeleteTx.style.display = 'block';
    } else {
      // Add mode
      this.elements.txTitle.textContent = 'Tambah Transaksi';
      this.elements.txIdInput.value = '';
      
      // Auto pre-fill with today's date in local YYYY-MM-DD
      this.elements.txDateInput.value = getCurrentDateString();
      this.elements.btnDeleteTx.style.display = 'none';
    }

    // Attach Submit Callback
    this.elements.txForm.onsubmit = (e) => {
      e.preventDefault();
      const amount = Number(this.elements.txAmountInput.value.replace(/\D/g, ''));
      const category = this.elements.txCategorySelect.value;
      const description = this.elements.txDescriptionInput.value;
      const date = this.elements.txDateInput.value;
      
      if (!amount || amount <= 0) {
        this.showToast('Nominal harus lebih dari 0', 'error');
        return;
      }
      
      onSubmit({ amount, category, description, date });
      this.closeModal(this.elements.transactionModal);
    };

    // Attach Delete Callback
    this.elements.btnDeleteTx.onclick = () => {
      if (transaction && confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
        onDelete(transaction.id);
        this.closeModal(this.elements.transactionModal);
      }
    };

    this.openModal(this.elements.transactionModal);
  }

  /**
   * Setup & display the Settings modal
   * @param {Object} settings 
   * @param {Object} githubConfig 
   * @param {Function} onSubmit 
   */
  openSettingsModal(settings, githubConfig, onSubmit) {
    if (!this.elements.settingsModal) return;
    
    this.elements.settingsForm.reset();
    
    // Fill Gaji
    this.elements.settingsSalaryInput.value = Number(settings.salary || 0).toLocaleString('id-ID');
    
    // Fill category budgets dynamically
    const categories = BudgetService.getAllCategories();
    const budgetsContainer = document.getElementById('settings-budgets-container');
    if (budgetsContainer) {
      budgetsContainer.innerHTML = '';
      
      categories.forEach(cat => {
        const val = settings.budgets[cat.key] || 0;
        const group = document.createElement('div');
        group.className = 'form-group';
        group.innerHTML = `
          <label for="settings-budget-${cat.key}">Budget ${cat.displayName}</label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix-text">Rp</span>
            <input type="text" id="settings-budget-${cat.key}" name="budget-${cat.key}" value="${Number(val).toLocaleString('id-ID')}" required class="form-input with-prefix">
          </div>
        `;
        budgetsContainer.appendChild(group);

        // Bind format-on-type listener to newly created input
        const inputEl = document.getElementById(`settings-budget-${cat.key}`);
        this.applyThousandSeparator(inputEl);
      });
    }

    // Fill GitHub details
    document.getElementById('settings-gh-username').value = githubConfig.githubUsername || '';
    document.getElementById('settings-gh-repo').value = githubConfig.repoName || '';
    document.getElementById('settings-gh-branch').value = githubConfig.branch || 'main';
    document.getElementById('settings-gh-token').value = githubConfig.personalAccessToken || '';

    // Attach Submit Callback
    this.elements.settingsForm.onsubmit = (e) => {
      e.preventDefault();
      
      const salary = Number(this.elements.settingsSalaryInput.value.replace(/\D/g, ''));
      
      // Collect budgets
      const budgets = {};
      categories.forEach(cat => {
        const input = document.getElementById(`settings-budget-${cat.key}`);
        budgets[cat.key] = Number(input.value.replace(/\D/g, '')) || 0;
      });

      // Collect GitHub config
      const ghConfig = {
        githubUsername: document.getElementById('settings-gh-username').value.trim(),
        repoName: document.getElementById('settings-gh-repo').value.trim(),
        branch: document.getElementById('settings-gh-branch').value.trim(),
        personalAccessToken: document.getElementById('settings-gh-token').value.trim()
      };

      onSubmit(salary, budgets, ghConfig);
      this.closeModal(this.elements.settingsModal);
    };

    this.openModal(this.elements.settingsModal);
  }
}
