import { DebtAccount, DebtInstallment, Transaction } from '../types';

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
 * - Bắt đầu vay: startDate (ví dụ: 05/08)
 * - Ngày đến hạn trong tháng: paymentDay (ví dụ: 12)
 * - Thời gian kỳ đầu = thời gian mượn + 1 tháng (nếu ngày bắt đầu nhỏ hơn ngày đến hạn, ví dụ mượn 05/08 hạn 12 -> kỳ 1 là 12/09)
 * - Nếu ngày bắt đầu >= ngày đến hạn (ví dụ mượn 20/08 hạn 12): hạn tháng 08 đã qua -> kỳ 1 là 12/09
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
  // Nếu ngày bắt đầu < ngày đến hạn hoặc >= ngày đến hạn, kỳ đầu luôn bắt đầu từ tháng kế tiếp (+1 tháng)
  const startOffset = d0 < day ? 1 : 1;
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

/**
 * Tính ngày đến hạn thanh toán thẻ tín dụng:
 * Quy tắc:
 * - Phải trả trước 1 ngày của ngày sao kê hàng tháng (statementDay - 1).
 * - Ví dụ ngày sao kê là 20: hạn thanh toán là ngày 19 hàng tháng.
 * - Nếu ngày chi tiêu < statementDay: Hạn thanh toán rơi vào ngày (statementDay - 1) của tháng hiện tại.
 * - Nếu ngày chi tiêu >= statementDay: Đã qua kỳ sao kê tháng hiện tại -> Hạn thanh toán rơi vào ngày (statementDay - 1) của tháng kế tiếp (+1 tháng).
 * - Xử lý đặc biệt nếu statementDay === 1: Trước 1 ngày là ngày cuối cùng của tháng trước đó.
 */
export function calcCreditCardDueDate(txDateStr: string, statementDay: number = 20): string {
  const parts = (txDateStr || '').split('-');
  const y0 = parseInt(parts[0]) || new Date().getFullYear();
  const m0 = (parseInt(parts[1]) || (new Date().getMonth() + 1)) - 1; // 0-indexed
  const d0 = parseInt(parts[2]) || new Date().getDate();

  const stmtDay = Math.max(1, Math.min(31, statementDay || 20));

  // Nếu ngày chi < ngày sao kê: chu kỳ kết thúc vào tháng hiện tại -> hạn trả là tháng hiện tại.
  // Nếu ngày chi >= ngày sao kê: chu kỳ kết thúc vào tháng kế tiếp -> hạn trả là tháng kế tiếp.
  const targetMonthTotal = d0 < stmtDay ? m0 : m0 + 1;

  const y = y0 + Math.floor(targetMonthTotal / 12);
  const m = ((targetMonthTotal % 12) + 12) % 12;

  // Ngày hạn trả = ngày sao kê - 1 ngày
  let dueDay = stmtDay - 1;
  if (dueDay === 0) {
    // Nếu ngày sao kê là ngày 1 -> Hạn trả là ngày cuối cùng của tháng trước đó
    const prevMonthTotal = targetMonthTotal - 1;
    const py = y0 + Math.floor(prevMonthTotal / 12);
    const pm = ((prevMonthTotal % 12) + 12) % 12;
    const lastDayPrevMonth = new Date(py, pm + 1, 0).getDate();
    return `${py}-${String(pm + 1).padStart(2, '0')}-${String(lastDayPrevMonth).padStart(2, '0')}`;
  }

  const maxDayInMonth = new Date(y, m + 1, 0).getDate();
  const d = Math.min(dueDay, maxDayInMonth);

  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function checkCreditCardDueStatus(
  tx: Transaction,
  statementDay: number = 20
): {
  isCreditCard: boolean;
  isPaid: boolean;
  isDueSoon: boolean;
  isOverdue: boolean;
  dueDate: string;
} {
  if (tx.wallet !== 'Thẻ tín dụng' || tx.type !== 'expense') {
    return { isCreditCard: false, isPaid: true, isDueSoon: false, isOverdue: false, dueDate: '' };
  }

  const dueDate = tx.creditCardDueDate || calcCreditCardDueDate(tx.date, statementDay);
  const isPaid = !!tx.isCreditCardPaid;

  if (isPaid) {
    return { isCreditCard: true, isPaid: true, isDueSoon: false, isOverdue: false, dueDate };
  }

  const now = new Date();
  const [dy, dm, dd] = dueDate.split('-').map(Number);
  const dueDateTime = new Date(dy, dm - 1, dd).getTime();
  const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const diffDays = Math.round((dueDateTime - todayTime) / (1000 * 60 * 60 * 24));

  const isOverdue = diffDays < 0;
  const isDueSoon = diffDays >= 0 && diffDays <= 1; // 1 ngày trước hạn hoặc đúng hạn

  return {
    isCreditCard: true,
    isPaid: false,
    isDueSoon,
    isOverdue,
    dueDate,
  };
}


