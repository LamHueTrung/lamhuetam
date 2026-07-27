import { DebtAccount } from '../types';

/**
 * Tính số dư nợ còn lại bằng tổng số tiền (gốc + lãi nếu có) chưa thanh toán
 * từ các kỳ trả góp ở trạng thái pending hoặc partial.
 */
export function calcRemainingBalance(debt: DebtAccount): number {
  if (!debt.installments || debt.installments.length === 0) {
    return debt.currentBalance; // fallback
  }
  return debt.installments
    .filter(i => i.status !== 'paid')
    .reduce((s, i) => s + (i.amount - (i.paidAmount || 0)), 0);
}

/**
 * Tính tổng số tiền phải trả của toàn bộ khoản nợ (tổng gốc + tổng lãi)
 */
export function calcTotalDue(debt: DebtAccount): number {
  if (!debt.installments || debt.installments.length === 0) {
    return debt.originalAmount;
  }
  return debt.installments.reduce((s, i) => s + i.amount, 0);
}

/**
 * Tính tổng số tiền thực tế đã trả của khoản nợ
 */
export function calcTotalPaid(debt: DebtAccount): number {
  if (!debt.installments || debt.installments.length === 0) {
    return 0;
  }
  return debt.installments.reduce((s, i) => s + (i.paidAmount || 0), 0);
}

/**
 * Tính tỷ lệ phần trăm đã trả nợ dựa trên số tiền đã thanh toán / tổng số tiền phải trả
 */
export function calcPaidPercent(debt: DebtAccount): number {
  const totalDue = calcTotalDue(debt);
  const totalPaid = calcTotalPaid(debt);
  return totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;
}

/**
 * Tính số tiền mỗi kỳ trả góp (gốc + lãi tính theo công thức Flat Interest Rate)
 */
export function calcInstallmentAmount(
  originalAmount: number,
  interestRate: number,
  totalInstallments: number
): number {
  if (interestRate <= 0) {
    return Math.round(originalAmount / totalInstallments);
  }
  // Công thức Flat Rate:
  // Tổng lãi = originalAmount * (lãi suất % năm) * (số năm vay)
  // Tổng thanh toán = originalAmount + Tổng lãi
  const years = totalInstallments / 12;
  const totalInterest = originalAmount * (interestRate / 100) * years;
  return Math.round((originalAmount + totalInterest) / totalInstallments);
}
