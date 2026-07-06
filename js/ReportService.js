import { BudgetService } from './BudgetService.js';
import { formatRupiah, formatMonthName } from './Utils.js';

export class ReportService {
  /**
   * Calculate summary statistics for a given month
   * @param {Object} settings 
   * @param {Array} transactions 
   * @returns {Object}
   */
  static calculateSummary(settings, transactions) {
    const salary = settings.salary || 0;
    const budgets = settings.budgets || {};

    let totalPengeluaran = 0; // Sum of non-tabungan transactions
    let sudahDitabung = 0;    // Sum of tabungan transactions

    // Group transactions by category key
    const categoryTransactions = {};
    
    // Initialize categories
    BudgetService.getAllCategories().forEach(cat => {
      categoryTransactions[cat.key] = [];
    });

    transactions.forEach(tx => {
      const key = BudgetService.getCategoryKey(tx.category);
      if (categoryTransactions[key]) {
        categoryTransactions[key].push(tx);
      } else {
        categoryTransactions['lainlain'] = categoryTransactions['lainlain'] || [];
        categoryTransactions['lainlain'].push(tx);
      }

      const amount = Number(tx.amount) || 0;
      totalPengeluaran += amount;

      if (BudgetService.isTabungan(key)) {
        sudahDitabung += amount;
      }
    });

    const sisaSaldo = salary - totalPengeluaran;
    const targetTabungan = budgets.tabungan || 0;
    const sisaTargetTabungan = Math.max(0, targetTabungan - sudahDitabung);

    return {
      salary,
      totalPengeluaran,
      sisaSaldo,
      targetTabungan,
      sudahDitabung,
      sisaTargetTabungan,
      categoryTransactions
    };
  }

  /**
   * Generate formatted text report for WhatsApp sharing
   * @param {string} yearMonth 
   * @param {Object} settings 
   * @param {Array} transactions 
   * @returns {string}
   */
  static generateWhatsAppReport(yearMonth, settings, transactions) {
    const summary = this.calculateSummary(settings, transactions);
    const monthLabel = formatMonthName(yearMonth).toUpperCase();

    let text = `*📅 REKAP PENGELUARAN BULAN ${monthLabel}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    const categories = BudgetService.getAllCategories();
    const categoryEmojis = {
      tabungan: '📈',
      kost: '🏠',
      makan: '🍔',
      bensin: '🚗',
      sabun: '💧',
      jalanjalan: '🧭',
      bucin: '💖',
      cadangan: '🛡️',
      lainlain: '❓'
    };
    
    categories.forEach((cat, index) => {
      const isTab = BudgetService.isTabungan(cat.key);
      const budgetVal = settings.budgets[cat.key] || 0;
      const txList = summary.categoryTransactions[cat.key] || [];
      const emoji = categoryEmojis[cat.key] || '❓';
      const label = isTab ? 'Target' : 'Budget';

      text += `*${index + 1}. ${emoji} ${cat.displayName.toUpperCase()} (${label}: ${formatRupiah(budgetVal)})*\n`;
      
      txList.forEach((tx) => {
        text += `• ${formatRupiah(tx.amount)} - ${tx.description}\n`;
      });
      
      let catTotal = 0;
      txList.forEach(tx => {
        catTotal += Number(tx.amount) || 0;
      });

      if (isTab) {
        text += `👉 _Sisa Target: ${formatRupiah(Math.max(0, budgetVal - catTotal))}_\n`;
      } else {
        const sisaBudget = budgetVal - catTotal;
        const overbudgetAlert = sisaBudget < 0 ? ' ⚠️' : '';
        text += `👉 _Total: ${formatRupiah(catTotal)} (Sisa: ${formatRupiah(sisaBudget)})${overbudgetAlert}_\n`;
      }

      text += `\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `*📊 RINGKASAN UTAMA*\n`;
    text += `💰 Gaji: *${formatRupiah(summary.salary)}*\n`;
    text += `💸 Total Pengeluaran: *${formatRupiah(summary.totalPengeluaran)}*\n`;
    text += `💵 Sisa Saldo: *${formatRupiah(summary.sisaSaldo)}*\n`;
    text += `📈 Sudah Ditabung: *${formatRupiah(summary.sudahDitabung)}* (Sisa Target: *${formatRupiah(summary.sisaTargetTabungan)}*)\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    return text;
  }
}
