/**
 * RetailContext — Backend Integrated State for Retail Drinks & Cosmetics
 *
 * Connects to OMEGA SPA POS Backend (/api/v1/stock/retail):
 *   - Fetches live retail inventory from database (RetailProduct table)
 *   - Categorizes items into Drinks and Cosmetics
 *   - Supports adding retail products and refilling stock
 *   - Database is the single source of truth; zero mock data
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { stockApi } from '../services/api';
import { useAuth } from './AuthContext';

const RetailContext = createContext();

export function RetailProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [retailProducts, setRetailProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch real retail products from backend
  const refreshRetail = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setError(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await stockApi.getRetail();
      const products = res?.data?.products || [];
      if (Array.isArray(products)) {
        setRetailProducts(products);
      }
    } catch (err) {
      console.warn('Failed to fetch retail products from backend:', err.message);
      setError(err.message || 'Unable to connect to server');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshRetail();
    } else {
      setRetailProducts([]);
      setLoading(false);
    }
  }, [isAuthenticated, refreshRetail]);

  // Derive drinks & cosmetics
  const drinks = useMemo(() => {
    return retailProducts
      .filter((p) => String(p.category).toUpperCase() === 'DRINKS')
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        stock: p.quantity,
        quantity: p.quantity,
        active: p.isActive !== false,
        type: 'drink',
      }));
  }, [retailProducts]);

  const cosmetics = useMemo(() => {
    return retailProducts
      .filter((p) => String(p.category).toUpperCase() === 'COSMETICS')
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        stock: p.quantity,
        quantity: p.quantity,
        active: p.isActive !== false,
        type: 'cosmetic',
      }));
  }, [retailProducts]);

  // --- Drinks Actions ---
  const addDrink = useCallback(
    async ({ name, price, stock, active = true }) => {
      const cleanPrice = Math.max(0, parseInt(String(price || 0).replace(/[^0-9]/g, ''), 10) || 0);
      const cleanStock = Math.max(0, parseInt(String(stock || 0).replace(/[^0-9]/g, ''), 10) || 0);

      try {
        const res = await stockApi.createRetail({
          name: name.trim(),
          category: 'DRINKS',
          price: cleanPrice,
          quantity: cleanStock,
        });
        await refreshRetail();
        return res?.data || res;
      } catch (err) {
        console.error('Error adding retail drink:', err.message);
        throw err;
      }
    },
    [refreshRetail]
  );

  const updateDrink = useCallback(
    async (id, updates) => {
      // Local state optimistic update if needed
      setRetailProducts((prev) =>
        prev.map((d) => {
          if (String(d.id) !== String(id)) return d;
          return {
            ...d,
            name: updates.name !== undefined ? updates.name.trim() : d.name,
            price: updates.price !== undefined ? Math.max(0, parseInt(updates.price, 10) || 0) : d.price,
            quantity: updates.stock !== undefined ? Math.max(0, parseInt(updates.stock, 10) || 0) : d.quantity,
            isActive: updates.active !== undefined ? Boolean(updates.active) : d.isActive,
          };
        })
      );
    },
    []
  );

  const toggleDrinkActive = useCallback((id) => {
    setRetailProducts((prev) =>
      prev.map((d) => (String(d.id) === String(id) ? { ...d, isActive: !d.isActive } : d))
    );
  }, []);

  // --- Cosmetics Actions ---
  const addCosmetic = useCallback(
    async ({ name, price, stock, active = true }) => {
      const cleanPrice = Math.max(0, parseInt(String(price || 0).replace(/[^0-9]/g, ''), 10) || 0);
      const cleanStock = Math.max(0, parseInt(String(stock || 0).replace(/[^0-9]/g, ''), 10) || 0);

      try {
        const res = await stockApi.createRetail({
          name: name.trim(),
          category: 'COSMETICS',
          price: cleanPrice,
          quantity: cleanStock,
        });
        await refreshRetail();
        return res?.data || res;
      } catch (err) {
        console.error('Error adding retail cosmetic:', err.message);
        throw err;
      }
    },
    [refreshRetail]
  );

  const updateCosmetic = useCallback(
    async (id, updates) => {
      setRetailProducts((prev) =>
        prev.map((c) => {
          if (String(c.id) !== String(id)) return c;
          return {
            ...c,
            name: updates.name !== undefined ? updates.name.trim() : c.name,
            price: updates.price !== undefined ? Math.max(0, parseInt(updates.price, 10) || 0) : c.price,
            quantity: updates.stock !== undefined ? Math.max(0, parseInt(updates.stock, 10) || 0) : c.quantity,
            isActive: updates.active !== undefined ? Boolean(updates.active) : c.isActive,
          };
        })
      );
    },
    []
  );

  const toggleCosmeticActive = useCallback((id) => {
    setRetailProducts((prev) =>
      prev.map((c) => (String(c.id) === String(id) ? { ...c, isActive: !c.isActive } : c))
    );
  }, []);

  // --- Refill Action ---
  const refillRetailProduct = useCallback(
    async (id, quantity, reason = 'Restock') => {
      const res = await stockApi.refillRetail(id, { quantity: Number(quantity), reason });
      await refreshRetail();
      return res?.data || res;
    },
    [refreshRetail]
  );

  // --- Stock Deduction on Invoice Payment ---
  const deductRetailStock = useCallback(
    async (invoiceItems = []) => {
      if (!Array.isArray(invoiceItems) || invoiceItems.length === 0) return;

      // 1. Optimistic update in state immediately
      setRetailProducts((prev) =>
        prev.map((prod) => {
          const match = invoiceItems.find(
            (it) =>
              String(it.productId) === String(prod.id) ||
              String(it.id) === String(prod.id) ||
              (it.name && it.name.toLowerCase() === prod.name?.toLowerCase()) ||
              (it.service && it.service.toLowerCase() === prod.name?.toLowerCase())
          );
          if (match) {
            const qty = Math.max(1, parseInt(match.qty !== undefined ? match.qty : match.quantity, 10) || 1);
            return {
              ...prod,
              quantity: Math.max(0, (prod.quantity ?? 0) - qty),
            };
          }
          return prod;
        })
      );

      // 2. Call backend deduct API
      try {
        const payloadItems = [];
        for (const it of invoiceItems) {
          let prodId = it.productId || it.id;
          if (!prodId || !String(prodId).includes('-')) {
            const found = retailProducts.find(
              (p) =>
                (it.name && p.name.toLowerCase() === it.name.toLowerCase()) ||
                (it.service && p.name.toLowerCase() === it.service.toLowerCase())
            );
            if (found && String(found.id).includes('-')) {
              prodId = found.id;
            }
          }

          if (prodId && String(prodId).includes('-')) {
            const qty = Math.max(1, parseInt(it.qty !== undefined ? it.qty : it.quantity, 10) || 1);
            payloadItems.push({ productId: prodId, quantity: qty });
          }
        }

        if (payloadItems.length > 0) {
          await stockApi.deductRetail({ items: payloadItems });
        }
      } catch (err) {
        console.warn('Backend retail stock deduct note:', err.message);
      } finally {
        await refreshRetail();
      }
    },
    [retailProducts, refreshRetail]
  );

  return (
    <RetailContext.Provider
      value={{
        drinks,
        cosmetics,
        retailProducts,
        loading,
        error,
        refreshRetail,
        addDrink,
        updateDrink,
        toggleDrinkActive,
        addCosmetic,
        updateCosmetic,
        toggleCosmeticActive,
        refillRetailProduct,
        deductRetailStock,
      }}
    >
      {children}
    </RetailContext.Provider>
  );
}

export function useRetail() {
  return useContext(RetailContext);
}
