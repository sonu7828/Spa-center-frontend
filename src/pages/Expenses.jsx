/**
 * Expenses — Spa Operating Expenses Screen
 *
 * Capabilities:
 *   - Reception: Access Expenses, record new expense with required Note/Reason, view history.
 *   - Manager: Access Expenses, add expenses, view all, manage/edit, see who added each expense.
 *   - Technician & Cleaner: Blocked via RBAC.
 *
 * Source: OMEGA SPA — EXPENSES MODULE FINAL IMPLEMENTATION
 */

import { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  User,
  AlertCircle,
  X,
  Check,
  Pencil,
  Trash2,
  FileText,
  CreditCard,
  Building,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useExpenses, EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS } from '../context/ExpensesContext';
import { useAuth } from '../context/AuthContext';

export default function Expenses() {
  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  const {
    expenses,
    todayExpensesTotal,
    addExpense,
    updateExpense,
    deleteExpense,
  } = useExpenses();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Form states
  const todayStr = new Date().toISOString().slice(0, 10);
  const [formDate, setFormDate] = useState(todayStr);
  const [formCategory, setFormCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [formAmount, setFormAmount] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('CASH');
  const [formNote, setFormNote] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Open modal for new expense
  const openNewExpenseModal = () => {
    setEditingExpense(null);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormCategory(EXPENSE_CATEGORIES[0]);
    setFormAmount('');
    setFormPaymentMethod('CASH');
    setFormNote('');
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(false);
    setIsModalOpen(true);
  };

  // Open modal for editing (Manager only)
  const openEditExpenseModal = (exp) => {
    if (!isManager) return;
    setEditingExpense(exp);
    setFormDate(exp.date);
    setFormCategory(exp.category);
    setFormAmount(String(exp.amount));
    setFormPaymentMethod(exp.paymentMethod);
    setFormNote(exp.note || '');
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(false);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(false);
  };

  // Save handler with validation
  const handleSave = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage('');

    const trimmedNote = formNote.trim();
    if (!trimmedNote) {
      setErrorMessage('Please enter the reason for this expense.');
      return;
    }

    const numAmount = parseInt(String(formAmount).replace(/[^0-9]/g, ''), 10);
    if (!numAmount || numAmount <= 0) {
      setErrorMessage('Please enter a valid expense amount in FCFA.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingExpense && isManager) {
        if (updateExpense) {
          await updateExpense(editingExpense.id, {
            date: formDate,
            category: formCategory,
            amount: numAmount,
            paymentMethod: formPaymentMethod,
            note: trimmedNote,
          });
        }
        setSuccessMessage('Expense updated successfully.');
        setTimeout(() => {
          closeModal();
        }, 500);
      } else {
        // Add new expense
        const result = await addExpense({
          date: formDate,
          category: formCategory,
          amount: numAmount,
          paymentMethod: formPaymentMethod,
          note: trimmedNote,
          user,
        });

        if (!result || !result.success) {
          setErrorMessage(result?.error || 'Failed to save expense.');
          setIsSubmitting(false);
          return;
        }

        setSuccessMessage('Expense recorded successfully.');
        setTimeout(() => {
          closeModal();
        }, 500);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save expense.');
      setIsSubmitting(false);
    }
  };

  // Filtered expense history
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchesCategory =
        selectedCategory === 'ALL' || exp.category === selectedCategory;

      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        exp.category.toLowerCase().includes(q) ||
        exp.note.toLowerCase().includes(q) ||
        exp.paymentMethod.toLowerCase().includes(q) ||
        (exp.createdBy && exp.createdBy.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [expenses, selectedCategory, searchTerm]);

  // Format currency
  const formatFCFA = (val) =>
    typeof val === 'number' ? `${val.toLocaleString('en-US')} FCFA` : '0 FCFA';

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Expenses"
        subtitle="Normal spa operating expenses tracking and history."
        action={
          <Button onClick={openNewExpenseModal}>
            <Plus size={16} />
            New Expense
          </Button>
        }
      />

      {/* Top 3 Metric Cards Row — Equal Height & Same Width */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4 items-stretch">
        {/* Card 1: Authorized Roles */}
        <div className="bg-white border border-border rounded-[16px] p-4 sm:p-4.5 shadow-card flex items-center justify-between h-full">
          <div className="min-w-0 flex-1 pr-3">
            <p className="text-[11px] font-bold text-muted-gray uppercase tracking-wider mb-1">
              AUTHORIZED ROLES
            </p>
            <p className="text-base sm:text-lg font-bold text-charcoal truncate">
              Manager & Reception
            </p>
            <p className="text-xs text-muted-gray mt-1 truncate">
              Current User:{' '}
              <span className="font-semibold text-charcoal">
                {isManager
                  ? 'Manager (Full Management)'
                  : `${user?.name || 'Reception'} (Recording Only)`}
              </span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-[12px] bg-terracotta-soft border border-terracotta/20 flex items-center justify-center text-terracotta shrink-0">
            <Building size={20} />
          </div>
        </div>

        {/* Card 2: Expenses Today */}
        <div className="bg-white border border-border rounded-[16px] p-4 sm:p-4.5 shadow-card flex items-center justify-between h-full">
          <div className="min-w-0 flex-1 pr-3">
            <p className="text-[11px] font-bold text-muted-gray uppercase tracking-wider mb-1">
              EXPENSES TODAY
            </p>
            <p className="text-xl sm:text-2xl font-bold text-charcoal truncate">
              {formatFCFA(todayExpensesTotal)}
            </p>
          </div>
          <div className="w-11 h-11 rounded-[12px] bg-sage-soft border border-sage/20 flex items-center justify-center text-sage shrink-0">
            <DollarSign size={20} />
          </div>
        </div>

        {/* Card 3: Total Recorded Entries */}
        <div className="bg-white border border-border rounded-[16px] p-4 sm:p-4.5 shadow-card flex items-center justify-between h-full">
          <div className="min-w-0 flex-1 pr-3">
            <p className="text-[11px] font-bold text-muted-gray uppercase tracking-wider mb-1">
              TOTAL RECORDED ENTRIES
            </p>
            <p className="text-xl sm:text-2xl font-bold text-charcoal truncate">
              {expenses.length}
            </p>
          </div>
          <div className="w-11 h-11 rounded-[12px] bg-soft-cream border border-border flex items-center justify-center text-charcoal shrink-0">
            <Receipt size={20} />
          </div>
        </div>
      </div>

      {/* Expense History Section (Unified with Search & Category Filter) */}
      <div className="bg-white border border-border rounded-[16px] shadow-card overflow-hidden">
        {/* Header & Controls in One Single Section */}
        <div className="p-4 sm:p-5 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 bg-soft-cream/20">
          {/* Left: Title & Count */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-sage-soft border border-sage/30 flex items-center justify-center text-sage shrink-0">
              <Receipt size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-charcoal tracking-tight">
                Expense History
              </h2>
              <p className="text-xs text-muted-gray">
                Showing {filteredExpenses.length} of {expenses.length} records
              </p>
            </div>
          </div>

          {/* Right: Search Input & Category Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            <div className="relative w-full sm:w-64">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-gray pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search note, category, staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8.5 pr-3 py-2 bg-white border border-border rounded-[10px] text-xs sm:text-sm text-charcoal placeholder:text-muted-gray focus:outline-hidden focus:border-sage transition-colors shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Filter size={14} className="text-muted-gray shrink-0 hidden sm:block" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-white border border-border rounded-[10px] text-xs sm:text-sm text-charcoal focus:outline-hidden focus:border-sage transition-colors font-medium cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Categories</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-soft-cream border border-border flex items-center justify-center text-muted-gray mb-3">
              <Receipt size={22} />
            </div>
            <p className="text-sm font-semibold text-charcoal">No expenses found</p>
            <p className="text-xs text-muted-gray mt-1 max-w-sm">
              {searchTerm || selectedCategory !== 'ALL'
                ? 'Try adjusting your search query or category filter.'
                : 'Click "+ New Expense" to record normal spa operating costs.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: Professional Table Layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-soft-cream/60 border-b border-border/80 text-[11px] font-bold text-muted-gray uppercase tracking-wider">
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Description</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Created By</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-xs sm:text-sm">
                  {filteredExpenses.map((exp) => (
                    <tr
                      key={exp.id}
                      className="hover:bg-soft-cream/30 transition-colors"
                    >
                      <td className="px-5 py-4 whitespace-nowrap font-medium text-charcoal">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-muted-gray shrink-0" />
                          <span>{exp.date}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-sage-soft text-sage border border-sage/30">
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="max-w-md space-y-1">
                          <p className="text-xs sm:text-sm text-charcoal whitespace-pre-wrap leading-relaxed">
                            {exp.note}
                          </p>
                          <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold bg-soft-cream border border-border text-muted-gray">
                            {exp.paymentMethod}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-bold text-charcoal text-sm sm:text-base">
                          {formatFCFA(exp.amount)}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-xs text-charcoal">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <User size={13} className="text-muted-gray shrink-0" />
                            <span>{exp.createdBy || 'Staff'}</span>
                          </div>
                          {exp.createdAt && (
                            <span className="text-[10px] text-muted-gray block pl-4">
                              {new Date(exp.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        {isManager ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditExpenseModal(exp)}
                              className="p-1.5 rounded-[8px] hover:bg-soft-cream text-muted-gray hover:text-charcoal transition-colors cursor-pointer"
                              title="Edit Expense"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Delete this expense record?')) {
                                  deleteExpense(exp.id);
                                }
                              }}
                              className="p-1.5 rounded-[8px] hover:bg-terracotta-soft text-muted-gray hover:text-terracotta transition-colors cursor-pointer"
                              title="Delete Expense"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-gray text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: Clean Stacked Cards */}
            <div className="block md:hidden divide-y divide-border/60">
              {filteredExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-4 space-y-3 hover:bg-soft-cream/20 transition-colors"
                >
                  {/* Header: Category + Payment Method + Amount */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-sage-soft text-sage border border-sage/30">
                        {exp.category}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-soft-cream border border-border text-muted-gray">
                        {exp.paymentMethod}
                      </span>
                    </div>
                    <span className="text-base font-bold text-charcoal">
                      {formatFCFA(exp.amount)}
                    </span>
                  </div>

                  {/* Description / Note */}
                  <div className="bg-soft-cream/50 border border-border/60 rounded-[10px] p-3 text-xs text-charcoal">
                    <span className="font-semibold text-muted-gray block text-[10px] uppercase tracking-wider mb-0.5">
                      Description:
                    </span>
                    <p className="whitespace-pre-wrap leading-relaxed">{exp.note}</p>
                  </div>

                  {/* Footer: Date + Created By + Actions */}
                  <div className="flex items-center justify-between text-xs text-muted-gray pt-1">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-muted-gray" />
                        <span className="font-medium text-charcoal">{exp.date}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px]">
                        <User size={11} className="text-muted-gray" />
                        <span>Added by <strong className="text-charcoal">{exp.createdBy || 'Staff'}</strong></span>
                      </div>
                    </div>

                    {isManager && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditExpenseModal(exp)}
                          className="p-2 rounded-[8px] bg-soft-cream hover:bg-soft-cream/80 text-muted-gray hover:text-charcoal transition-colors cursor-pointer"
                          title="Edit Expense"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this expense record?')) {
                              deleteExpense(exp.id);
                            }
                          }}
                          className="p-2 rounded-[8px] bg-terracotta-soft hover:bg-terracotta-soft/80 text-muted-gray hover:text-terracotta transition-colors cursor-pointer"
                          title="Delete Expense"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal: Record / Edit Expense */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-[20px] shadow-2xl border border-border w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-soft-cream/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[10px] bg-sage-soft border border-sage/30 flex items-center justify-center text-sage">
                  <Receipt size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-charcoal">
                    {editingExpense ? 'Edit Expense Record' : 'Record Spa Expense'}
                  </h3>
                  <p className="text-xs text-muted-gray">
                    Normal operating expense details and mandatory reason.
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-[8px] hover:bg-soft-cream text-muted-gray hover:text-charcoal transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
              {errorMessage && (
                <div className="p-3 bg-terracotta-soft border border-terracotta/30 rounded-[10px] text-xs font-medium text-terracotta flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-success-soft border border-success/30 rounded-[10px] text-xs font-medium text-success flex items-center gap-2">
                  <Check size={15} className="shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1.5">
                  Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-soft-cream/40 border border-border rounded-[10px] text-xs sm:text-sm text-charcoal focus:outline-hidden focus:border-sage transition-colors"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1.5">
                  Expense Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-soft-cream/40 border border-border rounded-[10px] text-xs sm:text-sm text-charcoal focus:outline-hidden focus:border-sage transition-colors"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1.5">
                  Amount (FCFA)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="e.g. 25000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                    className="w-full pl-3.5 pr-14 py-2.5 bg-soft-cream/40 border border-border rounded-[10px] text-xs sm:text-sm text-charcoal focus:outline-hidden focus:border-sage transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-gray pointer-events-none">
                    FCFA
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {EXPENSE_PAYMENT_METHODS.map((method) => {
                    const isSelected = formPaymentMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setFormPaymentMethod(method)}
                        className={`py-2 px-2 text-xs font-semibold rounded-[10px] border transition-all text-center ${
                          isSelected
                            ? 'bg-sage text-white border-sage shadow-xs'
                            : 'bg-soft-cream/50 text-charcoal border-border hover:bg-soft-cream'
                        }`}
                      >
                        {method}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note / Reason for Expense (REQUIRED) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-charcoal">
                    Note / Reason for Expense <span className="text-terracotta">*</span>
                  </label>
                  <span className="text-2xs text-muted-gray">Required</span>
                </div>
                <textarea
                  rows={3}
                  value={formNote}
                  onChange={(e) => {
                    setFormNote(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Explain what was done or what issue resulted in this expense..."
                  className={`w-full px-3.5 py-2.5 bg-soft-cream/40 border rounded-[10px] text-xs sm:text-sm text-charcoal focus:outline-hidden transition-colors resize-none ${
                    errorMessage && !formNote.trim()
                      ? 'border-terracotta focus:border-terracotta'
                      : 'border-border focus:border-sage'
                  }`}
                />
              </div>

              {/* Added By preview */}
              <div className="pt-2 text-xs text-muted-gray flex items-center justify-between">
                <span>Added By:</span>
                <span className="font-semibold text-charcoal">
                  {user?.name || user?.username || (user?.role === 'manager' ? 'Manager' : 'Reception')}
                </span>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5">
                <Button type="button" variant="ghost" onClick={closeModal} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
