import { DebtAccount, DebtInstallment } from '../types';

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
 * Tính số tiền mỗi kỳ trả góp từ gốc, lãi suất % tổng và tổng số kỳ
 */
export function calcInstallmentAmount(
  originalAmount: number,
  interestRate: number,
  totalInstallments: number
): number {
  if (totalInstallments <= 0) return 0;
  if (interestRate <= 0) {
    return Math.round(originalAmount / totalInstallments);
  }
  const totalWithInterest = originalAmount * (1 + interestRate / 100);
  return Math.round(totalWithInterest / totalInstallments);
}

/**
 * Tự động tính lãi suất (%) từ số tiền gốc, số tiền trả mỗi kỳ và tổng số kỳ
 * Ví dụ: Gốc 5tr, 3 kỳ x 1.785.000 = 5.355.000đ -> Lãi = 355k -> Lãi suất = 7.1%
 */
export function calcInterestRate(
  originalAmount: number,
  monthlyPayment: number,
  totalInstallments: number
): number {
  if (originalAmount <= 0 || totalInstallments <= 0 || monthlyPayment <= 0) {
    return 0;
  }
  const totalPayment = monthlyPayment * totalInstallments;
  if (totalPayment <= originalAmount) {
    return 0;
  }
  const interest = totalPayment - originalAmount;
  const rate = (interest / originalAmount) * 100;
  return Number(rate.toFixed(2));
}

/**
 * Tính ngày đến hạn chính xác cho kỳ thứ index (0-indexed)
 * Quy tắc:
 * - Bắt đầu vay: startDate (ví dụ: 12/08)
 * - Ngày đến hạn trong tháng: paymentDay (ví dụ: 12)
 * - Nếu ngày bắt đầu >= ngày đến hạn: Kỳ 1 (index 0) rơi vào tháng tiếp theo (12/09)
 * - Nếu ngày bắt đầu < ngày đến hạn: Kỳ 1 rơi vào cùng tháng bắt đầu (ví dụ vay 02/08 hạn 12 -> kỳ 1 là 12/08)
 */
export function calcInstallmentDueDate(
  startDateStr: string,
  paymentDay: number,
  installmentIndex: number
): string {
  const parts = (startDateStr || '').split('-');
  const y0 = parseInt(parts[0]) || new Date().getFullYear();
  const m0 = (parseInt(parts[1]) || (new Date().getMonth() + 1)) - 1; // 0-indexed
  const d0 = parseInt(parts[2]) || new Date().getDate();

  const day = Math.max(1, Math.min(31, paymentDay || 5));
  const startOffset = d0 >= day ? 1 : 0;
  const targetMonthTotal = m0 + startOffset + installmentIndex;

  const y = y0 + Math.floor(targetMonthTotal / 12);
  const m = targetMonthTotal % 12;
  const maxDayInMonth = new Date(y, m + 1, 0).getDate();
  const d = Math.min(day, maxDayInMonth);

  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Sinh danh sách tất cả các kỳ trả góp của khoản nợ
 */
export function generateDebtInstallments(
  originalAmount: number,
  monthlyPayment: number,
  totalInstallments: number,
  paidInstallments: number,
  startDateStr: string,
  paymentDay: number
): DebtInstallment[] {
  const total = Math.max(1, totalInstallments || 1);
  const paid = Math.max(0, Math.min(total, paidInstallments || 0));
  const eachAmount = monthlyPayment > 0
    ? monthlyPayment
    : Math.round(originalAmount / total);

  return Array.from({ length: total }, (_, i) => {
    const dueDate = calcInstallmentDueDate(startDateStr, paymentDay, i);
    const isPaid = i < paid;
    return {
      index: i,
      dueDate,
      amount: eachAmount,
      paidAmount: isPaid ? eachAmount : 0,
      paidDate: isPaid ? dueDate : undefined,
      status: isPaid ? 'paid' : 'pending',
    };
  });
}

/**
 * Lấy kỳ chưa trả tiếp theo
 */
export function getNextUnpaidInstallment(
  installments: DebtInstallment[] = []
): DebtInstallment | undefined {
  return installments.find(i => i.status === 'pending' || i.status === 'partial');
}

