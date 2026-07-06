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
      if (BudgetService.isTabungan(key)) {
        sudahDitabung += amount;
      } else {
        totalPengeluaran += amount;
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

    let text = `📅 PENGELUARAN BULAN ${monthLabel}\n`;
    text += `====================================\n\n`;

    const categories = BudgetService.getAllCategories();
    
    categories.forEach((cat, index) => {
      const isTab = BudgetService.isTabungan(cat.key);
      const budgetVal = settings.budgets[cat.key] || 0;
      const txList = summary.categoryTransactions[cat.key] || [];

      text += `${index + 1}. ${cat.displayName.toUpperCase()}\n\n`;
      
      txList.forEach((tx, i) => {
        const letter = String.fromCharCode(97 + i); // a, b, c...
        text += `${letter}. ${formatRupiah(tx.amount)} - ${tx.description}\n`;
      });
      
      if (txList.length > 0) {
        text += `\n`;
      }

      if (isTab) {
        text += `Sisa Target:\n${formatRupiah(summary.sisaTargetTabungan)}\n`;
      } else {
        let catTotal = 0;
        txList.forEach(tx => {
          catTotal += Number(tx.amount) || 0;
        });
        const sisaBudget = budgetVal - catTotal;
        text += `Total:\n${formatRupiah(catTotal)}\n\n`;
        text += `Sisa Budget:\n${formatRupiah(sisaBudget)}\n`;
      }

      // Separate with --- unless it's the last category
      if (index < categories.length - 1) {
        text += `------------------------------------\n\n`;
      }
    });

    text += `====================================\n\n`;
    text += `📊 RINGKASAN\n\n`;
    text += `Gaji\n${formatRupiah(summary.salary)}\n\n`;
    text += `Total Pengeluaran\n${formatRupiah(summary.totalPengeluaran)}\n\n`;
    text += `Sisa Saldo\n${formatRupiah(summary.sisaSaldo)}\n\n`;
    text += `Target Tabungan\n${formatRupiah(summary.targetTabungan)}\n\n`;
    text += `Sudah Ditabung\n${formatRupiah(summary.sudahDitabung)}\n\n`;
    text += `Sisa Target\n${formatRupiah(summary.sisaTargetTabungan)}`;

    return text;
  }
}
