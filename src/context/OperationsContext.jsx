/**
 * OperationsContext — Real Backend Integrated operations & stock state
 *
 * Connects to OMEGA SPA POS Backend (/api/v1/stock):
 *   - Service Stock inventory loaded from GET /api/v1/stock
 *   - Stock Refill via POST /api/v1/stock/:id/refill
 *   - Stock Activity & Audit History from GET /api/v1/stock/activity
 *   - Stock Creation via POST /api/v1/stock
 *   - Stock Updates via PATCH /api/v1/stock/:id
 *   - Automatic Stock Deduction on service completion (backend & local sync)
 *   - Service Consumption Rules (Manager-configurable)
 *   - Stock Reconciliation (Actual vs Expected Stock check)
 *   - Estimated Days Left (Current Stock ÷ Average Daily Usage)
 *   - Low Stock Alert threshold (Manager-editable)
 *   - Daily financial totals (CA Total, Cash, MTN MoMo, Orange Money, Clients count)
 *   - Technician daily revenue breakdown
 *   - Completed service transactions log
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { stockApi } from '../services/api';
import { useAuth } from './AuthContext';

const OperationsContext = createContext();

// Initial Service Consumption Rules (Manager-configurable fallback rules)
const initialConsumptionRules = [
  {
    serviceName: 'Deep Tissue Massage',
    rules: [
      { productName: 'Massage Oil', quantity: 20, unit: 'ml' },
      { productName: 'Towel Pack', quantity: 1, unit: 'pcs' },
    ],
  },
  {
    serviceName: 'Classic Facial',
    rules: [
      { productName: 'Facial Cleanser', quantity: 10, unit: 'ml' },
      { productName: 'Face Mask', quantity: 15, unit: 'g' },
      { productName: 'Cotton Pads', quantity: 4, unit: 'pcs' },
    ],
  },
  {
    serviceName: 'Gel Nails',
    rules: [
      { productName: 'OPI Gel Polish', quantity: 5, unit: 'ml' },
      { productName: 'Cotton Pads', quantity: 2, unit: 'pcs' },
    ],
  },
  {
    serviceName: 'Gel Manicure',
    rules: [
      { productName: 'OPI Gel Polish', quantity: 5, unit: 'ml' },
      { productName: 'Cotton Pads', quantity: 2, unit: 'pcs' },
    ],
  },
  {
    serviceName: 'Pedicure Spa',
    rules: [
      { productName: 'Massage Oil', quantity: 10, unit: 'ml' },
      { productName: 'Towel Pack', quantity: 1, unit: 'pcs' },
    ],
  },
  {
    serviceName: 'Massage',
    rules: [
      { productName: 'Massage Oil', quantity: 20, unit: 'ml' },
      { productName: 'Towel Pack', quantity: 1, unit: 'pcs' },
    ],
  },
  {
    serviceName: 'Facial',
    rules: [
      { productName: 'Facial Cleanser', quantity: 10, unit: 'ml' },
      { productName: 'Face Mask', quantity: 15, unit: 'g' },
      { productName: 'Cotton Pads', quantity: 4, unit: 'pcs' },
    ],
  },
];

const initialDailyTotals = {
  caTotal: 0,
  cash: 0,
  mtnMomo: 0,
  orangeMoney: 0,
  clientCount: 0,
};

const initialTechRevenue = {};
const initialCompletedServices = [];

function formatActivity(act) {
  const d = new Date(act.createdAt);
  const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateTime = `${dateStr} ${timeStr}`;

  let typeFormatted = act.type;
  if (act.type === 'SERVICE_USAGE') {
    typeFormatted = 'ADJUSTMENT';
  } else if (act.type === 'STOCK_CHECK') {
    typeFormatted = 'STOCK CHECK';
  }

  const qtyNum = Number(act.quantity) || 0;
  const isNegative = act.type === 'SERVICE_USAGE' || act.type === 'ADJUSTMENT';

  return {
    id: act.id,
    dateTime,
    productName: act.serviceStock?.name || 'Stock Item',
    type: act.type === 'REFILL' ? 'REFILL' : typeFormatted,
    quantity: isNegative ? -Math.abs(qtyNum) : Math.abs(qtyNum),
    unit: act.serviceStock?.unit || 'ml',
    reason: act.reason || (act.type === 'SERVICE_USAGE' ? 'Service Consumption' : '—'),
    note: act.reason || '—',
    performedBy:
      act.createdBy?.staffProfile?.name ||
      (act.createdBy?.email ? act.createdBy.email.split('@')[0] : 'Manager'),
    beforeStock: undefined,
    afterStock: undefined,
  };
}

export function OperationsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  // Service stock items loaded from backend
  const [serviceStock, setServiceStock] = useState([]);
  const [isLoadingStock, setIsLoadingStock] = useState(true);
  const [stockError, setStockError] = useState(null);

  // Dynamic service consumption rules
  const [consumptionRules, setConsumptionRules] = useState(initialConsumptionRules);

  // Consumption log (populated from backend activities & local usage)
  const [consumptionLog, setConsumptionLog] = useState([]);

  // Low stock threshold in Days Left (Manager-editable, default: 3)
  const [lowStockThresholdDays, setLowStockThresholdDays] = useState(3);

  // Stock check reconciliation result (null if no check performed)
  const [latestReconciliation, setLatestReconciliation] = useState(null);

  // Stock audit log for Refill, Adjustment, Stock Check
  const [stockAuditLog, setStockAuditLog] = useState([]);

  // Financial & completed service state
  const [dailyTotals, setDailyTotals] = useState(initialDailyTotals);
  const [techRevenue, setTechRevenue] = useState(initialTechRevenue);
  const [completedServices, setCompletedServices] = useState(initialCompletedServices);
  const [retailSales, setRetailSales] = useState([]);
  // Track appointments that already had their service stock deducted (idempotency guard)
  const [deductedAptIds, setDeductedAptIds] = useState(() => new Set());

  // Derived legacy `stock` object for backwards compatibility: { [name]: quantity }
  const stock = useMemo(() => {
    const map = {};
    serviceStock.forEach((p) => {
      map[p.name] = p.quantity;
    });
    return map;
  }, [serviceStock]);

  // Load stock items and activity history from backend
  const refreshStock = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoadingStock(false);
      return;
    }
    try {
      setIsLoadingStock(true);
      setStockError(null);
      const [stockRes, actRes] = await Promise.all([
        stockApi.getAll({ limit: 100 }),
        stockApi.getActivity({ limit: 100 }),
      ]);

      const rawStock = stockRes?.data?.stock || [];
      const mapped = rawStock.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category || 'General',
        quantity: Number(p.quantity) || 0,
        unit: p.unit || 'ml',
        active: p.isActive !== false,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
      setServiceStock(mapped);

      const rawActivities = actRes?.data?.activities || [];
      const mappedActivities = rawActivities.map(formatActivity);
      setStockAuditLog(mappedActivities);

      // Populate consumption log from backend service usages
      const usages = rawActivities
        .filter((a) => a.type === 'SERVICE_USAGE')
        .map((a) => ({
          id: a.id,
          serviceName: 'Service',
          productName: a.serviceStock?.name || '',
          quantity: Math.abs(Number(a.quantity)),
          unit: a.serviceStock?.unit || 'ml',
          date: new Date(a.createdAt).toISOString().split('T')[0],
        }));
      setConsumptionLog(usages);
    } catch (err) {
      console.error('Failed to load stock data from backend:', err);
      setStockError(err?.message || 'Failed to load stock inventory');
    } finally {
      setIsLoadingStock(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshStock();
    } else {
      setIsLoadingStock(false);
    }
  }, [isAuthenticated, refreshStock]);

  // Check if an appointment was already closed
  const isAppointmentClosed = useCallback(
    (appointmentId) =>
      completedServices.some((s) => s.appointmentId === Number(appointmentId)),
    [completedServices]
  );

  // Check if a specific service line was already closed (using appointmentServiceId)
  const isServiceClosed = useCallback(
    (appointmentServiceId, appointmentId) => {
      if (appointmentServiceId) {
        return completedServices.some((s) => s.appointmentServiceId === String(appointmentServiceId));
      }
      return appointmentId !== undefined && appointmentId !== null
        ? completedServices.some((s) => s.appointmentId === Number(appointmentId))
        : false;
    },
    [completedServices]
  );

  // Calculate Average Daily Usage and Days Left for a product
  const getProductMetrics = useCallback(
    (productName) => {
      const prod = serviceStock.find(
        (p) => p.name.toLowerCase() === productName?.toLowerCase()
      );
      if (!prod) return { currentStock: 0, avgDailyUsage: 0, daysLeft: null };

      // Find all consumption log entries for this product
      const entries = consumptionLog.filter(
        (c) => c.productName.toLowerCase() === prod.name.toLowerCase()
      );

      if (entries.length === 0) {
        return {
          currentStock: prod.quantity,
          avgDailyUsage: 0,
          daysLeft: null, // "—" when not enough history
        };
      }

      // Count distinct dates in the log (or at least 1 day)
      const distinctDates = new Set(entries.map((c) => c.date));
      const daysCount = Math.max(1, distinctDates.size);

      const totalConsumed = entries.reduce((sum, c) => sum + (c.quantity || 0), 0);
      const avgDailyUsage = Math.round((totalConsumed / daysCount) * 10) / 10;

      const daysLeft =
        avgDailyUsage > 0 ? Math.round(prod.quantity / avgDailyUsage) : null;

      return {
        currentStock: prod.quantity,
        avgDailyUsage,
        daysLeft,
      };
    },
    [serviceStock, consumptionLog]
  );

  // Add stock (refill - known stock coming IN) via backend API
  const addStock = useCallback(
    async (productName, quantity, note = '', performedBy = 'Manager') => {
      const qty = parseInt(quantity, 10);
      if (!productName || isNaN(qty) || qty <= 0) return false;

      const prod = serviceStock.find(
        (p) => p.name.toLowerCase() === productName.toLowerCase()
      );
      if (!prod) return false;

      try {
        if (prod.id && typeof prod.id === 'string') {
          await stockApi.refill(prod.id, {
            quantity: qty,
            reason: (note || '').trim() || 'Stock replenishment',
          });
        }
        await refreshStock();
        return true;
      } catch (err) {
        console.error('Backend refill failed, applying local fallback:', err);
        const before = prod.quantity;
        const after = before + qty;
        const targetUnit = prod.unit;

        setServiceStock((prev) =>
          prev.map((p) =>
            p.name.toLowerCase() === productName.toLowerCase()
              ? { ...p, quantity: p.quantity + qty }
              : p
          )
        );

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const auditItem = {
          id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          dateTime: `Today ${timeStr}`,
          productName: prod.name,
          type: 'REFILL',
          quantity: Math.abs(qty),
          unit: targetUnit,
          reason: '—',
          note: (note || '').trim() || 'Stock replenishment',
          performedBy: performedBy || 'Manager',
          beforeStock: before,
          afterStock: after,
        };
        setStockAuditLog((prev) => [auditItem, ...prev]);
        return true;
      }
    },
    [serviceStock, refreshStock]
  );

  // Stock Adjustment for known non-service reductions (Wastage, Damaged, Expired, Manual Correction)
  const adjustStock = useCallback(
    async ({ productName, quantity, reason = 'Wastage', note = '', performedBy = 'Manager' }) => {
      const qty = parseInt(quantity, 10);
      if (!productName || isNaN(qty) || qty <= 0) {
        return { success: false, error: 'Please enter a valid deduction quantity greater than 0.' };
      }

      const prod = serviceStock.find(
        (p) => p.name.toLowerCase() === productName.toLowerCase()
      );
      if (!prod) {
        return { success: false, error: 'Product not found.' };
      }
      if (qty > prod.quantity) {
        return {
          success: false,
          error: `Cannot deduct ${qty.toLocaleString('en-US')} ${prod.unit}. Current stock is only ${prod.quantity.toLocaleString('en-US')} ${prod.unit} (negative stock not allowed).`,
        };
      }

      try {
        if (prod.id && typeof prod.id === 'string') {
          await stockApi.adjust(prod.id, {
            quantity: qty,
            reason: `${reason || 'Wastage'}${note ? ': ' + note.trim() : ''}`,
          });
        }
        await refreshStock();
        return { success: true };
      } catch (err) {
        console.error('Backend stock adjust failed, applying local fallback:', err);
        const before = prod.quantity;
        const after = prod.quantity - qty;
        const targetUnit = prod.unit;

        setServiceStock((prev) =>
          prev.map((p) =>
            p.name.toLowerCase() === productName.toLowerCase()
              ? { ...p, quantity: p.quantity - qty }
              : p
          )
        );

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const auditItem = {
          id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          dateTime: `Today ${timeStr}`,
          productName: prod.name,
          type: 'ADJUSTMENT',
          quantity: -Math.abs(qty),
          unit: targetUnit,
          reason: reason || 'Wastage',
          note: (note || '').trim() || '—',
          performedBy: performedBy || 'Manager',
          beforeStock: before,
          afterStock: after,
        };

        setStockAuditLog((prev) => [auditItem, ...prev]);

        return { success: true };
      }
    },
    [serviceStock, refreshStock]
  );

  // Add new product via backend API
  const addNewProduct = useCallback(
    async (name, openingQuantity = 0, unit = 'ml', active = true) => {
      const trimmed = name?.trim();
      if (!trimmed) return false;
      const qty = Math.max(0, parseInt(openingQuantity, 10) || 0);

      try {
        const res = await stockApi.create({
          name: trimmed,
          category: 'General',
          quantity: qty,
          unit: unit || 'ml',
        });
        await refreshStock();
        return res?.data;
      } catch (err) {
        console.error('Failed to create product on backend, fallback local:', err);
        const newProd = {
          id: `local-${Date.now()}`,
          name: trimmed,
          category: 'General',
          quantity: qty,
          unit: unit || 'ml',
          active: Boolean(active),
        };
        setServiceStock((prev) => [...prev, newProd]);
        return newProd;
      }
    },
    [refreshStock]
  );

  // Update product details via backend API
  const updateProduct = useCallback(
    async (oldName, newName, quantity, unit, active) => {
      const trimmedOld = oldName?.trim().toLowerCase();
      const trimmedNew = newName?.trim() || oldName?.trim();
      if (!trimmedOld) return false;

      const prod = serviceStock.find((p) => p.name.toLowerCase() === trimmedOld);
      if (prod && prod.id && typeof prod.id === 'string' && prod.id.length > 10) {
        try {
          await stockApi.update(prod.id, {
            name: trimmedNew,
            isActive: active !== undefined ? Boolean(active) : prod.active,
          });
          await refreshStock();
          return true;
        } catch (err) {
          console.error('Failed to update product on backend:', err);
        }
      }

      setServiceStock((prev) =>
        prev.map((p) => {
          if (p.name.toLowerCase() !== trimmedOld) return p;
          return {
            ...p,
            name: trimmedNew,
            quantity:
              quantity !== undefined
                ? Math.max(0, parseInt(quantity, 10) || 0)
                : p.quantity,
            unit: unit !== undefined ? unit : p.unit,
            active: active !== undefined ? Boolean(active) : p.active,
          };
        })
      );
      return true;
    },
    [serviceStock, refreshStock]
  );

  // Delete / deactivate product via backend API
  const deleteProduct = useCallback(
    async (productName) => {
      const trimmed = productName?.trim().toLowerCase();
      if (!trimmed) return false;

      const prod = serviceStock.find((p) => p.name.toLowerCase() === trimmed);
      if (prod && prod.id && typeof prod.id === 'string' && prod.id.length > 10) {
        try {
          await stockApi.update(prod.id, { isActive: false });
          await refreshStock();
          return true;
        } catch (err) {
          console.error('Failed to deactivate product on backend:', err);
        }
      }

      setServiceStock((prev) => prev.filter((p) => p.name.toLowerCase() !== trimmed));
      return true;
    },
    [serviceStock, refreshStock]
  );

  // Toggle active/inactive via backend API
  const toggleProductActive = useCallback(
    async (id) => {
      const prod = serviceStock.find((p) => p.id === id);
      if (!prod) return;
      const newActive = !prod.active;

      try {
        if (typeof id === 'string' && id.length > 10) {
          await stockApi.update(id, { isActive: newActive });
          await refreshStock();
          return;
        }
      } catch (err) {
        console.error('Failed to toggle active on backend:', err);
      }

      setServiceStock((prev) =>
        prev.map((p) => (p.id === id ? { ...p, active: newActive } : p))
      );
    },
    [serviceStock, refreshStock]
  );

  // Configure consumption rules for a service
  const saveServiceConsumptionRules = useCallback((serviceName, rules) => {
    setConsumptionRules((prev) => {
      const existingIdx = prev.findIndex(
        (r) => r.serviceName.toLowerCase() === serviceName.toLowerCase()
      );
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = { serviceName, rules };
        return copy;
      }
      return [...prev, { serviceName, rules }];
    });
  }, []);

  // Confirm stock check reconciliation
  const confirmStockCheck = useCallback(
    (actualCounts = {}, performedBy = 'Manager') => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Synchronously compute reconciliation items from current serviceStock
      const reconciliationItems = serviceStock.map((p) => {
        const actualVal = actualCounts[p.name];
        const actual =
          actualVal !== undefined && actualVal !== null && actualVal !== ''
            ? Math.max(0, parseInt(actualVal, 10) || 0)
            : p.quantity;
        const difference = actual - p.quantity;

        return {
          productId: p.id,
          productName: p.name,
          unit: p.unit,
          expected: p.quantity,
          actual,
          difference,
        };
      });

      // Update current stock baseline
      setServiceStock((prev) =>
        prev.map((p) => {
          const item = reconciliationItems.find((r) => r.productName === p.name);
          return item ? { ...p, quantity: item.actual } : p;
        })
      );

      const result = {
        date: dateStr,
        confirmedAt: timeStr,
        items: reconciliationItems,
      };

      setLatestReconciliation(result);

      // Record any non-zero physical check differences into Activity History
      const auditEntries = reconciliationItems
        .filter((item) => item.difference !== 0)
        .map((item) => ({
          id: `aud-${Date.now()}-${item.productName}-${Math.random().toString(36).substr(2, 4)}`,
          dateTime: `Today ${timeStr}`,
          productName: item.productName,
          type: 'STOCK CHECK',
          quantity: item.difference,
          unit: item.unit,
          reason: item.difference < 0 ? 'Discrepancy (Missing)' : 'Discrepancy (Extra)',
          note: `Physical check: Expected ${item.expected} ${item.unit}, Counted ${item.actual} ${item.unit}`,
          performedBy: performedBy || 'Manager',
          beforeStock: item.expected,
          afterStock: item.actual,
        }));

      if (auditEntries.length > 0) {
        setStockAuditLog((prev) => [...auditEntries, ...prev]);
      }

      return result;
    },
    [serviceStock]
  );

  // Deduct service stock according to consumption rules (Idempotent: runs strictly once per appointmentServiceId)
  const deductServiceStock = useCallback(
    ({ appointmentId, appointmentServiceId, service, product, date }) => {
      const dedupKey = appointmentServiceId
        ? String(appointmentServiceId)
        : (appointmentId !== undefined && appointmentId !== null ? `apt-${appointmentId}-stock` : null);
      if (dedupKey && deductedAptIds.has(dedupKey)) {
        return false;
      }

      const aptIdNum = appointmentId !== undefined && appointmentId !== null ? Number(appointmentId) : null;

      const matchedRuleConfig = consumptionRules.find(
        (r) => r.serviceName.toLowerCase() === service?.toLowerCase()
      );

      const newLogEntries = [];

      if (matchedRuleConfig && matchedRuleConfig.rules?.length > 0) {
        setServiceStock((prev) =>
          prev.map((p) => {
            const rule = matchedRuleConfig.rules.find(
              (r) => r.productName.toLowerCase() === p.name.toLowerCase()
            );
            if (rule && rule.quantity > 0) {
              newLogEntries.push({
                id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                serviceName: service,
                productName: p.name,
                quantity: rule.quantity,
                unit: p.unit,
                date: date || 'Today',
                appointmentId: aptIdNum,
              });
              return {
                ...p,
                quantity: Math.max(0, p.quantity - rule.quantity),
              };
            }
            return p;
          })
        );
      } else if (product) {
        setServiceStock((prev) =>
          prev.map((p) => {
            if (p.name.toLowerCase() === product.toLowerCase()) {
              newLogEntries.push({
                id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                serviceName: service,
                productName: p.name,
                quantity: 1,
                unit: p.unit,
                date: date || 'Today',
                appointmentId: aptIdNum,
              });
              return {
                ...p,
                quantity: Math.max(0, p.quantity - 1),
              };
            }
            return p;
          })
        );
      }

      if (newLogEntries.length > 0) {
        setConsumptionLog((prev) => [...prev, ...newLogEntries]);
      }

      if (dedupKey) {
        setDeductedAptIds((prev) => new Set([...prev, dedupKey]));
      }

      return true;
    },
    [consumptionRules, deductedAptIds]
  );

  // Close service (Idempotent per appointmentServiceId)
  const closeServiceRecord = useCallback(
    ({
      appointmentId,
      appointmentServiceId,
      clientId,
      clientName,
      service,
      technician,
      product,
      price,
      payment,
      date,
    }) => {
      const svcKey = appointmentServiceId ? String(appointmentServiceId) : null;
      if (svcKey && completedServices.some((s) => s.appointmentServiceId === svcKey)) {
        return false;
      }
      if (!svcKey && appointmentId && isAppointmentClosed(appointmentId)) {
        return false;
      }

      const numericPrice =
        typeof price === 'number'
          ? price
          : parseInt(String(price).replace(/[^0-9]/g, ''), 10) || 0;

      const payStr = String(payment || 'CASH').toUpperCase();
      const normalizedPayment = payStr.includes('MTN')
        ? 'MTN MOMO'
        : payStr.includes('ORANGE')
        ? 'ORANGE MONEY'
        : 'CASH';

      const record = {
        id: completedServices.length + 1,
        appointmentId: appointmentId !== undefined && appointmentId !== null ? Number(appointmentId) : null,
        appointmentServiceId: svcKey,
        clientId: Number(clientId),
        clientName,
        service,
        technician,
        product,
        price: numericPrice,
        payment: normalizedPayment,
        date: date || 'Today',
      };
      setCompletedServices((prev) => [...prev, record]);

      // Automatic service stock deduction
      deductServiceStock({
        appointmentId,
        appointmentServiceId: svcKey,
        service,
        product,
        date: date || 'Today',
      });

      // Update Daily Revenue & totals
      setDailyTotals((prev) => ({
        ...prev,
        caTotal: prev.caTotal + numericPrice,
        cash: normalizedPayment === 'CASH' ? prev.cash + numericPrice : prev.cash,
        mtnMomo:
          normalizedPayment === 'MTN MOMO'
            ? prev.mtnMomo + numericPrice
            : prev.mtnMomo,
        orangeMoney:
          normalizedPayment === 'ORANGE MONEY'
            ? prev.orangeMoney + numericPrice
            : prev.orangeMoney,
      }));

      // Update Technician Revenue
      if (technician) {
        setTechRevenue((prev) => ({
          ...prev,
          [technician]: (prev[technician] ?? 0) + numericPrice,
        }));
      }

      return true;
    },
    [completedServices, isAppointmentClosed, deductServiceStock]
  );

  // Record retail product sale
  const recordRetailSale = useCallback(
    ({ amount, payment, items = [], clientName = 'Walk-in Customer', isWalkIn = false }) => {
      const numericAmount = Math.max(0, parseInt(amount, 10) || 0);
      if (numericAmount <= 0) return;

      const payStr = String(payment || 'CASH').toUpperCase();
      const normalizedPayment = payStr.includes('MTN')
        ? 'MTN MOMO'
        : payStr.includes('ORANGE')
        ? 'ORANGE MONEY'
        : 'CASH';

      setDailyTotals((prev) => ({
        ...prev,
        caTotal: prev.caTotal + numericAmount,
        cash: normalizedPayment === 'CASH' ? prev.cash + numericAmount : prev.cash,
        mtnMomo:
          normalizedPayment === 'MTN MOMO'
            ? prev.mtnMomo + numericAmount
            : prev.mtnMomo,
        orangeMoney:
          normalizedPayment === 'ORANGE MONEY'
            ? prev.orangeMoney + numericAmount
            : prev.orangeMoney,
        clientCount: isWalkIn ? prev.clientCount + 1 : prev.clientCount,
      }));

      const record = {
        id: `ret-sale-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        amount: numericAmount,
        payment: normalizedPayment,
        items,
        clientName,
        isWalkIn,
        date: 'Today',
      };
      setRetailSales((prev) => [...prev, record]);
    },
    []
  );

  return (
    <OperationsContext.Provider
      value={{
        stock,
        serviceStock,
        isLoadingStock,
        stockError,
        refreshStock,
        consumptionRules,
        consumptionLog,
        lowStockThresholdDays,
        setLowStockThresholdDays,
        latestReconciliation,
        confirmStockCheck,
        getProductMetrics,
        dailyTotals,
        techRevenue,
        completedServices,
        retailSales,
        recordRetailSale,
        isAppointmentClosed,
        isServiceClosed,
        closeServiceRecord,
        deductServiceStock,
        addStock,
        adjustStock,
        stockAuditLog,
        addNewProduct,
        updateProduct,
        deleteProduct,
        toggleProductActive,
        saveServiceConsumptionRules,
      }}
    >
      {children}
    </OperationsContext.Provider>
  );
}

export function useOperations() {
  return useContext(OperationsContext);
}
