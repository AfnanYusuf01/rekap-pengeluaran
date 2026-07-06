import { StorageService } from './js/StorageService.js';
import { UIService } from './js/UIService.js';
import { ReportService } from './js/ReportService.js';
import { BudgetService } from './js/BudgetService.js';
import { 
  generateId, 
  getCurrentDateTimeString, 
  copyTextToClipboard, 
  getCurrentYearMonth 
} from './js/Utils.js';

// Initialize services
const storage = new StorageService();
const ui = new UIService();

// State
let activeMonth = getCurrentYearMonth(); // Defaults to current YYYY-MM

/**
 * Main function to load/reload data from storage and refresh the UI
 * @param {boolean} forceFetch Force refresh from GitHub REST API
 */
async function loadAppData(forceFetch = true) {
  if (forceFetch) {
    if (storage.hasCredentials()) {
      ui.showLoading('Mengambil data dari GitHub...');
      ui.updateSyncStatus('syncing');
    } else {
      ui.updateSyncStatus('unconfigured');
      ui.showToast('Silakan atur konfigurasi GitHub Anda di Pengaturan.', 'info');
    }
  }

  try {
    if (forceFetch) {
      await storage.syncFromGitHub();
      if (storage.hasCredentials()) {
        ui.updateSyncStatus('synced');
      }
    }
    
    refreshDashboardUI();
  } catch (error) {
    console.error('Error loading application data:', error);
    ui.updateSyncStatus('error');
    ui.showToast('Gagal sinkronisasi dengan GitHub. Menggunakan data lokal (offline).', 'error');
    
    // Attempt rendering using local cache fallback
    refreshDashboardUI();
  } finally {
    ui.hideLoading();
  }
}

/**
 * Re-render dashboard components based on current cached state and activeMonth
 */
function refreshDashboardUI() {
  const settings = storage.getSettings();
  const transactions = storage.getTransactions(activeMonth);
  
  // Render Dashboard Counters and Category lists
  ui.renderDashboard(settings, transactions, activeMonth, (txToEdit) => {
    // On clicking a transaction item, open edit form
    handleEditTransaction(txToEdit);
  });
}

/**
 * Handle Add Transaction Form trigger
 */
function handleAddTransaction() {
  ui.openTransactionModal(
    null, // null indicates Add mode
    
    // onSubmit callback
    async (formData) => {
      ui.showLoading('Menyimpan ke GitHub...');
      try {
        const newTransaction = {
          id: generateId(),
          date: formData.date,
          category: formData.category,
          amount: Number(formData.amount),
          description: formData.description,
          created_at: getCurrentDateTimeString()
        };
        
        await storage.addTransaction(newTransaction);
        ui.showToast('Transaksi berhasil disimpan ke GitHub!', 'success');
        
        // If transaction date is in a different month, switch view to that month
        const txMonth = formData.date.substring(0, 7);
        if (txMonth !== activeMonth) {
          activeMonth = txMonth;
        }
        
        await loadAppData(false); // Quick local refresh and save already pushed
      } catch (err) {
        ui.showToast('Gagal menyimpan transaksi. Periksa token/koneksi.', 'error');
      } finally {
        ui.hideLoading();
      }
    },
    
    // onDelete callback (unused in Add mode)
    null
  );
}

/**
 * Handle Edit Transaction Form trigger
 * @param {Object} transaction 
 */
function handleEditTransaction(transaction) {
  ui.openTransactionModal(
    transaction,
    
    // onSubmit (Edit Save) callback
    async (formData) => {
      ui.showLoading('Menyimpan perubahan...');
      try {
        const updatedTx = {
          date: formData.date,
          category: formData.category,
          amount: Number(formData.amount),
          description: formData.description
        };
        
        await storage.updateTransaction(transaction.id, updatedTx);
        ui.showToast('Transaksi berhasil diperbarui!', 'success');
        
        // If date changed to different month, switch to that month
        const newMonth = formData.date.substring(0, 7);
        if (newMonth !== activeMonth) {
          activeMonth = newMonth;
        }
        
        await loadAppData(false);
      } catch (err) {
        ui.showToast('Gagal memperbarui transaksi.', 'error');
      } finally {
        ui.hideLoading();
      }
    },
    
    // onDelete callback
    async (idToDelete) => {
      ui.showLoading('Menghapus transaksi...');
      try {
        await storage.deleteTransaction(idToDelete);
        ui.showToast('Transaksi berhasil dihapus!', 'success');
        await loadAppData(false);
      } catch (err) {
        ui.showToast('Gagal menghapus transaksi.', 'error');
      } finally {
        ui.hideLoading();
      }
    }
  );
}

/**
 * Open Month selection bottom sheet list
 */
