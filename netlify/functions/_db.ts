import mongoose from 'mongoose';

let cachedDb: typeof mongoose | null = null;

export async function connectDB() {
  if (cachedDb) return cachedDb;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined');
  }
  cachedDb = await mongoose.connect(uri);
  return cachedDb;
}

const TransactionSchema = new mongoose.Schema({
  id: { type: String, default: () => 'tx-' + Math.random().toString(36).substr(2, 9) },
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  date: { type: String, required: true },
  description: { type: String, default: '' },
  wallet: { type: String, default: 'Ngân hàng' },
  isRecurring: { type: Boolean, default: false },
  frequency: { type: String, enum: ['none', 'weekly', 'monthly'], default: 'none' }
}, { versionKey: false });

const BudgetSchema = new mongoose.Schema({
  category: { type: String, required: true, unique: true },
  limit: { type: Number, required: true },
  spent: { type: Number, default: 0 }
}, { versionKey: false });

const DebtInstallmentSchema = new mongoose.Schema({
  index: { type: Number, required: true },
  dueDate: { type: String, required: true },
  amount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  paidDate: { type: String, default: null },
  status: { type: String, enum: ['pending', 'paid', 'partial'], default: 'pending' }
}, { _id: false });

const DebtSchema = new mongoose.Schema({
  id: { type: String, default: () => 'debt-' + Math.random().toString(36).substr(2, 9) },
  type: { type: String, enum: ['installment', 'credit_card', 'friend'], required: true },
  name: { type: String, required: true },
  originalAmount: { type: Number, required: true },
  currentBalance: { type: Number, required: true },
  monthlyPayment: { type: Number, required: true },
  interestRate: { type: Number, default: 0 },
  paymentDay: { type: Number, default: 5 },
  startDate: { type: String, required: true },
  maturityDate: { type: String, required: true },
  totalInstallments: { type: Number, required: true },
  paidInstallments: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'settled'], default: 'active' },
  installments: [DebtInstallmentSchema],
  notes: { type: String, default: '' }
}, { versionKey: false });

const SavingsGoalSchema = new mongoose.Schema({
  id: { type: String, default: () => 'save-' + Math.random().toString(36).substr(2, 9) },
  title: { type: String, required: true },
  goalAmount: { type: Number, required: true },
  currentAmount: { type: Number, default: 0 },
  targetDate: { type: String, required: true },
  icon: { type: String, default: 'piggy' }
}, { versionKey: false });

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  icon: { type: String, default: 'Tag' },
  color: { type: String, default: 'slate' },
  order: { type: Number, default: 0 }
}, { versionKey: false });

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const ChatMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const SalaryLeaveDaySchema = new mongoose.Schema({
  count: { type: Number, default: 0 },
  type: { type: String, enum: ['annual', 'personal', 'unpaid'], default: 'personal' }
}, { _id: false });

