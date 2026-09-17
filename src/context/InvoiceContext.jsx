/**
 * InvoiceContext — Invoices & Payments state with Real Backend REST Integration (Phase 16 & 22)
 *
 * Connects to OMEGA SPA POS Backend (/api/v1/invoices and /api/v1/payments)
 * Supports:
 *   - Live invoice listing (Draft, Pending Payment, Paid Today, History)
 *   - Auto-creation upon technician service close
 *   - Payment methods: CASH, MTN MoMo, Orange Money
 *   - Partial payments & balance tracking
 *   - Printable receipt modal integration
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { invoicesApi, paymentsApi } from '../services/api';
import { useAuth } from './AuthContext';

const InvoiceContext = createContext();

export function formatInvoiceNumber(inv) {
  if (!inv) return 'INV-0000';
  if (typeof inv === 'string' && inv.startsWith('INV-')) return inv;
  if (typeof inv === 'object' && inv.invoiceNumber) return inv.invoiceNumber;
  const id = typeof inv === 'object' ? inv.id : inv;
  return `INV-${String(id).padStart(4, '0')}`;
}

// Format YYYY-MM-DD
function getDaysAgoStr(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const todayStr = getDaysAgoStr(0);
const threeDaysAgoStr = getDaysAgoStr(3);

// Clean initial state for real backend integration
const SEED_INVOICES = [];

export function formatBackendInvoice(inv) {
  if (!inv) return null;
  const dateStr = inv.date ? inv.date.split('T')[0] : '';
  const firstPayment = inv.payments?.[0];
  const paymentMethodDisplay = firstPayment?.paymentMethod
    ? firstPayment.paymentMethod.replace(/_/g, ' ')
    : null;
  const paidTime = firstPayment?.paidAt
    ? new Date(firstPayment.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const mappedItems = (inv.items || []).map((it, idx) => ({
    id: it.id || `inv-item-${idx}`,
    appointmentId: inv.appointmentId,
    appointmentServiceId: it.appointmentServiceId || `asvc-${it.id}`,
    serviceId: it.serviceId || null,
    service: it.name || 'Spa Service',
    name: it.name || 'Spa Service',
    technician: it.technician?.staffProfile?.name || 'Staff',
    technicianId: it.technicianId || null,
    price: Number(it.price || 0),
    quantity: it.quantity || 1,
    type: it.itemType === 'RETAIL' ? 'cosmetic' : 'service',
  }));

  const totalNum = Number(inv.total || 0);
  const discountNum = Number(inv.discount || 0);
  const paidNum = Number(inv.paidAmount ?? (inv.status === 'PAID' ? totalNum : 0));
  const remainingNum = Number(inv.remainingAmount ?? (inv.status === 'PAID' ? 0 : totalNum));

  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber || formatInvoiceNumber(inv.id),
    appointmentId: inv.appointmentId || null,
    clientId: inv.clientId || inv.client?.id || null,
    clientName: inv.client?.name || 'Client',
    clientPhone: inv.client?.phone || '',
    status: inv.status || 'PENDING_PAYMENT',
    date: dateStr,
    items:
      mappedItems.length > 0
        ? mappedItems
        : [
            {
              id: 1,
              service: 'Spa Service',
              name: 'Spa Service',
              price: totalNum,
              quantity: 1,
              technician: 'Staff',
            },
          ],
    total: totalNum,
    discount: discountNum,
    finalTotal: totalNum,
    paidAmount: paidNum,
    remainingAmount: remainingNum,
    paymentMethod: paymentMethodDisplay,
    paidAt: firstPayment?.paidAt || null,
    paidTime: paidTime,
    payments: inv.payments || [],
    pointsEarned: inv.pointsEarned || 0,
    pointsRedeemed: inv.pointsRedeemed || 0,
    createdAt: inv.createdAt,
    submittedAt: inv.createdAt,
    introducedBy: inv.client?.introducedByEmployee?.name || null,
    introducedById: inv.client?.introducedByEmployeeId || null,
  };
}

export function InvoiceProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [invoices, setInvoices] = useState(SEED_INVOICES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch real invoices from backend on mount
  const refreshInvoices = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setError(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await invoicesApi.getAll({ limit: 100 });
      const apiList = res?.data?.invoices || res?.data || [];
      if (Array.isArray(apiList)) {
        const formattedList = apiList.map(formatBackendInvoice).filter(Boolean);
        setInvoices(formattedList);
      }
    } catch (err) {
      console.warn('Backend invoices fetch error:', err.message);
      setError(err.message || 'Unable to connect to server');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshInvoices();
    } else {
      setInvoices(SEED_INVOICES);
      setLoading(false);
    }
  }, [isAuthenticated, refreshInvoices]);

  const findOpenInvoice = useCallback(
    (clientId, clientName) => {
      const today = new Date().toISOString().slice(0, 10);
      return invoices.find(
        (inv) =>
          (inv.status === 'DRAFT' || inv.status === 'PENDING_PAYMENT') &&
          inv.date === today &&
          (String(inv.clientId) === String(clientId) ||
            inv.clientName?.toLowerCase() === clientName?.toLowerCase())
      );
    },
    [invoices]
  );

  const createOrAddToInvoice = useCallback(
    async ({ clientId, clientName, item, introducedBy, introducedById }) => {
      const isServiceItem = item?.type !== 'drink' && item?.type !== 'cosmetic';
      const isAppointmentService = Boolean(item?.appointmentServiceId || isServiceItem);
      const targetAptId = item?.appointmentId || null;

      const today = new Date().toISOString().slice(0, 10);

      // Backend invoice creation if appointmentId is UUID
      if (targetAptId && typeof targetAptId === 'string' && targetAptId.includes('-')) {
        try {
          const res = await invoicesApi.create({
            appointmentId: targetAptId,
            discount: 0,
            status: 'PENDING_PAYMENT',
          });
          const invoiceObj = res?.data?.invoice || res?.data || res;
          if (invoiceObj && invoiceObj.id) {
            const formatted = formatBackendInvoice(invoiceObj);
            setInvoices((prev) => [formatted, ...prev.filter((i) => String(i.id) !== String(formatted.id))]);
            await refreshInvoices();
            return formatted.id;
          }
        } catch (err) {
          console.warn('Backend invoice creation note:', err.message);
          if (err.status === 409 || err.message?.includes('already exists')) {
            await refreshInvoices();
          }
        }
      }

      // Local fallback
      setInvoices((prev) => {
        const existingIdx = targetAptId
          ? prev.findIndex(
              (inv) =>
                inv.status === 'DRAFT' &&
                (String(inv.appointmentId) === String(targetAptId) ||
                  inv.items?.some((it) => String(it.appointmentId) === String(targetAptId)))
            )
          : -1;

        if (existingIdx >= 0) {
          const existing = prev[existingIdx];
          const svcId = item.appointmentServiceId || item.id;
          if (svcId && existing.items.some((it) => (it.appointmentServiceId || it.id) === svcId)) {
            return prev;
          }

          const updatedItems = [...existing.items, item];
          const updatedTotal = updatedItems.reduce(
            (sum, it) => sum + (Number(it.price) || 0),
            0
          );

          const updated = [...prev];
          updated[existingIdx] = {
            ...existing,
            appointmentId: targetAptId || existing.appointmentId || null,
            items: updatedItems,
            total: updatedTotal,
            finalTotal: updatedTotal,
            remainingAmount: updatedTotal,
            introducedBy: existing.introducedBy || introducedBy || item.introducedBy || null,
            introducedById: existing.introducedById || introducedById || item.introducedById || null,
          };
          return updated;
        }

        const priceNum = Number(item.price) || 0;
        const newInvoice = {
          id: 'inv-' + Date.now(),
          invoiceNumber: formatInvoiceNumber(Date.now()),
          appointmentId: targetAptId || null,
          clientId: clientId || null,
          clientName: clientName || 'Client',
          status: 'DRAFT',
          date: today,
          items: [item],
          total: priceNum,
          finalTotal: priceNum,
          paidAmount: 0,
          remainingAmount: priceNum,
          discount: 0,
          paymentMethod: null,
          paidAt: null,
          paidTime: null,
          payments: [],
          pointsEarned: 0,
          pointsRedeemed: 0,
          createdAt: new Date().toISOString(),
          introducedBy: introducedBy || item.introducedBy || null,
          introducedById: introducedById || item.introducedById || null,
        };

        return [newInvoice, ...prev];
      });

      return true;
    },
    []
  );

  const submitInvoiceByClient = useCallback((clientId, clientName, appointmentId) => {
    const now = new Date().toISOString();
    setInvoices((prev) =>
      prev.map((inv) => {
        const matchesApt = appointmentId && (String(inv.appointmentId) === String(appointmentId) || inv.items?.some((it) => String(it.appointmentId) === String(appointmentId)));
        const matchesClient = !appointmentId && (String(inv.clientId) === String(clientId) || inv.clientName?.toLowerCase() === clientName?.toLowerCase());
        if (inv.status === 'DRAFT' && (matchesApt || matchesClient)) {
          return {
            ...inv,
            status: 'PENDING_PAYMENT',
            submittedAt: now,
          };
        }
        return inv;
      })
    );
  }, []);

  // Reception marks invoice as PAID (full or custom amount)
  const markInvoicePaid = useCallback(
    async (invoiceId, paymentMethod, paymentDetails = {}) => {
      let paidInvoice = null;
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      const rawMethod = String(paymentMethod || 'CASH').toUpperCase();
      const backendMethod =
        rawMethod.includes('MTN') || rawMethod.includes('MOMO')
          ? 'MTN_MOMO'
          : rawMethod.includes('ORANGE')
          ? 'ORANGE_MONEY'
          : 'CASH';

      const amountToPay = Number(paymentDetails.finalTotal || paymentDetails.amount || 0);

      // Backend payment if invoiceId is UUID
      if (typeof invoiceId === 'string' && invoiceId.includes('-')) {
        try {
          await paymentsApi.create({
            invoiceId,
            amount: amountToPay > 0 ? amountToPay : 1000,
            paymentMethod: backendMethod,
            notes: paymentDetails.notes || 'Payment recorded from POS',
          });
        } catch (err) {
          console.warn('Backend payment record error:', err.message);
        }
      }

      setInvoices((prev) =>
        prev.map((inv) => {
          if (
            (inv.id === invoiceId || String(inv.id) === String(invoiceId)) &&
            (inv.status === 'PENDING_PAYMENT' || inv.status === 'DRAFT')
          ) {
            const finalTotal = paymentDetails.finalTotal !== undefined ? paymentDetails.finalTotal : inv.total;
            paidInvoice = {
              ...inv,
              status: 'PAID',
              paymentMethod: paymentMethod || 'CASH',
              paidAt: now.toISOString(),
              paidTime: timeStr,
              discount: paymentDetails.discount || 0,
              finalTotal: finalTotal,
              paidAmount: finalTotal,
              remainingAmount: 0,
              pointsEarned: paymentDetails.pointsEarned || 0,
              pointsRedeemed: paymentDetails.pointsRedeemed || 0,
            };
            return paidInvoice;
          }
          return inv;
        })
      );

      return paidInvoice;
    },
    []
  );

  // Record partial payment
  const recordPartialPayment = useCallback(
    async ({ invoiceId, amount, paymentMethod, notes }) => {
      const numAmount = Number(amount);
      if (numAmount <= 0) return null;

      const rawMethod = String(paymentMethod || 'CASH').toUpperCase();
      const backendMethod =
        rawMethod.includes('MTN') || rawMethod.includes('MOMO')
          ? 'MTN_MOMO'
          : rawMethod.includes('ORANGE')
          ? 'ORANGE_MONEY'
          : 'CASH';

      if (typeof invoiceId === 'string' && invoiceId.includes('-')) {
        try {
          await paymentsApi.create({
            invoiceId,
            amount: numAmount,
            paymentMethod: backendMethod,
            notes: notes || 'Partial payment recorded from POS',
          });
        } catch (err) {
          console.warn('Backend partial payment error:', err.message);
        }
      }

      let updatedInvoice = null;
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id === invoiceId || String(inv.id) === String(invoiceId)) {
            const newPaidAmount = Number(inv.paidAmount || 0) + numAmount;
            const newRemaining = Math.max(0, Number(inv.finalTotal || inv.total) - newPaidAmount);
            const isFullyPaid = newRemaining === 0;

            updatedInvoice = {
              ...inv,
              paidAmount: newPaidAmount,
              remainingAmount: newRemaining,
              status: isFullyPaid ? 'PAID' : 'PENDING_PAYMENT',
              paymentMethod: paymentMethod,
              paidAt: isFullyPaid ? new Date().toISOString() : inv.paidAt,
              paidTime: isFullyPaid ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : inv.paidTime,
            };
            return updatedInvoice;
          }
          return inv;
        })
      );

      return updatedInvoice;
    },
    []
  );

  const getInvoice = useCallback(
    (id) =>
      invoices.find(
        (inv) =>
          inv.id === id ||
          String(inv.id) === String(id) ||
          (typeof inv.id === 'number' && Number(inv.id) === Number(id))
      ),
    [invoices]
  );

  const getPendingInvoices = useCallback(
    () => invoices.filter((inv) => inv.status === 'PENDING_PAYMENT'),
    [invoices]
  );

  const getPaidInvoices = useCallback(
    () => invoices.filter((inv) => inv.status === 'PAID'),
    [invoices]
  );

  const getInvoiceByAppointment = useCallback(
    (appointmentId) =>
      invoices.find(
        (inv) =>
          String(inv.appointmentId) === String(appointmentId) ||
          inv.items?.some((it) => String(it.appointmentId) === String(appointmentId))
      ),
    [invoices]
  );

  const isAppointmentInvoiced = useCallback(
    (appointmentId) =>
      invoices.some(
        (inv) =>
          (inv.status === 'PENDING_PAYMENT' || inv.status === 'PAID') &&
          (String(inv.appointmentId) === String(appointmentId) ||
            inv.items?.some((it) => String(it.appointmentId) === String(appointmentId)))
      ),
    [invoices]
  );


  // Technician submits invoice → status becomes PENDING_PAYMENT
  const submitInvoice = useCallback((invoiceId) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        (inv.id === invoiceId || String(inv.id) === String(invoiceId)) && inv.status === 'DRAFT'
          ? { ...inv, status: 'PENDING_PAYMENT' }
          : inv
      )
    );
  }, []);

  // Get paid invoices from today
  const getPaidTodayInvoices = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    return invoices.filter(
      (inv) =>
        inv.status === 'PAID' &&
        (inv.date === today ||
          inv.date === 'Today' ||
          (inv.paidAt && inv.paidAt.slice(0, 10) === today))
    );
  }, [invoices]);

  // Get all paid invoices (History - sorted newest first)
  const getHistoryInvoices = useCallback(() => {
    return invoices
      .filter((inv) => inv.status === 'PAID')
      .sort(
        (a, b) =>
          new Date(b.paidAt || b.date || b.createdAt).getTime() -
          new Date(a.paidAt || a.date || a.createdAt).getTime()
      );
  }, [invoices]);

  // Get all invoices
  const getAllInvoices = useCallback(() => invoices, [invoices]);

  // Add retail item (Drink or Cosmetic) to an open invoice (DRAFT or PENDING_PAYMENT)
  const addRetailItemToInvoice = useCallback((invoiceId, retailItem, quantity = 1) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId && String(inv.id) !== String(invoiceId)) return inv;
        const priceNum =
          typeof retailItem.price === 'number'
            ? retailItem.price
            : parseInt(String(retailItem.price).replace(/[^0-9]/g, ''), 10) || 0;
        const qty = Math.max(
          1,
          parseInt(retailItem.qty !== undefined ? retailItem.qty : quantity, 10) || 1
        );

        const existingIdx = (inv.items || []).findIndex(
          (it) =>
            (it.type === 'drink' || it.type === 'cosmetic') &&
            (it.productId === retailItem.id ||
              it.name?.toLowerCase() === retailItem.name?.toLowerCase())
        );

        let updatedItems;
        if (existingIdx >= 0) {
          const existing = inv.items[existingIdx];
          const newQty = (existing.qty || 1) + qty;
          const unitPrice = existing.unitPrice || priceNum;
          const updatedItem = {
            ...existing,
            qty: newQty,
            unitPrice,
            price: unitPrice * newQty,
          };
          updatedItems = [...inv.items];
          updatedItems[existingIdx] = updatedItem;
        } else {
          const newItem = {
            id: `retail-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            productId: retailItem.id,
            service: retailItem.name,
            name: retailItem.name,
            unitPrice: priceNum,
            qty,
            price: priceNum * qty,
            type: retailItem.type || 'drink',
            category: retailItem.type === 'drink' ? 'DRINKS' : 'COSMETICS',
            technician: 'Reception',
          };
          updatedItems = [...(inv.items || []), newItem];
        }

        const updatedTotal = updatedItems.reduce(
          (sum, it) =>
            sum +
            (typeof it.price === 'number'
              ? it.price
              : parseInt(String(it.price).replace(/[^0-9]/g, ''), 10) || 0),
          0
        );

        return {
          ...inv,
          items: updatedItems,
          total: updatedTotal,
          finalTotal: Math.max(0, updatedTotal - (inv.discount || 0)),
          remainingAmount: Math.max(0, updatedTotal - (inv.discount || 0) - (inv.paidAmount || 0)),
        };
      })
    );
  }, []);

  // Remove a retail item from an open invoice
  const removeRetailItemFromInvoice = useCallback((invoiceId, itemId) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId && String(inv.id) !== String(invoiceId)) return inv;
        const updatedItems = (inv.items || []).filter(
          (it) => it.id !== itemId && it.service !== itemId
        );
        const updatedTotal = updatedItems.reduce(
          (sum, it) =>
            sum +
            (typeof it.price === 'number'
              ? it.price
              : parseInt(String(it.price).replace(/[^0-9]/g, ''), 10) || 0),
          0
        );

        return {
          ...inv,
          items: updatedItems,
          total: updatedTotal,
          finalTotal: Math.max(0, updatedTotal - (inv.discount || 0)),
          remainingAmount: Math.max(0, updatedTotal - (inv.discount || 0) - (inv.paidAmount || 0)),
        };
      })
    );
  }, []);

  // Create a completed Retail-Only sale invoice directly (Walk-in or Client)
  const createRetailSaleInvoice = useCallback(
    ({ client, clientId, clientName, items, paymentMethod, discount = 0 }) => {
      const today = new Date().toISOString().slice(0, 10);
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const generatedId = `RET-${Date.now()}`;

      const formattedItems = (items || []).map((it, idx) => {
        const unitPriceNum =
          typeof it.price === 'number'
            ? it.price
            : parseInt(String(it.price).replace(/[^0-9]/g, ''), 10) || 0;
        const qty = Math.max(1, parseInt(it.qty, 10) || 1);
        return {
          id: `retail-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          productId: it.productId || it.id,
          service: it.name || it.service,
          name: it.name || it.service,
          unitPrice: unitPriceNum,
          qty,
          price: unitPriceNum * qty,
          type: it.type || 'drink',
          category: it.type === 'drink' ? 'DRINKS' : 'COSMETICS',
          technician: 'Reception',
        };
      });

      const total = formattedItems.reduce((sum, it) => sum + it.price, 0);
      const finalTotal = Math.max(0, total - (discount || 0));

      const newInvoice = {
        id: generatedId,
        invoiceNumber: generatedId,
        clientId: client?.id || clientId || null,
        clientName: client?.name?.trim() || clientName || 'Walk-in Customer',
        type: 'RETAIL',
        status: 'PAID',
        date: today,
        items: formattedItems,
        total,
        finalTotal,
        paidAmount: finalTotal,
        remainingAmount: 0,
        discount: discount || 0,
        paymentMethod: paymentMethod || 'CASH',
        paidAt: now.toISOString(),
        paidTime: timeStr,
        pointsEarned: 0,
        pointsRedeemed: 0,
        createdAt: now.toISOString(),
        isRetailOnly: true,
      };

      setInvoices((prev) => [newInvoice, ...prev]);
      return newInvoice;
    },
    []
  );

  // Shared Work: Add a technician service line to an existing open visit by invoiceId
  const addServiceToInvoice = useCallback(
    (invoiceId, { service, technician, technicianId, price, appointmentId = null }) => {
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id !== invoiceId && String(inv.id) !== String(invoiceId)) return inv;
          if (inv.status === 'PAID') return inv;

          const priceNum =
            typeof price === 'number'
              ? price
              : parseInt(String(price).replace(/[^0-9]/g, ''), 10) || 0;

          const newItem = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            service,
            technician: technician || 'Staff',
            technicianId: technicianId || null,
            price: priceNum,
            appointmentId: appointmentId || inv.items?.[0]?.appointmentId || null,
          };

          const updatedItems = [...(inv.items || []), newItem];
          const updatedTotal = updatedItems.reduce(
            (sum, it) => sum + (Number(it.price) || 0),
            0
          );

          return {
            ...inv,
            items: updatedItems,
            total: updatedTotal,
            finalTotal: updatedTotal,
            remainingAmount: Math.max(0, updatedTotal - (inv.paidAmount || 0)),
            status: 'PENDING_PAYMENT',
          };
        })
      );
    },
    []
  );

  // Shared Work: Remove service line (technician can remove own lines only, manager can remove any)
  const removeServiceFromInvoice = useCallback(
    (invoiceId, itemId, currentUserName, isManager = false) => {
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id !== invoiceId && String(inv.id) !== String(invoiceId)) return inv;
          if (inv.status === 'PAID') return inv;

          const itemToRemove = inv.items?.find((it) => it.id === itemId);
          if (!itemToRemove) return inv;

          if (!isManager && itemToRemove.technician && currentUserName && itemToRemove.technician !== currentUserName) {
            return inv;
          }

          const updatedItems = (inv.items || []).filter((it) => it.id !== itemId);
          const updatedTotal = updatedItems.reduce(
            (sum, it) => sum + (Number(it.price) || 0),
            0
          );

          return {
            ...inv,
            items: updatedItems,
            total: updatedTotal,
            finalTotal: updatedTotal,
            remainingAmount: Math.max(0, updatedTotal - (inv.paidAmount || 0)),
          };
        })
      );
    },
    []
  );

  // Shared Work: Get active/open client visits (DRAFT or PENDING_PAYMENT)
  const getOpenVisits = useCallback(() => {
    return invoices.filter(
      (inv) => inv.status === 'DRAFT' || inv.status === 'PENDING_PAYMENT'
    );
  }, [invoices]);

  // Shared Work: Submit completed Shared Work invoice to Reception
  const submitSharedWorkInvoice = useCallback(
    async ({ appointmentId, clientId, clientName, items }) => {
      const targetAptId =
        appointmentId !== undefined && appointmentId !== null
          ? (typeof appointmentId === 'number' || !isNaN(Number(appointmentId))
              ? Number(appointmentId)
              : String(appointmentId))
          : null;

      const isBackendApt = Boolean(targetAptId && typeof targetAptId === 'string' && String(targetAptId).includes('-'));
      if (isBackendApt) {
        try {
          const res = await invoicesApi.create({
            appointmentId: String(targetAptId),
            discount: 0,
            status: 'PENDING_PAYMENT',
          });
          const invoiceObj = res?.data?.invoice || res?.data || res;
          if (invoiceObj && invoiceObj.id) {
            const formatted = formatBackendInvoice(invoiceObj);
            setInvoices((prev) => [
              formatted,
              ...prev.filter((i) => String(i.id) !== String(formatted.id)),
            ]);
            await refreshInvoices();
            return formatted.id;
          }
        } catch (err) {
          console.warn('Backend shared work invoice creation note:', err.message);
          if (err.status === 409 || err.message?.includes('already exists')) {
            await refreshInvoices();
          }
        }
      }

      if (!items || items.length === 0) {
        console.error('Validation Failure: Shared Work invoice requires at least one service item.');
        return false;
      }

      const today = new Date().toISOString().slice(0, 10);
      const cleanItems = items.map((it, idx) => ({
        id: it.id || Date.now() + idx,
        appointmentServiceId: it.appointmentServiceId,
        serviceId: it.serviceId || null,
        service: it.service,
        technician: it.technician,
        technicianId: it.technicianId || null,
        product: it.product || null,
        price:
          typeof it.price === 'number'
            ? it.price
            : parseInt(String(it.price).replace(/[^0-9]/g, ''), 10) || 0,
        appointmentId: targetAptId,
      }));

      const totalNum = cleanItems.reduce((sum, it) => sum + it.price, 0);

      setInvoices((prev) => {
        const existingIdx = prev.findIndex(
          (inv) =>
            String(inv.appointmentId) === String(targetAptId) ||
            inv.items?.some((it) => String(it.appointmentId) === String(targetAptId))
        );

        if (existingIdx >= 0) {
          const existing = prev[existingIdx];
          if (existing.status === 'PAID') return prev;

          const updated = [...prev];
          updated[existingIdx] = {
            ...existing,
            appointmentId: targetAptId,
            items: cleanItems,
            total: totalNum,
            finalTotal: totalNum,
            remainingAmount: totalNum,
            status: 'PENDING_PAYMENT',
            submittedAt: new Date().toISOString(),
          };
          return updated;
        }

        const thisId = 'inv-' + Date.now();
        const newInvoice = {
          id: thisId,
          invoiceNumber: formatInvoiceNumber(Date.now()),
          appointmentId: targetAptId,
          clientId: clientId || null,
          clientName: clientName || 'Client Visit',
          status: 'PENDING_PAYMENT',
          date: today,
          items: cleanItems,
          total: totalNum,
          finalTotal: totalNum,
          paidAmount: 0,
          remainingAmount: totalNum,
          discount: 0,
          paymentMethod: null,
          paidAt: null,
          paidTime: null,
          payments: [],
          pointsEarned: 0,
          pointsRedeemed: 0,
          createdAt: new Date().toISOString(),
          submittedAt: new Date().toISOString(),
        };

        return [newInvoice, ...prev];
      });

      return true;
    },
    []
  );

  // Submit completed single-technician appointment invoice to Reception
  const submitAppointmentInvoice = useCallback(
    async ({ appointmentId, clientId, clientName, items, total, introducedBy, introducedById }) => {
      const targetAptId =
        appointmentId !== undefined && appointmentId !== null
          ? String(appointmentId)
          : null;
      const today = new Date().toISOString().slice(0, 10);
      const isBackendApt = Boolean(targetAptId && targetAptId.includes('-'));

      // 1. Try Backend Invoice Creation if UUID
      if (isBackendApt) {
        try {
          const res = await invoicesApi.create({
            appointmentId: targetAptId,
            discount: 0,
            status: 'PENDING_PAYMENT',
          });
          const invoiceObj = res?.data?.invoice || res?.data || res;
          if (invoiceObj && invoiceObj.id) {
            const formatted = formatBackendInvoice(invoiceObj);
            setInvoices((prev) => [
              formatted,
              ...prev.filter((i) => String(i.id) !== String(formatted.id)),
            ]);
            await refreshInvoices();
            return formatted.id;
          }
        } catch (err) {
          console.warn('Backend invoice creation note:', err.message);
          if (err.status === 409 || err.message?.includes('already exists')) {
            await refreshInvoices();
          }
        }
      }

      // 2. Prepare standardized invoice items
      const cleanItems = (items || []).map((it, idx) => ({
        id: it.id || `item-${Date.now()}-${idx}`,
        appointmentServiceId: it.appointmentServiceId || `asvc-${Date.now()}-${idx}`,
        serviceId: it.serviceId || null,
        service: it.service || 'Service',
        technician: it.technician || 'Technician',
        technicianId: it.technicianId || null,
        product: it.product || null,
        price:
          typeof it.price === 'number'
            ? it.price
            : parseInt(String(it.price || '0').replace(/[^0-9]/g, ''), 10) || 15000,
        appointmentId: targetAptId,
      }));

      const finalTotalNum =
        typeof total === 'number'
          ? total
          : cleanItems.reduce((sum, it) => sum + it.price, 0);

      // 3. Update or insert into local state with PENDING_PAYMENT status
      setInvoices((prev) => {
        const existingIdx = targetAptId
          ? prev.findIndex(
              (inv) =>
                String(inv.appointmentId) === String(targetAptId) ||
                inv.items?.some((it) => String(it.appointmentId) === String(targetAptId))
            )
          : -1;

        if (existingIdx >= 0) {
          const existing = prev[existingIdx];
          if (existing.status === 'PAID') return prev;

          const updated = [...prev];
          updated[existingIdx] = {
            ...existing,
            appointmentId: targetAptId,
            clientId: clientId || existing.clientId || null,
            clientName: clientName || existing.clientName || 'Client',
            items: cleanItems.length > 0 ? cleanItems : existing.items,
            total: finalTotalNum,
            finalTotal: finalTotalNum,
            remainingAmount: finalTotalNum,
            status: 'PENDING_PAYMENT',
            submittedAt: new Date().toISOString(),
            introducedBy: existing.introducedBy || introducedBy || null,
            introducedById: existing.introducedById || introducedById || null,
          };
          return updated;
        }

        const newId = 'inv-' + Date.now();
        const newInvoice = {
          id: newId,
          invoiceNumber: formatInvoiceNumber(Date.now()),
          appointmentId: targetAptId,
          clientId: clientId || null,
          clientName: clientName || 'Client Visit',
          status: 'PENDING_PAYMENT',
          date: today,
          items: cleanItems,
          total: finalTotalNum,
          finalTotal: finalTotalNum,
          paidAmount: 0,
          remainingAmount: finalTotalNum,
          discount: 0,
          paymentMethod: null,
          paidAt: null,
          paidTime: null,
          payments: [],
          pointsEarned: 0,
          pointsRedeemed: 0,
          createdAt: new Date().toISOString(),
          submittedAt: new Date().toISOString(),
          introducedBy: introducedBy || null,
          introducedById: introducedById || null,
        };
        return [newInvoice, ...prev];
      });

      return true;
    },
    [refreshInvoices]
  );

  return (
    <InvoiceContext.Provider
      value={{
        invoices,
        loading,
        error,
        refreshInvoices,
        findOpenInvoice,
        createOrAddToInvoice,
        submitInvoice,
        submitInvoiceByClient,
        submitAppointmentInvoice,
        markInvoicePaid,
        recordPartialPayment,
        getInvoice,
        getPendingInvoices,
        getPaidInvoices,
        getPaidTodayInvoices,
        getHistoryInvoices,
        getAllInvoices,
        getInvoiceByAppointment,
        isAppointmentInvoiced,
        addRetailItemToInvoice,
        removeRetailItemFromInvoice,
        createRetailSaleInvoice,
        addServiceToInvoice,
        removeServiceFromInvoice,
        getOpenVisits,
        submitSharedWorkInvoice,
      }}
    >
      {children}
    </InvoiceContext.Provider>
  );
}

export function useInvoices() {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error('useInvoices must be used within an InvoiceProvider');
  }
  return context;
}