function handleOpenHistory() {
  const availableMonths = storage.getAvailableMonths();
  
  ui.renderHistoryMonths(availableMonths, activeMonth, (selectedMonth) => {
    activeMonth = selectedMonth;
    ui.closeModal(ui.elements.historyModal);
    refreshDashboardUI();
    ui.showToast(`Menampilkan laporan untuk ${formatMonthName(selectedMonth)}`, 'info');
  });
  
  ui.openModal(ui.elements.historyModal);
}

/**
 * Open Settings Form (salary, budget category weights, and GitHub API credentials)
 */
function handleOpenSettings() {
  const settings = storage.getSettings();
  const ghConfig = storage.config;
  
  ui.openSettingsModal(
    settings,
    ghConfig,
    
    // onSubmit callback
    async (salary, budgets, newGhConfig) => {
      ui.showLoading('Menyimpan konfigurasi...');
      try {
        // Save token & username locally
        storage.saveConfig(newGhConfig);
        
        // Push settings updates to GitHub file
        await storage.updateSettings(salary, budgets);
        ui.showToast('Pengaturan berhasil disimpan!', 'success');
        
        // Full reload to test connectivity with new credentials
        await loadAppData(true);
      } catch (err) {
        ui.showToast('Gagal menyimpan pengaturan ke GitHub. Cek kredensial Anda.', 'error');
        // Refresh UI back anyway
        refreshDashboardUI();
      } finally {
        ui.hideLoading();
      }
    }
  );
}

/**
 * Copy formatted WhatsApp report to clipboard
 */
async function handleCopyReport() {
  const settings = storage.getSettings();
  const transactions = storage.getTransactions(activeMonth);
  
  if (transactions.length === 0) {
    ui.showToast('Tidak ada transaksi di bulan ini untuk disalin.', 'info');
    return;
  }
  
  const reportText = ReportService.generateWhatsAppReport(activeMonth, settings, transactions);
  
  const success = await copyTextToClipboard(reportText);
  if (success) {
    ui.showToast('Laporan WhatsApp berhasil disalin ke clipboard!', 'success');
  } else {
    ui.showToast('Gagal menyalin laporan ke clipboard.', 'error');
  }
}

/**
 * Check Password Lock Screen before loading application data
 */
function initLockScreen() {
  const isUnlocked = localStorage.getItem('expense_tracker_unlocked') === 'true';
  const lockOverlay = document.getElementById('lock-screen');
  const lockForm = document.getElementById('lock-form');
  const lockPassword = document.getElementById('lock-password');
  const btnTogglePwd = document.getElementById('btn-toggle-lock-pwd');
  const lockCard = lockOverlay?.querySelector('.lock-card');
  const lockError = document.getElementById('lock-error-msg');
  
  if (isUnlocked) {
    // Proceed directly to load app
    loadAppData(true);
    return;
  }
  
  // Show lock overlay
  lockOverlay.classList.add('active');
  document.body.classList.add('modal-open');
  
  // Eye button show/hide password
  if (btnTogglePwd && lockPassword) {
    btnTogglePwd.onclick = () => {
      const isPwd = lockPassword.type === 'password';
      lockPassword.type = isPwd ? 'text' : 'password';
      btnTogglePwd.style.color = isPwd ? 'var(--primary-color)' : 'var(--text-light)';
    };
  }
  
  if (lockForm) {
    lockForm.onsubmit = (e) => {
      e.preventDefault();
      const pwd = lockPassword.value;
      
      if (pwd === "1Bnutaufiq!!") {
        // Correct password
        localStorage.setItem('expense_tracker_unlocked', 'true');
        lockOverlay.classList.remove('active');
        document.body.classList.remove('modal-open');
        ui.showToast('Akses terbuka. Selamat datang!', 'success');
        
        // Start app load
        loadAppData(true);
      } else {
        // Incorrect password
        lockPassword.value = '';
        if (lockError) lockError.textContent = 'Kata sandi salah!';
        
        // Trigger shake animation
        if (lockCard) {
          lockCard.classList.add('shake');
          setTimeout(() => {
            lockCard.classList.remove('shake');
          }, 500);
        }
      }
    };
  }
}

/* ==========================================================================
   EVENT LISTENERS INITIALIZATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // Bind Floating Add (+) Button
  if (ui.elements.btnAddTx) {
    ui.elements.btnAddTx.addEventListener('click', handleAddTransaction);
  }
  
  // Bind Floating History (Clock) Button
  if (ui.elements.btnHistory) {
    ui.elements.btnHistory.addEventListener('click', handleOpenHistory);
  }
  
  // Bind Copy Report Button
  if (ui.elements.btnCopyReport) {
    ui.elements.btnCopyReport.addEventListener('click', handleCopyReport);
  }
  
  // Bind Header Settings Gear
  if (ui.elements.btnSettings) {
    ui.elements.btnSettings.addEventListener('click', handleOpenSettings);
  }

  // Close modals when clicking overlay backdrop
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && overlay.id !== 'lock-screen') {
        ui.closeModal(overlay);
      }
    });
  });

  // Check access lock screen first
  initLockScreen();
});