const SalaryConfigSchema = new mongoose.Schema({
  grossSalary: { type: Number, default: 0 },
  netSalary: { type: Number, default: 0 },
  receiveDay: { type: Number, default: 1, min: 1, max: 31 },
  workDays: { type: Number, default: 26 },
  leaveDays: [SalaryLeaveDaySchema],
  lastAutoAddMonth: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { versionKey: false });

const FixedExpenseCategorySchema = new mongoose.Schema({
  id: { type: String, default: () => 'fec-' + Math.random().toString(36).substr(2, 9) },
  name: { type: String, required: true },
  icon: { type: String, default: 'cash' },
  color: { type: String, default: 'slate' }
}, { versionKey: false });

const FixedExpenseTaskSchema = new mongoose.Schema({
  id: { type: String, default: () => 'fet-' + Math.random().toString(36).substr(2, 9) },
  categoryId: { type: String, required: true },
  categoryName: { type: String, default: '' },
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  month: { type: String, required: true },
  note: { type: String, default: '' }
}, { versionKey: false });

const DiaryEntrySchema = new mongoose.Schema({
  id: { type: String, default: () => 'diary-' + Math.random().toString(36).substr(2, 9) },
  date: { type: String, required: true },
  content: { type: String, required: true },
  mood: { type: String, enum: ['positive', 'negative', 'neutral', 'excited', 'sad', 'angry', 'grateful'], default: 'neutral' },
  location: { type: String, default: '' },
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const UserProfileSchema = new mongoose.Schema({
  fullName: { type: String, default: 'Lâm Huệ Trung' },
  dob: { type: String, default: '08/01/2003' },
  hometown: { type: String, default: 'Tiểu Cần - Trà Vinh' },
  livingContext: { type: String, default: 'Ở quê (Tiểu Cần - Trà Vinh), di chuyển xa để đi làm, áp lực gia đình và tiền bạc thường trực.' },
  currentJob: { type: String, default: 'Lập trình viên tại Rynan Technologies' },
  position: { type: String, default: 'Lập trình UI/UX và API' },
  skills: {
    strongest: { type: String, default: 'Node.js' },
    foundation: { type: String, default: 'Từng có nền tảng và tư duy tốt về UI/UX kết hợp API' },
    usedTech: { type: [String], default: ['Node.js', 'NestJS', 'Next.js', 'ReactJS', 'MongoDB', 'SQL', 'GIS', 'Openplayer'] },
    companyTech: { type: [String], default: ['Laravel PHP 7.3', 'Vue 2'] },
    currentWorry: { type: String, default: 'Cảm giác bị "mất gốc" Node.js vì môi trường hiện tại không còn phù hợp định hướng dài hạn' }
  },
  education: {
    school: { type: String, default: 'Sinh viên khóa 21 Đại học Trà Vinh' },
    status: { type: String, default: 'Chưa làm lễ tốt nghiệp, đã lấy bằng tốt nghiệp' }
  },
  avatar: { type: String, default: '' },
  phone: { type: String, default: '' },
  emails: { type: [String], default: [] },
  customFields: [{
    id: { type: String },
    label: { type: String },
    value: { type: String },
    category: { type: String, default: 'Khác' }
  }],
  updatedAt: { type: Date, default: Date.now }
}, { versionKey: false });

export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
export const Budget = mongoose.models.Budget || mongoose.model('Budget', BudgetSchema);
export const Debt = mongoose.models.Debt || mongoose.model('Debt', DebtSchema);
export const SavingsGoal = mongoose.models.SavingsGoal || mongoose.model('SavingsGoal', SavingsGoalSchema);
export const CategoryModel = mongoose.models.Category || mongoose.model('Category', CategorySchema);
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);
export const SalaryConfig = mongoose.models.SalaryConfig || mongoose.model('SalaryConfig', SalaryConfigSchema);
export const FixedExpenseCategory = mongoose.models.FixedExpenseCategory || mongoose.model('FixedExpenseCategory', FixedExpenseCategorySchema);
export const FixedExpenseTask = mongoose.models.FixedExpenseTask || mongoose.model('FixedExpenseTask', FixedExpenseTaskSchema);
export const DiaryEntry = mongoose.models.DiaryEntry || mongoose.model('DiaryEntry', DiaryEntrySchema);
export const UserProfile = mongoose.models.UserProfile || mongoose.model('UserProfile', UserProfileSchema);

const AIConfigSchema = new mongoose.Schema({
  model: { type: String, default: 'google/gemini-2.5-flash' },
  apiKey: { type: String, default: '' },
  baseUrl: { type: String, default: 'https://openrouter.ai/api/v1' },
  lastTestedAt: { type: String, default: '' },
  testStatus: { type: String, default: 'not_tested' },
  testMessage: { type: String, default: '' }
}, { versionKey: false });

export const AIConfig = mongoose.models.AIConfig || mongoose.model('AIConfig', AIConfigSchema);

