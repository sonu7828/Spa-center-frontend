/**
 * ExpensesContext — Spa Operating Expenses State Management
 *
 * Connected to OMEGA SPA POS Backend (/api/v1/expenses):
 *   - Categories: Electricity, Water, Generator Fuel / Gas, Maintenance, Repairs, Rent, Cleaning Supplies, Other
 *   - Payment Methods: CASH, MTN MOMO, ORANGE MONEY
 *   - Required fields: Date, Category, Amount, Payment Method, Note / Reason
 *   - Tracks createdBy (user name) and createdByUserId
 *   - Connects to Daily Close for today's operating expenses total
 *   - 100% database backed persistence
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { expensesApi } from '../services/api';
import { useAuth } from './AuthContext';

const ExpensesContext = createContext(null);

export const EXPENSE_CATEGORIES = [
  'Electricity',
  'Water',
  'Generator Fuel / Gas',
  'Maintenance',
  'Repairs',
  'Rent',
  'Cleaning Supplies',
  'Other',
];

export const EXPENSE_PAYMENT_METHODS = [
  'CASH',
  'MTN MOMO',
  'ORANGE MONEY',
];

export function ExpensesProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshExpenses = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setError(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await expensesApi.getAll();
      const list = res?.data || [];
      if (Array.isArray(list)) {
        setExpenses(list);
      }
    } catch (err) {
      console.warn('Failed to fetch expenses from backend:', err.message);
      setError(err.message || 'Unable to connect to server');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshExpenses();
    } else {
      setExpenses([]);
      setLoading(false);
    }
  }, [isAuthenticated, refreshExpenses]);

  // Add new expense with strict validation
  const addExpense = useCallback(
    async ({ date, category, amount, paymentMethod, note, user }) => {
      const trimmedNote = (note || '').trim();
      if (!trimmedNote) {
        return {
          success: false,
          error: 'Please enter the reason for this expense.',
        };
      }

      const numAmount = typeof amount === 'number' ? amount : parseInt(String(amount || '').replace(/[^0-9]/g, ''), 10);
      if (!numAmount || numAmount <= 0) {
        return {
          success: false,
          error: 'Please enter a valid expense amount.',
        };
      }

      if (!category) {
        return {
          success: false,
          error: 'Please select a valid expense category.',
        };
      }

      const validMethod = (paymentMethod || 'CASH').toUpperCase();
      const todayStr = new Date().toISOString().slice(0, 10);

      try {
        const res = await expensesApi.create({
          date: date || todayStr,
          category,
          amount: numAmount,
          paymentMethod: validMethod,
          note: trimmedNote,
        });

        await refreshExpenses();

        return {
          success: true,
          expense: res?.data || res,
        };
      } catch (err) {
        return {
          success: false,
          error: err.message || 'Failed to save expense to database.',
        };
      }
    },
    [refreshExpenses]
  );

  // Delete expense (Manager capability)
  const deleteExpense = useCallback(
    async (id) => {
      try {
        await expensesApi.delete(id);
        await refreshExpenses();
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [refreshExpenses]
  );

  // Calculate today's total expenses for Daily Close
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayExpenses = useMemo(() => {
    return expenses.filter((e) => e.date === todayStr);
  }, [expenses, todayStr]);

  const todayExpensesTotal = useMemo(() => {
    return todayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [todayExpenses]);

  return (
    <ExpensesContext.Provider
      value={{
        expenses,
        loading,
        error,
        refreshExpenses,
        addExpense,
        deleteExpense,
        todayExpenses,
        todayExpensesTotal,
      }}
    >
      {children}
    </ExpensesContext.Provider>
  );
}

export function useExpenses() {
  const context = useContext(ExpensesContext);
  if (!context) {
    throw new Error('useExpenses must be used within an ExpensesProvider');
  }
  return context;
}
