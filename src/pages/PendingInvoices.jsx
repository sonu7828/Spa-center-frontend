/**
 * PendingInvoices — Reception & Manager Invoices Management
 *
 * Simple Tabs:
 *   1. Pending      → Review, loyalty redemption, payment collection
 *   2. Paid Today   → All invoices paid today with quick receipt reprint
 *   3. History      → Simple historical paid invoices archive
 *
 * Flow:
 *   PENDING PAYMENT → (Collect Payment) → PAID
 *   Invoices remain stored in shared state and move to Paid Today / History.
 *
 * Actions on Paid Invoice:
 *   - [ Print Receipt ]  → Opens formatted printable receipt
 *   - [ Send / Resend WhatsApp Receipt ] → Structure ready for WhatsApp API
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  DollarSign,
  Printer,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Award,
  Sparkles,
  Calendar,
  Clock,
  User,
  CreditCard,
  Check,
  Plus,
  ShoppingBag,
  Coffee,
  X,
} from 'lucide-react';

import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import ReceiptModal from '../components/ReceiptModal';
import { useInvoices, formatInvoiceNumber } from '../context/InvoiceContext';
import { useOperations } from '../context/OperationsContext';
import { useClients } from '../context/ClientsContext';
import { useLoyalty } from '../context/LoyaltyContext';
import { useWhatsApp } from '../context/WhatsAppContext';
import { useFeedback } from '../context/FeedbackContext';
import { useAuth } from '../context/AuthContext';
import { useRetail } from '../context/RetailContext';
import { useCommission } from '../context/CommissionContext';
import { useAppointments } from '../context/AppointmentsContext';
import { whatsappApi } from '../services/api';

const STATUS_COLORS = {
  DRAFT: 'bg-border text-muted-gray',
  PENDING_PAYMENT: 'bg-warning-soft text-warning border border-warning/30',
  PAID: 'bg-success-soft text-success border border-success/30',
};

// Payment methods: exactly CASH, MTN MOMO, ORANGE MONEY
const PAYMENT_METHODS = [
  { key: 'CASH', label: 'CASH' },
  { key: 'MTN MOMO', label: 'MTN MOMO' },
  { key: 'ORANGE MONEY', label: 'ORANGE MONEY' },
];

function formatPaymentMethod(method) {
  if (!method) return 'CASH';
  const m = String(method).trim().toUpperCase();
  if (m.includes('MTN')) return 'MTN MOMO';
  if (m.includes('ORANGE')) return 'ORANGE MONEY';
  return 'CASH';
}

function paymentLabel(method) {
  return formatPaymentMethod(method);
}

function paymentLabelText(method) {
  return formatPaymentMethod(method);
}

// Categorized invoice items renderer helper
function renderCategorizedItems(items = [], options = {}) {
  const { isEditable = false, invoiceId = null, onRemove = null } = options;

  const services = items.filter((it) => it.type !== 'drink' && it.type !== 'cosmetic');
  const drinks = items.filter((it) => it.type === 'drink');
  const cosmetics = items.filter((it) => it.type === 'cosmetic');

  return (
    <div className="divide-y divide-border/50 text-xs">
      {/* SERVICES */}
      {services.length > 0 && (
        <div>
          <div className="px-4 py-1.5 bg-border/20 text-[10px] font-bold uppercase tracking-wider text-muted-gray flex items-center justify-between">
            <span>SERVICES</span>
            <span className="text-[9px] font-semibold text-muted-gray">{services.length}</span>
          </div>
          <div className="divide-y divide-border/30">
            {services.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="font-semibold text-charcoal">{item.service}</p>
                  <p className="text-[11px] text-muted-gray">
                    Tech: {item.technician || 'Staff'}
                    {item.product ? ` · Product: ${item.product}` : ''}
                  </p>
                </div>
                <p className="font-bold text-charcoal">
                  {(item.price || 0).toLocaleString('en-US')} FCFA
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DRINKS */}
      {drinks.length > 0 && (
        <div>
          <div className="px-4 py-1.5 bg-border/20 text-[10px] font-bold uppercase tracking-wider text-muted-gray flex items-center justify-between">
            <span className="flex items-center gap-1.5">🥤 DRINKS</span>
            <span className="text-[9px] font-semibold text-muted-gray">{drinks.length}</span>
          </div>
          <div className="divide-y divide-border/30">
            {drinks.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  {isEditable && onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(invoiceId, item.id)}
                      className="w-5 h-5 rounded-full hover:bg-error-soft text-muted-gray hover:text-error flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="Remove item from invoice"
                    >
                      <X size={12} />
                    </button>
                  )}
                  <div>
                    <p className="font-semibold text-charcoal">{item.name || item.service}</p>
                    <p className="text-[11px] text-muted-gray">
                      {item.qty && item.qty > 1
                        ? `Qty: ${item.qty} · (${(item.unitPrice || Math.round(item.price / item.qty)).toLocaleString('en-US')} FCFA each)`
                        : 'Retail Drink'}
                    </p>
                  </div>
                </div>
                <p className="font-bold text-charcoal">
                  {(item.price || 0).toLocaleString('en-US')} FCFA
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COSMETICS */}
      {cosmetics.length > 0 && (
        <div>
          <div className="px-4 py-1.5 bg-border/20 text-[10px] font-bold uppercase tracking-wider text-muted-gray flex items-center justify-between">
            <span className="flex items-center gap-1.5">✨ COSMETICS</span>
            <span className="text-[9px] font-semibold text-muted-gray">{cosmetics.length}</span>
          </div>
          <div className="divide-y divide-border/30">
            {cosmetics.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  {isEditable && onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(invoiceId, item.id)}
                      className="w-5 h-5 rounded-full hover:bg-error-soft text-muted-gray hover:text-error flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="Remove item from invoice"
                    >
                      <X size={12} />
                    </button>
                  )}
                  <div>
                    <p className="font-semibold text-charcoal">{item.name || item.service}</p>
                    <p className="text-[11px] text-muted-gray">
                      {item.qty && item.qty > 1
                        ? `Qty: ${item.qty} · (${(item.unitPrice || Math.round(item.price / item.qty)).toLocaleString('en-US')} FCFA each)`
                        : 'Retail Cosmetic'}
                    </p>
                  </div>
                </div>
                <p className="font-bold text-charcoal">
                  {(item.price || 0).toLocaleString('en-US')} FCFA
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PendingInvoices() {
  const navigate = useNavigate();
  const { user, allUsers } = useAuth();
  const canSellRetail = user?.role === 'manager' || user?.role === 'reception';

  const {
    invoices,
    getPendingInvoices,
    getPaidTodayInvoices,
    getHistoryInvoices,
    markInvoicePaid,
    addRetailItemToInvoice,
    removeRetailItemFromInvoice,
    createRetailSaleInvoice,
  } = useInvoices();

  const { drinks, cosmetics, deductRetailStock } = useRetail();

  const { closeServiceRecord, isAppointmentClosed, isServiceClosed, recordRetailSale } = useOperations();
  const { clients, addClientServiceHistory, getClient } = useClients();
  const {
    earnPoints,
    redeemPoints,
    getClientLoyalty,
    settings,
    calculateDiscount,
    calculateEarnedPoints,
  } = useLoyalty();
  const { getAutomation } = useWhatsApp();
  const { createFeedbackRequest } = useFeedback();
  const { calculateAndAddCommission, commissionRate } = useCommission();
  const { appointments } = useAppointments();

  // Active tab: 'pending' | 'paid-today' | 'history'
  const [activeTab, setActiveTab] = useState('pending');

  // Expanded accordion in Pending & Paid Today lists
  const [expandedId, setExpandedId] = useState(null);

  // Payment method selection per invoice in Pending view
  const [paymentMethods, setPaymentMethods] = useState({});

  // Loyalty redemption state per invoice in Pending view
  const [redeemState, setRedeemState] = useState({});

  // Receipt modal state
  const [receiptInvoice, setReceiptInvoice] = useState(null);

  // Detail modal state for History view
  const [detailInvoice, setDetailInvoice] = useState(null);

  // Feedback notifications (e.g. WhatsApp receipt queued)
  const [whatsAppFeedback, setWhatsAppFeedback] = useState({});
  const [sendingWhatsAppId, setSendingWhatsAppId] = useState(null);
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState(null);

  // Retail product picker modal (for existing pending invoice)
  const [retailModalInvoiceId, setRetailModalInvoiceId] = useState(null);
  const [retailPickerTab, setRetailPickerTab] = useState('drinks');
  const [retailAddedNotice, setRetailAddedNotice] = useState('');
  const [addRetailQuantities, setAddRetailQuantities] = useState({});

  // New Retail Sale Flow State
  const [showNewRetailSaleModal, setShowNewRetailSaleModal] = useState(false);
  const [newSaleClientId, setNewSaleClientId] = useState('');
  const [newSaleCart, setNewSaleCart] = useState([]);
  const [newSaleTab, setNewSaleTab] = useState('drinks');
  const [newSaleQuantities, setNewSaleQuantities] = useState({});
  const [newSalePaymentMethod, setNewSalePaymentMethod] = useState('CASH');
  const [newSaleNotice, setNewSaleNotice] = useState('');

  const pendingInvoices = typeof getPendingInvoices === 'function' ? getPendingInvoices() : [];
  const paidTodayInvoices = typeof getPaidTodayInvoices === 'function' ? getPaidTodayInvoices() : [];
  const historyInvoices = typeof getHistoryInvoices === 'function' ? getHistoryInvoices() : [];

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const setPaymentMethod = (invoiceId, method) => {
    setPaymentMethods((prev) => ({ ...prev, [invoiceId]: method }));
  };

  const toggleRedeem = (invoiceId, clientId) => {
    setRedeemState((prev) => {
      const current = prev[invoiceId] || {};
      if (current.wantRedeem) {
        return { ...prev, [invoiceId]: { wantRedeem: false, points: '' } };
      }
      const loyalty = getClientLoyalty(clientId);
      return {
        ...prev,
        [invoiceId]: {
          wantRedeem: true,
          points: String(Math.min(loyalty.balance, settings.pointsForDiscount)),
        },
      };
    });
  };

  const setRedeemPoints = (invoiceId, pts) => {
    setRedeemState((prev) => ({
      ...prev,
      [invoiceId]: { ...prev[invoiceId], points: pts },
    }));
  };

  // --- New Retail Sale Flow Handlers ---
  const openNewRetailSaleModal = () => {
    setNewSaleClientId('');
    setNewSaleCart([]);
    setNewSaleTab('drinks');
    setNewSaleQuantities({});
    setNewSalePaymentMethod('CASH');
    setNewSaleNotice('');
    setShowNewRetailSaleModal(true);
  };

  const closeNewRetailSaleModal = () => {
    setShowNewRetailSaleModal(false);
    setNewSaleCart([]);
    setNewSaleNotice('');
  };

  const addToNewSaleCart = (product, qtyToAdd = 1) => {
    const qty = Math.max(1, parseInt(qtyToAdd, 10) || 1);
    const existing = newSaleCart.find((it) => it.productId === product.id);
    const currentInCart = existing ? existing.qty : 0;
    const remainingStock = product.stock - currentInCart;

    if (qty > remainingStock) {
      setNewSaleNotice(
        `Only ${product.stock} available in stock (${currentInCart} already in cart)`
      );
      setTimeout(() => setNewSaleNotice(''), 3000);
      return;
    }

    if (existing) {
      setNewSaleCart((prev) =>
        prev.map((it) =>
          it.productId === product.id
            ? {
                ...it,
                qty: it.qty + qty,
                price: (it.unitPrice || product.price) * (it.qty + qty),
              }
            : it
        )
      );
    } else {
      setNewSaleCart((prev) => [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          service: product.name,
          unitPrice: product.price,
          price: product.price * qty,
          qty,
          type: product.type,
          stock: product.stock,
        },
      ]);
    }

    setNewSaleNotice(`Added ${qty}x "${product.name}" to sale`);
    setNewSaleQuantities((prev) => ({ ...prev, [product.id]: 1 }));
    setTimeout(() => setNewSaleNotice(''), 2500);
  };

  const removeFromNewSaleCart = (productId) => {
    setNewSaleCart((prev) => prev.filter((it) => it.productId !== productId));
  };

  const updateNewSaleCartQty = (productId, newQty) => {
    const item = newSaleCart.find((it) => it.productId === productId);
    if (!item) return;
    const clamped = Math.max(1, Math.min(item.stock, newQty));
    setNewSaleCart((prev) =>
      prev.map((it) =>
        it.productId === productId
          ? { ...it, qty: clamped, price: (it.unitPrice || item.price / item.qty) * clamped }
          : it
      )
    );
  };

  const newSaleTotal = newSaleCart.reduce((sum, it) => sum + it.price, 0);

  const handleCollectNewSale = () => {
    if (newSaleCart.length === 0 || newSaleTotal <= 0) return;

    // Revalidate stock before completing the sale
    for (const cartItem of newSaleCart) {
      const source = cartItem.type === 'drink' ? drinks : cosmetics;
      const currentProduct = source.find((p) => p.id === cartItem.productId);
      if (!currentProduct || cartItem.qty > currentProduct.stock) {
        setNewSaleNotice(
          `Cannot complete: "${cartItem.name}" only has ${currentProduct?.stock ?? 0} in stock (requested ${cartItem.qty}).`
        );
        setTimeout(() => setNewSaleNotice(''), 5000);
        return;
      }
    }

    const selectedClient = newSaleClientId
      ? clients.find((c) => String(c.id) === String(newSaleClientId))
      : null;

    const clientName = selectedClient ? selectedClient.name : 'Walk-in Customer';

    // 1. Create paid invoice in shared state
    const paidInvoice = createRetailSaleInvoice({
      client: selectedClient,
      items: newSaleCart,
      paymentMethod: newSalePaymentMethod,
    });

    // 2. Deduct retail stock (deducted ONLY after successful payment)
    deductRetailStock(newSaleCart);

    // 3. Contribute to daily totals (no double counting)
    recordRetailSale({
      amount: newSaleTotal,
      payment: newSalePaymentMethod,
      items: newSaleCart,
      clientName,
      isWalkIn: !selectedClient,
    });

    // 4. Retail products do NOT earn loyalty points (approved rule)
    // No earnPoints call for retail-only sales

    // 5. Close modal, switch to Paid Today, open receipt
    closeNewRetailSaleModal();
    setActiveTab('paid-today');
    setExpandedId(paidInvoice.id);
    setReceiptInvoice(paidInvoice);
    setPaymentSuccessNotice(
      `Retail sale completed for ${clientName} (${newSaleTotal.toLocaleString('en-US')} FCFA via ${newSalePaymentMethod}). Receipt opened.`
    );
    setTimeout(() => setPaymentSuccessNotice(null), 5000);
  };

  // Collect Payment handler — triggers all operations & moves invoice to Paid Today / History
  const handleCollectPayment = (invoice) => {
    const payment = formatPaymentMethod(paymentMethods[invoice.id] || 'CASH');

    const today = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    // Revalidate retail stock before completing payment
    const retailItemsToValidate = invoice.items.filter(
      (it) => it.type === 'drink' || it.type === 'cosmetic'
    );
    for (const item of retailItemsToValidate) {
      const source = item.type === 'drink' ? drinks : cosmetics;
      const currentProduct = source.find(
        (p) => p.id === item.productId || p.name?.toLowerCase() === (item.name || item.service)?.toLowerCase()
      );
      const itemQty = item.qty || 1;
      if (currentProduct && itemQty > currentProduct.stock) {
        setPaymentSuccessNotice(
          `Cannot complete: "${item.name || item.service}" only has ${currentProduct.stock} in stock (requested ${itemQty}).`
        );
        setTimeout(() => setPaymentSuccessNotice(null), 5000);
        return;
      }
    }

    const clientId = invoice.clientId;
    const clientLoyalty = getClientLoyalty(clientId);

    // Calculate loyalty redemption
    const rs = redeemState[invoice.id] || {};
    const enteredPts = parseInt(rs.points, 10) || 0;
    const validPtsToRedeem =
      rs.wantRedeem && enteredPts > 0
        ? Math.min(clientLoyalty.balance, enteredPts)
        : 0;
    const discountAmount = calculateDiscount(validPtsToRedeem);
    const finalTotal = Math.max(0, invoice.total - discountAmount);

    // Loyalty: calculate earned points from SERVICE items ONLY (retail excluded)
    const serviceItemsForLoyalty = invoice.items.filter(
      (it) => it.type !== 'drink' && it.type !== 'cosmetic'
    );
    const serviceSubtotal = serviceItemsForLoyalty.reduce(
      (sum, it) => sum + (typeof it.price === 'number' ? it.price : parseInt(String(it.price).replace(/[^0-9]/g, ''), 10) || 0),
      0
    );
    // Apply discount ratio to service subtotal if discount was applied
    const serviceSubtotalAfterDiscount = discountAmount > 0 && invoice.total > 0
      ? Math.round(serviceSubtotal * (finalTotal / invoice.total))
      : serviceSubtotal;
    const firstServiceName = serviceItemsForLoyalty[0]?.service;
    const earnedPts = serviceSubtotal > 0 ? calculateEarnedPoints(serviceSubtotalAfterDiscount, firstServiceName) : 0;

    // 1. Redeem points if applicable
    if (rs.wantRedeem && validPtsToRedeem >= settings.minPointsToRedeem) {
      redeemPoints(clientId, {
        pointsToRedeem: validPtsToRedeem,
        serviceName: invoice.items.map((it) => it.service).join(', '),
        date: today,
      });
    }

    // 2. For each service item, record operations (idempotent)
    const serviceItems = invoice.items.filter(
      (it) => it.type !== 'drink' && it.type !== 'cosmetic'
    );
    serviceItems.forEach((item) => {
      const itemPriceNum =
        typeof item.price === 'number'
          ? item.price
          : parseInt(String(item.price).replace(/[^0-9]/g, ''), 10) || 0;

      let itemFinalPrice = itemPriceNum;
      if (discountAmount > 0 && invoice.total > 0) {
        const ratio = itemPriceNum / invoice.total;
        itemFinalPrice = Math.round(finalTotal * ratio);
      }

      const itemFinalPriceStr = itemFinalPrice.toLocaleString('en-US');
      const itemSvcId = item.appointmentServiceId || item.id;

      if (!isServiceClosed(itemSvcId, item.appointmentId)) {
        closeServiceRecord({
          appointmentId: item.appointmentId,
          appointmentServiceId: itemSvcId,
          clientId: clientId,
          clientName: invoice.clientName,
          service: item.service,
          technician: item.technician,
          product: item.product,
          price: itemFinalPriceStr,
          payment,
          date: today,
        });
      }

      addClientServiceHistory(clientId, {
        date: today,
        service: item.service,
        technician: item.technician,
        product: item.product,
        price: itemFinalPriceStr,
      });
    });

    // 3. Contribute retail portion to daily totals without double-counting
    const retailItems = invoice.items.filter(
      (it) => it.type === 'drink' || it.type === 'cosmetic'
    );
    if (retailItems.length > 0) {
      const retailSubtotal = retailItems.reduce((sum, it) => sum + (it.price || 0), 0);
      let retailFinalAmount = retailSubtotal;
      if (discountAmount > 0 && invoice.total > 0) {
        const ratio = retailSubtotal / invoice.total;
        retailFinalAmount = Math.round(finalTotal * ratio);
      }
      recordRetailSale({
        amount: retailFinalAmount,
        payment,
        items: retailItems,
        clientName: invoice.clientName,
        isWalkIn: false,
      });
    }

    // 4. Deduct retail stock for sold drinks & cosmetics (never allows negative stock)
    deductRetailStock(invoice.items);

    // 5. Earn loyalty points on SERVICE items only (retail excluded from loyalty)
    if (serviceSubtotal > 0 && clientId) {
      earnPoints(clientId, {
        amount: serviceSubtotalAfterDiscount,
        serviceName: serviceItemsForLoyalty.map((it) => it.service || it.name).join(', '),
        date: today,
      });
    }

    // 6. Create feedback request
    createFeedbackRequest({
      clientId: clientId,
      clientName: invoice.clientName,
      service: invoice.items.map((it) => it.service || it.name).join(', '),
      technician: invoice.items.map((it) => it.technician || 'Staff').join(', '),
    });

    // 6.5. Generate Employee Referral Commission (ONLY after successful payment)
    const linkedClient = clients.find(
      (c) => c.id === invoice.clientId || c.name?.toLowerCase() === invoice.clientName?.toLowerCase()
    );
    const linkedApt = appointments.find(
      (a) => a.id === invoice.appointmentId || a.clientId === invoice.clientId
    );
    const referralEmployee = invoice.introducedBy || linkedApt?.introducedBy || linkedClient?.introducedBy || null;
    const referralEmployeeId = invoice.introducedById || linkedApt?.introducedById || linkedClient?.introducedById || null;

    // Verify referral employee is not a Manager (Manager client creation must never receive referral commission)
    const isManagerEmployee =
      allUsers?.some(
        (u) =>
          (u.role === 'manager' || u.role === 'MANAGER') &&
          (String(u.id) === String(referralEmployeeId) ||
            (referralEmployee && u.name?.toLowerCase() === referralEmployee.toLowerCase()))
      ) ||
      (referralEmployee && referralEmployee.toLowerCase() === 'manager');

    let generatedCommissions = [];
    if (referralEmployee && !isManagerEmployee) {
      serviceItems.forEach((item) => {
        const itemPriceNum =
          typeof item.price === 'number'
            ? item.price
            : parseInt(String(item.price).replace(/[^0-9]/g, ''), 10) || 0;

        let itemFinalPrice = itemPriceNum;
        if (discountAmount > 0 && invoice.total > 0) {
          const ratio = itemPriceNum / invoice.total;
          itemFinalPrice = Math.round(finalTotal * ratio);
        }

        const comm = calculateAndAddCommission({
          date: today,
          clientName: invoice.clientName,
          clientId: invoice.clientId,
          service: item.service,
          serviceAmount: itemFinalPrice,
          performingTechnician: item.technician,
          performingTechnicianId: item.technicianId,
          referralEmployee: referralEmployee,
          referralEmployeeId: referralEmployeeId,
          invoiceId: invoice.id,
          appointmentId: invoice.appointmentId || item.appointmentId,
        });
        if (comm) generatedCommissions.push(comm);
      });
    }

    // 7. Mark invoice paid (NOT removed — moved to Paid Today & History)
    const paidInv = markInvoicePaid(invoice.id, payment, {
      discount: discountAmount,
      finalTotal,
      pointsEarned: earnedPts,
      pointsRedeemed: validPtsToRedeem,
    });

    // Switch to Paid Today tab and expand the paid invoice
    const commTotal = generatedCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);
    const commNotice = commTotal > 0
      ? ` Referral commission of ${commTotal.toLocaleString('en-US')} FCFA (${commissionRate}%) awarded to ${referralEmployee}.`
      : '';

    setActiveTab('paid-today');
    setExpandedId(invoice.id);
    setPaymentSuccessNotice(
      `Payment collected for ${invoice.clientName} (${finalTotal.toLocaleString('en-US')} FCFA via ${payment.toUpperCase()}).${commNotice} Moved to Paid Today.`
    );
    setTimeout(() => setPaymentSuccessNotice(null), 6000);
  };

  // Real WhatsApp receipt action via backend API
  const handleSendWhatsAppReceipt = async (invoice) => {
    if (!invoice) return;
    const client = getClient(invoice.clientId);
    const phone = client?.whatsapp || client?.phone;

    if (!phone) {
      setWhatsAppFeedback((prev) => ({
        ...prev,
        [invoice.id]: `Cannot send: No phone number on file for ${invoice.clientName || 'this client'}.`,
      }));
      setTimeout(() => {
        setWhatsAppFeedback((prev) => ({ ...prev, [invoice.id]: null }));
      }, 5000);
      return;
    }

    setSendingWhatsAppId(invoice.id);
    try {
      if (invoice.id) {
        await whatsappApi.triggerPaymentConfirmation(invoice.id);
      }
      setWhatsAppFeedback((prev) => ({
        ...prev,
        [invoice.id]: `WhatsApp receipt sent to ${invoice.clientName || 'Client'} (${phone}).`,
      }));
    } catch (err) {
      // Fallback to custom direct message dispatch
      try {
        const receiptText = `Hello ${invoice.clientName || 'Valued Guest'}, here is your receipt from OMEGA SPA: Invoice ${formatInvoiceNumber(invoice.invoiceNumber || invoice.id)}. Total Paid: ${(invoice.totalAmount || invoice.total || 0).toLocaleString('en-US')} FCFA. Thank you for visiting OMEGA SPA!`;
        await whatsappApi.sendMessage({
          recipientPhone: phone,
          message: receiptText,
          automationType: 'PAYMENT_CONFIRMATION',
          clientId: invoice.clientId,
          invoiceId: invoice.id,
        });
        setWhatsAppFeedback((prev) => ({
          ...prev,
          [invoice.id]: `WhatsApp receipt dispatched to ${invoice.clientName || 'Client'} (${phone}).`,
        }));
      } catch (fallbackErr) {
        setWhatsAppFeedback((prev) => ({
          ...prev,
          [invoice.id]: `Failed to send WhatsApp receipt: ${fallbackErr?.message || err?.message || 'Network error'}`,
        }));
      }
    } finally {
      setSendingWhatsAppId(null);
      setTimeout(() => {
        setWhatsAppFeedback((prev) => ({ ...prev, [invoice.id]: null }));
      }, 6000);
    }
  };

  return (
    <div>
      <PageHeader
        title="Invoices"
        action={
          canSellRetail ? (
            <Button onClick={openNewRetailSaleModal}>
              <Plus size={16} strokeWidth={2.5} />
              New Retail Sale
            </Button>
          ) : null
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
        <div
          onClick={() => setActiveTab('pending')}
          className={`bg-white border rounded-[14px] p-3 sm:p-4 shadow-card cursor-pointer transition-all ${
            activeTab === 'pending'
              ? 'border-warning ring-2 ring-warning/20'
              : 'border-border hover:border-warning/50'
          }`}
        >
          <p className="text-[10px] sm:text-xs text-muted-gray uppercase tracking-wider font-semibold truncate">
            Pending
          </p>
          <p className="text-xl sm:text-2xl font-bold text-warning mt-1">
            {pendingInvoices.length}
          </p>
        </div>

        <div
          onClick={() => setActiveTab('paid-today')}
          className={`bg-white border rounded-[14px] p-3 sm:p-4 shadow-card cursor-pointer transition-all ${
            activeTab === 'paid-today'
              ? 'border-success ring-2 ring-success/20'
              : 'border-border hover:border-success/50'
          }`}
        >
          <p className="text-[10px] sm:text-xs text-muted-gray uppercase tracking-wider font-semibold truncate">
            Paid Today
          </p>
          <p className="text-xl sm:text-2xl font-bold text-success mt-1">
            {paidTodayInvoices.length}
          </p>
        </div>

        <div
          onClick={() => setActiveTab('history')}
          className={`bg-white border rounded-[14px] p-3 sm:p-4 shadow-card cursor-pointer transition-all ${
            activeTab === 'history'
              ? 'border-sage ring-2 ring-sage/20'
              : 'border-border hover:border-sage/50'
          }`}
        >
          <p className="text-[10px] sm:text-xs text-muted-gray uppercase tracking-wider font-semibold truncate">
            History
          </p>
          <p className="text-xl sm:text-2xl font-bold text-charcoal mt-1">
            {historyInvoices.length}
          </p>
        </div>
      </div>

      {/* Payment Success Toast */}
      {paymentSuccessNotice && (
        <div className="mb-5 flex items-center justify-between px-4 py-3 bg-success-soft border border-success/30 rounded-[12px] text-xs text-success font-medium animate-fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 size={16} className="shrink-0" />
            <span className="truncate">{paymentSuccessNotice}</span>
          </div>
          <button
            onClick={() => setPaymentSuccessNotice(null)}
            className="text-success hover:text-charcoal cursor-pointer ml-2 shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Modern Tab Bar */}
      <div className="flex border-b border-border mb-6 gap-1 sm:gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'pending'
              ? 'border-sage text-charcoal font-bold'
              : 'border-transparent text-muted-gray hover:text-charcoal'
          }`}
        >
          <span>Pending</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              activeTab === 'pending'
                ? 'bg-warning-soft text-warning'
                : 'bg-soft-cream text-muted-gray'
            }`}
          >
            {pendingInvoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('paid-today')}
          className={`pb-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'paid-today'
              ? 'border-sage text-charcoal font-bold'
              : 'border-transparent text-muted-gray hover:text-charcoal'
          }`}
        >
          <span>Paid Today</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              activeTab === 'paid-today'
                ? 'bg-success-soft text-success'
                : 'bg-soft-cream text-muted-gray'
            }`}
          >
            {paidTodayInvoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'history'
              ? 'border-sage text-charcoal font-bold'
              : 'border-transparent text-muted-gray hover:text-charcoal'
          }`}
        >
          <span>History</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              activeTab === 'history'
                ? 'bg-sage-soft text-sage'
                : 'bg-soft-cream text-muted-gray'
            }`}
          >
            {historyInvoices.length}
          </span>
        </button>
      </div>

      {/* ============================================================
          TAB 1: PENDING INVOICES
          ============================================================ */}
      {activeTab === 'pending' && (
        <div>
          {pendingInvoices.length === 0 ? (
            <div className="bg-white border border-border rounded-[16px] p-8 shadow-card text-center">
              <FileText size={40} className="text-border mx-auto mb-3" />
              <p className="text-sm font-semibold text-charcoal">No pending invoices.</p>
              <p className="text-xs text-muted-gray mt-1">
                Invoices appear here after a technician completes a service.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingInvoices.map((invoice) => {
                const isExpanded = expandedId === invoice.id;
                const selectedPayment = formatPaymentMethod(paymentMethods[invoice.id] || 'CASH');
                const clientLoyalty = getClientLoyalty(invoice.clientId);
                const rs = redeemState[invoice.id] || {};
                const enteredPts = parseInt(rs.points, 10) || 0;
                const validPtsToRedeem =
                  rs.wantRedeem && enteredPts > 0
                    ? Math.min(clientLoyalty.balance, enteredPts)
                    : 0;
                const discountAmount = calculateDiscount(validPtsToRedeem);
                const finalTotal = Math.max(0, invoice.total - discountAmount);
                const invNum = formatInvoiceNumber(invoice);

                return (
                  <div
                    key={invoice.id}
                    className="bg-white border border-border rounded-[16px] shadow-card overflow-hidden"
                  >
                    {/* Invoice Row / Header */}
                    <button
                      onClick={() => toggleExpand(invoice.id)}
                      className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 hover:bg-sage-soft/20 transition-colors duration-150 cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                        <div className="w-9 h-9 rounded-full bg-warning-soft flex items-center justify-center shrink-0">
                          <FileText size={18} className="text-warning" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-muted-gray">
                              {invNum}
                            </span>
                            <span className="text-sm font-bold text-charcoal truncate">
                              {invoice.clientName}
                            </span>
                          </div>
                          <p className="text-xs text-muted-gray truncate mt-0.5">
                            {invoice.items.map((it) => it.service).join(', ')} ·{' '}
                            {invoice.items
                              .map((it) => it.technician)
                              .filter((v, i, a) => a.indexOf(v) === i)
                              .join(', ')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t border-border/40 sm:border-0">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-bold text-charcoal">
                            {invoice.total.toLocaleString('en-US')}{' '}
                            <span className="text-xs font-normal">FCFA</span>
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px] bg-warning-soft text-warning border border-warning/30">
                            Pending
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-muted-gray shrink-0" />
                        ) : (
                          <ChevronDown size={16} className="text-muted-gray shrink-0" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Review & Payment Section */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-0 border-t border-border">
                        {/* Invoice Items (Services + Drinks + Cosmetics) */}
                        <div className="mt-4 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold text-muted-gray uppercase tracking-wider">
                              Invoice Items
                            </p>
                            {canSellRetail && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRetailModalInvoiceId(invoice.id);
                                  setRetailAddedNotice('');
                                  setAddRetailQuantities({});
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] bg-sage-soft hover:bg-sage/20 text-charcoal text-xs font-bold transition-all cursor-pointer border border-sage/30 shadow-2xs"
                              >
                                <ShoppingBag size={13} strokeWidth={2.5} className="text-sage" />
                                <span>Add Retail Item</span>
                              </button>
                            )}
                          </div>

                          <div className="bg-soft-cream/40 rounded-[12px] border border-border/70 overflow-hidden">
                            {renderCategorizedItems(invoice.items, {
                              isEditable: true,
                              invoiceId: invoice.id,
                              onRemove: removeRetailItemFromInvoice,
                            })}
                            <div className="flex justify-between px-4 py-3 bg-sage-soft/40 font-bold text-sm text-charcoal border-t border-border/50">
                              <span>Subtotal</span>
                              <span>{invoice.total.toLocaleString('en-US')} FCFA</span>
                            </div>
                          </div>
                        </div>

                        {/* Loyalty Redemption */}
                        <div className="mb-4 bg-soft-cream/40 border border-border/80 rounded-[14px] p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Award size={16} className="text-sage" />
                              <span className="text-xs font-semibold text-charcoal uppercase tracking-wider">
                                Loyalty Points
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-sage bg-sage-soft px-2.5 py-1 rounded-[6px] border border-sage/20">
                              {clientLoyalty.balance} pts available
                            </span>
                          </div>

                          {clientLoyalty.balance >= settings.minPointsToRedeem ? (
                            <div className="mt-2 pt-2 border-t border-border/60">
                              <label className="flex items-center gap-2 text-xs font-medium text-charcoal cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={rs.wantRedeem || false}
                                  onChange={() =>
                                    toggleRedeem(invoice.id, invoice.clientId)
                                  }
                                  className="w-4 h-4 text-sage accent-sage cursor-pointer rounded"
                                />
                                <span>Redeem points for discount</span>
                              </label>

                              {rs.wantRedeem && (
                                <div className="mt-2 pl-6 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min={settings.minPointsToRedeem}
                                      max={clientLoyalty.balance}
                                      step={settings.pointsForDiscount}
                                      value={rs.points || ''}
                                      onChange={(e) =>
                                        setRedeemPoints(invoice.id, e.target.value)
                                      }
                                      className="w-28 h-[36px] px-3 bg-white border border-border rounded-[8px] text-xs text-charcoal font-semibold outline-none focus:border-sage"
                                    />
                                    <span className="text-xs text-muted-gray">
                                      pts = {discountAmount.toLocaleString()} FCFA discount
                                    </span>
                                  </div>
                                  {discountAmount > 0 && (
                                    <>
                                      <p className="text-xs font-medium text-success">
                                        Discount: -{discountAmount.toLocaleString()} FCFA
                                      </p>
                                      <p className="text-sm font-bold text-charcoal">
                                        Final Total: {finalTotal.toLocaleString('en-US')} FCFA
                                      </p>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-gray mt-1">
                              Min {settings.minPointsToRedeem} pts required ({clientLoyalty.balance} available).
                            </p>
                          )}

                          <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                            <span className="text-muted-gray">Points to earn:</span>
                            <span className="font-semibold text-success flex items-center gap-1">
                              <Sparkles size={12} /> +
                              {calculateEarnedPoints(
                                finalTotal,
                                invoice.items[0]?.service
                              )}{' '}
                              pts
                            </span>
                          </div>
                        </div>

                        {/* Payment Method Selector */}
                        <div className="mb-5">
                          <p className="text-[10px] font-bold text-muted-gray uppercase tracking-wider mb-2">
                            Payment Method:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {PAYMENT_METHODS.map((pm) => {
                              const isSelected = selectedPayment === pm.key;
                              return (
                                <button
                                  key={pm.key}
                                  type="button"
                                  onClick={() => setPaymentMethod(invoice.id, pm.key)}
                                  className={`h-[44px] px-3.5 rounded-[11px] text-xs font-bold border transition-all duration-150 cursor-pointer flex items-center justify-start gap-2.5 ${
                                    isSelected
                                      ? 'bg-sage-soft border-sage text-charcoal ring-1 ring-sage/40'
                                      : 'bg-white border-border text-charcoal/80 hover:border-sage/40 hover:bg-soft-cream/30'
                                  }`}
                                >
                                  <span
                                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                      isSelected
                                        ? 'border-sage bg-sage'
                                        : 'border-muted-gray/50 bg-white'
                                    }`}
                                  >
                                    {isSelected && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                    )}
                                  </span>
                                  <span>{pm.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Collect Payment CTA */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border">
                          <div className="text-xs text-muted-gray">
                            Collecting will mark status as{' '}
                            <span className="font-bold text-success">PAID</span> and move
                            to Paid Today.
                          </div>
                          <Button className="w-full sm:w-auto" onClick={() => handleCollectPayment(invoice)}>
                            <DollarSign size={16} strokeWidth={1.8} />
                            Collect Payment (
                            {(discountAmount > 0
                              ? finalTotal
                              : invoice.total
                            ).toLocaleString('en-US')}{' '}
                            FCFA)
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 2: PAID TODAY
          ============================================================ */}
      {activeTab === 'paid-today' && (
        <div>
          {paidTodayInvoices.length === 0 ? (
            <div className="bg-white border border-border rounded-[16px] p-8 shadow-card text-center">
              <CheckCircle2 size={40} className="text-border mx-auto mb-3" />
              <p className="text-sm font-semibold text-charcoal">No invoices paid today yet.</p>
              <p className="text-xs text-muted-gray mt-1">
                Completed invoices will appear here once payment is collected.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paidTodayInvoices.map((invoice) => {
                const isExpanded = expandedId === invoice.id;
                const invNum = formatInvoiceNumber(invoice);
                const servicesList = invoice.items.map((it) => it.service).join(', ');
                const techList = invoice.items
                  .map((it) => it.technician)
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .join(', ');

                const paidTimeDisplay =
                  invoice.paidTime ||
                  (invoice.paidAt
                    ? new Date(invoice.paidAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Today');

                const totalAmount =
                  invoice.finalTotal !== undefined ? invoice.finalTotal : invoice.total;

                const paymentBadge = formatPaymentMethod(invoice.paymentMethod);

                const clientLoyalty = getClientLoyalty(invoice.clientId);

                return (
                  <div
                    key={invoice.id}
                    className="bg-white border border-border rounded-[16px] shadow-card overflow-hidden transition-all"
                  >
                    {/* Paid Card Header / Row */}
                    <button
                      onClick={() => toggleExpand(invoice.id)}
                      className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 hover:bg-sage-soft/10 transition-colors duration-150 cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                        <div className="w-10 h-10 rounded-full bg-success-soft flex items-center justify-center shrink-0">
                          <CheckCircle2 size={20} className="text-success" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-charcoal bg-soft-cream px-2 py-0.5 rounded">
                              {invNum}
                            </span>
                            <span className="text-sm font-bold text-charcoal truncate">
                              {invoice.clientName}
                            </span>
                            <span className="text-[11px] text-muted-gray flex items-center gap-1 font-medium">
                              <Clock size={12} />
                              {paidTimeDisplay}
                            </span>
                          </div>
                          <p className="text-xs text-muted-gray mt-1 truncate">
                            <span className="font-medium text-charcoal">{servicesList}</span> ·{' '}
                            <span>Tech: {techList}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t border-border/40 sm:border-0">
                        <div className="text-left sm:text-right">
                          <p className="text-sm font-extrabold text-charcoal">
                            {totalAmount.toLocaleString('en-US')}{' '}
                            <span className="text-xs font-normal">FCFA</span>
                          </p>
                          <span className="text-[10px] font-bold text-muted-gray uppercase">
                            {paymentBadge}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-[6px] bg-success-soft text-success border border-success/30">
                            Paid
                          </span>
                          {isExpanded ? (
                            <ChevronUp size={16} className="text-muted-gray shrink-0" />
                          ) : (
                            <ChevronDown size={16} className="text-muted-gray shrink-0" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Paid Invoice Details (inline expand) */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-0 border-t border-border bg-soft-cream/20">
                        <div className="py-4 space-y-4">
                          {/* Invoice Meta Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-3.5 rounded-[12px] border border-border/80">
                            <div>
                              <span className="text-muted-gray block text-[10px] uppercase font-bold">
                                Invoice Number
                              </span>
                              <span className="font-mono font-bold text-charcoal">
                                {invNum}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-gray block text-[10px] uppercase font-bold">
                                Client
                              </span>
                              <span className="font-semibold text-charcoal truncate block">
                                {invoice.clientName}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-gray block text-[10px] uppercase font-bold">
                                Paid Time
                              </span>
                              <span className="font-semibold text-charcoal">
                                {paidTimeDisplay}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-gray block text-[10px] uppercase font-bold">
                                Payment Method
                              </span>
                              <span className="font-bold text-charcoal uppercase">
                                {formatPaymentMethod(invoice.paymentMethod)}
                              </span>
                            </div>
                          </div>

                          {/* Services & Retail Breakdown */}
                          <div>
                            <p className="text-[10px] font-bold text-muted-gray uppercase tracking-wider mb-2">
                              Invoice Breakdown
                            </p>
                            <div className="bg-white rounded-[12px] border border-border/80 overflow-hidden text-xs">
                              {renderCategorizedItems(invoice.items)}

                              {invoice.discount > 0 && (
                                <div className="flex justify-between px-4 py-2 bg-soft-cream/40 text-success font-medium border-t border-border/40">
                                  <span>Loyalty Discount</span>
                                  <span>-{invoice.discount.toLocaleString('en-US')} FCFA</span>
                                </div>
                              )}

                              <div className="flex justify-between px-4 py-3 bg-sage-soft/30 font-extrabold text-sm text-charcoal border-t border-border/50">
                                <span>Total Paid</span>
                                <span>{totalAmount.toLocaleString('en-US')} FCFA</span>
                              </div>
                            </div>
                          </div>

                          {/* WhatsApp Feedback Notice */}
                          {whatsAppFeedback[invoice.id] && (
                            <div className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#E7F5E9] border border-[#25D366]/30 text-xs text-[#2E7D32]">
                              <MessageCircle size={14} className="text-[#25D366] shrink-0" />
                              <span>{whatsAppFeedback[invoice.id]}</span>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-3 border-t border-border gap-3">
                            <span className="text-xs font-bold text-success flex items-center gap-1.5">
                              <CheckCircle2 size={14} />
                              Status: PAID
                            </span>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                              <Button
                                variant="secondary"
                                className="w-full sm:w-auto"
                                disabled={sendingWhatsAppId === invoice.id}
                                onClick={() => handleSendWhatsAppReceipt(invoice)}
                              >
                                <MessageCircle size={15} className={sendingWhatsAppId === invoice.id ? 'animate-spin text-[#25D366]' : 'text-[#25D366]'} />
                                {sendingWhatsAppId === invoice.id ? 'Sending...' : 'Send WhatsApp Receipt'}
                              </Button>

                              <Button
                                className="w-full sm:w-auto"
                                onClick={() => setReceiptInvoice(invoice)}
                              >
                                <Printer size={15} strokeWidth={1.8} />
                                Print Receipt
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 3: HISTORY (All Paid Invoices Archive)
          ============================================================ */}
      {activeTab === 'history' && (
        <div>
          {historyInvoices.length === 0 ? (
            <div className="bg-white border border-border rounded-[16px] p-8 shadow-card text-center">
              <Calendar size={40} className="text-border mx-auto mb-3" />
              <p className="text-sm font-semibold text-charcoal">No history invoices recorded.</p>
            </div>
          ) : (
            <div className="bg-white border border-border rounded-[16px] shadow-card overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-soft-cream/60 border-b border-border text-[10px] font-bold text-muted-gray uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {historyInvoices.map((invoice) => {
                      const invNum = formatInvoiceNumber(invoice);
                      const totalAmount =
                        invoice.finalTotal !== undefined
                          ? invoice.finalTotal
                          : invoice.total;

                      const dateDisplay = invoice.paidAt
                        ? new Date(invoice.paidAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : invoice.date;

                      const paymentLabel_ = formatPaymentMethod(invoice.paymentMethod);

                      return (
                        <tr
                          key={invoice.id}
                          className="hover:bg-sage-soft/20 transition-colors cursor-pointer"
                          onClick={() => setDetailInvoice(invoice)}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-charcoal">
                            {invNum}
                          </td>
                          <td className="py-3.5 px-4 text-muted-gray font-medium">
                            {dateDisplay}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-charcoal">
                            {invoice.clientName}
                          </td>
                          <td className="py-3.5 px-4 font-extrabold text-charcoal">
                            {totalAmount.toLocaleString('en-US')} FCFA
                          </td>
                          <td className="py-3.5 px-4 font-bold text-charcoal uppercase">
                            {paymentLabel_}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-[5px] bg-success-soft text-success border border-success/30">
                              Paid
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="secondary"
                                className="!py-1 !px-2.5 !text-xs !h-[30px]"
                                onClick={() => setDetailInvoice(invoice)}
                              >
                                Details
                              </Button>
                              <button
                                onClick={() => setReceiptInvoice(invoice)}
                                title="Print Receipt"
                                className="w-8 h-8 rounded-[8px] bg-sage-soft/60 hover:bg-sage-soft flex items-center justify-center text-charcoal transition-colors cursor-pointer"
                              >
                                <Printer size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile / Tablet Portrait Card View */}
              <div className="block md:hidden divide-y divide-border/60">
                {historyInvoices.map((invoice) => {
                  const invNum = formatInvoiceNumber(invoice);
                  const totalAmount =
                    invoice.finalTotal !== undefined
                      ? invoice.finalTotal
                      : invoice.total;

                  const dateDisplay = invoice.paidAt
                    ? new Date(invoice.paidAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : invoice.date;

                  const paymentLabel_ = formatPaymentMethod(invoice.paymentMethod);

                  return (
                    <div
                      key={invoice.id}
                      onClick={() => setDetailInvoice(invoice)}
                      className="p-4 hover:bg-sage-soft/10 transition-colors cursor-pointer space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-charcoal bg-soft-cream px-2 py-0.5 rounded">
                            {invNum}
                          </span>
                          <span className="text-xs text-muted-gray font-medium">
                            {dateDisplay}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-[5px] bg-success-soft text-success border border-success/30">
                          Paid
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-charcoal">{invoice.clientName}</p>
                          <p className="text-xs text-muted-gray uppercase font-semibold mt-0.5">
                            {paymentLabel_}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-extrabold text-charcoal">
                            {totalAmount.toLocaleString('en-US')} FCFA
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="secondary"
                          className="flex-1 !h-[38px] !text-xs font-semibold"
                          onClick={() => setDetailInvoice(invoice)}
                        >
                          Details
                        </Button>
                        <Button
                          className="flex-1 !h-[38px] !text-xs font-semibold"
                          onClick={() => setReceiptInvoice(invoice)}
                        >
                          <Printer size={14} className="mr-1" />
                          Receipt
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          PAID INVOICE DETAILS MODAL (Available from History & Paid list)
          ============================================================ */}
      {detailInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-[20px] max-w-[calc(100vw-24px)] sm:max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-sage" />
                <span className="font-bold text-sm text-charcoal">
                  Paid Invoice Details
                </span>
              </div>
              <button
                onClick={() => setDetailInvoice(null)}
                className="w-8 h-8 rounded-full hover:bg-soft-cream flex items-center justify-center text-muted-gray hover:text-charcoal cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              {/* Header Info */}
              <div className="bg-soft-cream/50 p-4 rounded-[12px] border border-border/70 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-gray uppercase font-bold text-[10px]">
                    Invoice Number
                  </span>
                  <span className="font-mono font-bold text-sm text-charcoal">
                    {formatInvoiceNumber(detailInvoice)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-gray uppercase font-bold text-[10px]">
                    Client
                  </span>
                  <span className="font-bold text-charcoal">
                    {detailInvoice.clientName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-gray uppercase font-bold text-[10px]">
                    Date / Time
                  </span>
                  <span className="font-medium text-charcoal">
                    {detailInvoice.paidAt
                      ? new Date(detailInvoice.paidAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : detailInvoice.date}{' '}
                    · {detailInvoice.paidTime || '12:00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-gray uppercase font-bold text-[10px]">
                    Status
                  </span>
                  <span className="font-bold text-success bg-success-soft px-2 py-0.5 rounded text-[10px] border border-success/30">
                    PAID
                  </span>
                </div>
              </div>

              {/* Services & Retail Items List */}
              <div>
                <p className="text-[10px] font-bold text-muted-gray uppercase tracking-wider mb-2">
                  Invoice Breakdown
                </p>
                <div className="bg-white rounded-[12px] border border-border overflow-hidden">
                  {renderCategorizedItems(detailInvoice.items)}

                  {detailInvoice.discount > 0 && (
                    <div className="flex justify-between px-4 py-2 border-t border-border text-success font-medium">
                      <span>Loyalty Discount</span>
                      <span>-{detailInvoice.discount.toLocaleString('en-US')} FCFA</span>
                    </div>
                  )}
                  <div className="flex justify-between px-4 py-3 bg-sage-soft/30 border-t border-border font-extrabold text-sm text-charcoal">
                    <span>Total</span>
                    <span>
                      {(detailInvoice.finalTotal !== undefined
                        ? detailInvoice.finalTotal
                        : detailInvoice.total
                      ).toLocaleString('en-US')}{' '}
                      FCFA
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="flex justify-between items-center bg-white p-3.5 rounded-[12px] border border-border">
                <span className="text-muted-gray uppercase font-bold text-[10px]">
                  Payment Method
                </span>
                <span className="font-bold text-charcoal uppercase">
                  {formatPaymentMethod(detailInvoice.paymentMethod)}
                </span>
              </div>

              {/* WhatsApp Feedback Notice */}
              {whatsAppFeedback[detailInvoice.id] && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#E7F5E9] border border-[#25D366]/30 text-xs text-[#2E7D32]">
                  <MessageCircle size={14} className="text-[#25D366] shrink-0" />
                  <span>{whatsAppFeedback[detailInvoice.id]}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-border bg-white">
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                disabled={sendingWhatsAppId === detailInvoice.id}
                onClick={() => handleSendWhatsAppReceipt(detailInvoice)}
              >
                <MessageCircle size={15} className={sendingWhatsAppId === detailInvoice.id ? 'animate-spin text-[#25D366]' : 'text-[#25D366]'} />
                {sendingWhatsAppId === detailInvoice.id ? 'Sending...' : 'Send WhatsApp Receipt'}
              </Button>

              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  setReceiptInvoice(detailInvoice);
                  setDetailInvoice(null);
                }}
              >
                <Printer size={15} strokeWidth={1.8} />
                Print Receipt
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          ADD RETAIL ITEM TO EXISTING PENDING INVOICE MODAL
          ============================================================ */}
      {retailModalInvoiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-[20px] max-w-[calc(100vw-24px)] sm:max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-sage" />
                <span className="font-bold text-sm text-charcoal">
                  Add Retail Item to Invoice
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRetailModalInvoiceId(null);
                  setRetailAddedNotice('');
                }}
                className="w-8 h-8 rounded-full hover:bg-soft-cream flex items-center justify-center text-muted-gray hover:text-charcoal cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Notification */}
            {retailAddedNotice && (
              <div className="bg-success-soft text-success text-xs font-bold px-4 sm:px-6 py-2 border-b border-success/20 flex items-center gap-2">
                <Check size={14} />
                <span>{retailAddedNotice}</span>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-border px-4 sm:px-6 pt-3 shrink-0 gap-4 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setRetailPickerTab('drinks')}
                className={`pb-2.5 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  retailPickerTab === 'drinks'
                    ? 'border-charcoal text-charcoal'
                    : 'border-transparent text-muted-gray hover:text-charcoal'
                }`}
              >
                <Coffee size={14} />
                <span>Drinks ({drinks.filter((d) => d.active).length})</span>
              </button>
              <button
                type="button"
                onClick={() => setRetailPickerTab('cosmetics')}
                className={`pb-2.5 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  retailPickerTab === 'cosmetics'
                    ? 'border-charcoal text-charcoal'
                    : 'border-transparent text-muted-gray hover:text-charcoal'
                }`}
              >
                <Sparkles size={14} />
                <span>Cosmetics ({cosmetics.filter((c) => c.active).length})</span>
              </button>
            </div>

            {/* Products List */}
            <div className="overflow-y-auto p-4 sm:p-6 space-y-2.5 flex-1">
              {(retailPickerTab === 'drinks' ? drinks : cosmetics)
                .filter((p) => p.active)
                .map((product) => {
                  const isOutOfStock = product.stock <= 0;
                  const qty = addRetailQuantities[product.id] || 1;

                  return (
                    <div
                      key={product.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-[12px] border border-border/80 hover:border-sage/40 bg-white transition-colors gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-charcoal truncate">{product.name}</p>
                        <p className="text-[11px] text-muted-gray mt-0.5">
                          <span className="font-extrabold text-charcoal">
                            {product.price.toLocaleString('en-US')} FCFA
                          </span>
                          {' · '}
                          <span
                            className={
                              isOutOfStock
                                ? 'text-error font-semibold'
                                : product.stock <= 3
                                ? 'text-warning font-semibold'
                                : 'text-muted-gray'
                            }
                          >
                            {isOutOfStock ? 'Out of stock' : `${product.stock} in stock`}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t border-border/40 sm:border-0">
                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isOutOfStock || qty <= 1}
                            onClick={() =>
                              setAddRetailQuantities((prev) => ({
                                ...prev,
                                [product.id]: Math.max(1, (prev[product.id] || 1) - 1),
                              }))
                            }
                            className="w-7 h-7 rounded-[7px] border border-border bg-soft-cream/40 flex items-center justify-center font-bold text-xs hover:bg-soft-cream disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={product.stock}
                            value={qty}
                            disabled={isOutOfStock}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (isNaN(val)) return;
                              const clamped = Math.max(1, Math.min(product.stock, val));
                              setAddRetailQuantities((prev) => ({
                                ...prev,
                                [product.id]: clamped,
                              }));
                            }}
                            className="w-11 h-7 text-center font-bold text-xs border border-border rounded-[7px] bg-white disabled:opacity-40"
                          />
                          <button
                            type="button"
                            disabled={isOutOfStock || qty >= product.stock}
                            onClick={() =>
                              setAddRetailQuantities((prev) => ({
                                ...prev,
                                [product.id]: Math.min(product.stock, (prev[product.id] || 1) + 1),
                              }))
                            }
                            className="w-7 h-7 rounded-[7px] border border-border bg-soft-cream/40 flex items-center justify-center font-bold text-xs hover:bg-soft-cream disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          disabled={isOutOfStock || qty > product.stock}
                          onClick={() => {
                            addRetailItemToInvoice(retailModalInvoiceId, product, qty);
                            setRetailAddedNotice(
                              `Added ${qty}x "${product.name}" (+${(product.price * qty).toLocaleString('en-US')} FCFA)`
                            );
                            setAddRetailQuantities((prev) => ({ ...prev, [product.id]: 1 }));
                            setTimeout(() => setRetailAddedNotice(''), 3000);
                          }}
                          className={`px-3 py-1.5 rounded-[9px] text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                            isOutOfStock || qty > product.stock
                              ? 'bg-border/50 text-muted-gray cursor-not-allowed'
                              : 'bg-sage-soft hover:bg-sage hover:text-white text-charcoal cursor-pointer border border-sage/30'
                          }`}
                        >
                          <Plus size={13} strokeWidth={2.5} />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end px-4 sm:px-6 py-3 sm:py-3.5 border-t border-border bg-soft-cream/30 shrink-0">
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  setRetailModalInvoiceId(null);
                  setRetailAddedNotice('');
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          NEW RETAIL SALE MODAL (Walk-in or Client Direct Sale)
          ============================================================ */}
      {showNewRetailSaleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-[20px] max-w-[calc(100vw-24px)] sm:max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-sage" />
                <span className="font-bold text-sm text-charcoal">New Retail Sale</span>
              </div>
              <button
                type="button"
                onClick={closeNewRetailSaleModal}
                className="w-8 h-8 rounded-full hover:bg-soft-cream flex items-center justify-center text-muted-gray hover:text-charcoal cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Notice / Feedback */}
            {newSaleNotice && (
              <div className="bg-sage-soft text-charcoal text-xs font-semibold px-4 sm:px-6 py-2 border-b border-sage/20 flex items-center gap-2">
                <Check size={14} className="text-sage shrink-0" />
                <span>{newSaleNotice}</span>
              </div>
            )}

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-4 sm:p-6 space-y-4 flex-1 text-xs">
              {/* 1. Client (Optional) */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-gray mb-1.5">
                  Client (Optional)
                </label>
                <select
                  value={newSaleClientId}
                  onChange={(e) => setNewSaleClientId(e.target.value)}
                  className="w-full h-[42px] px-3 bg-white border border-border rounded-[10px] text-xs text-charcoal font-medium outline-none focus:border-sage"
                >
                  <option value="">Walk-in Customer (No client profile)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-gray mt-1">
                  Optional for walk-in retail customers.
                </p>
              </div>

              {/* 2. Product Picker Tabs */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-gray mb-1.5">
                  Select Products
                </label>
                <div className="flex border-b border-border gap-4 pb-0.5 mb-3">
                  <button
                    type="button"
                    onClick={() => setNewSaleTab('drinks')}
                    className={`pb-2 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                      newSaleTab === 'drinks'
                        ? 'border-charcoal text-charcoal'
                        : 'border-transparent text-muted-gray hover:text-charcoal'
                    }`}
                  >
                    <Coffee size={14} />
                    <span>Drinks ({drinks.filter((d) => d.active).length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSaleTab('cosmetics')}
                    className={`pb-2 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                      newSaleTab === 'cosmetics'
                        ? 'border-charcoal text-charcoal'
                        : 'border-transparent text-muted-gray hover:text-charcoal'
                    }`}
                  >
                    <Sparkles size={14} />
                    <span>Cosmetics ({cosmetics.filter((c) => c.active).length})</span>
                  </button>
                </div>

                {/* Available Products List */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(newSaleTab === 'drinks' ? drinks : cosmetics)
                    .filter((p) => p.active)
                    .map((product) => {
                      const inCart = newSaleCart.find((it) => it.productId === product.id);
                      const cartQty = inCart ? inCart.qty : 0;
                      const remainingStock = product.stock - cartQty;
                      const isOutOfStock = remainingStock <= 0;
                      const qty = newSaleQuantities[product.id] || 1;

                      return (
                        <div
                          key={product.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-[11px] border border-border/80 bg-soft-cream/30 gap-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-charcoal truncate">{product.name}</p>
                            <p className="text-[11px] text-muted-gray mt-0.5">
                              <span className="font-extrabold text-charcoal">
                                {product.price.toLocaleString('en-US')} FCFA
                              </span>
                              {' · '}
                              <span
                                className={
                                  isOutOfStock
                                    ? 'text-error font-semibold'
                                    : remainingStock <= 3
                                    ? 'text-warning font-semibold'
                                    : 'text-muted-gray'
                                }
                              >
                                {isOutOfStock
                                  ? 'Out of stock'
                                  : `${remainingStock} available`}
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t border-border/30 sm:border-0">
                            {/* Quantity Stepper */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isOutOfStock || qty <= 1}
                                onClick={() =>
                                  setNewSaleQuantities((prev) => ({
                                    ...prev,
                                    [product.id]: Math.max(1, (prev[product.id] || 1) - 1),
                                  }))
                                }
                                className="w-7 h-7 rounded-[7px] border border-border bg-white flex items-center justify-center font-bold text-xs hover:bg-soft-cream disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={remainingStock}
                                value={qty}
                                disabled={isOutOfStock}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (isNaN(val)) return;
                                  const clamped = Math.max(1, Math.min(remainingStock, val));
                                  setNewSaleQuantities((prev) => ({
                                    ...prev,
                                    [product.id]: clamped,
                                  }));
                                }}
                                className="w-10 h-7 text-center font-bold text-xs border border-border rounded-[7px] bg-white disabled:opacity-40"
                              />
                              <button
                                type="button"
                                disabled={isOutOfStock || qty >= remainingStock}
                                onClick={() =>
                                  setNewSaleQuantities((prev) => ({
                                    ...prev,
                                    [product.id]: Math.min(
                                      remainingStock,
                                      (prev[product.id] || 1) + 1
                                    ),
                                  }))
                                }
                                className="w-7 h-7 rounded-[7px] border border-border bg-white flex items-center justify-center font-bold text-xs hover:bg-soft-cream disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              disabled={isOutOfStock || qty > remainingStock}
                              onClick={() => addToNewSaleCart(product, qty)}
                              className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all flex items-center gap-1 ${
                                isOutOfStock || qty > remainingStock
                                  ? 'bg-border/50 text-muted-gray cursor-not-allowed'
                                  : 'bg-sage-soft hover:bg-sage hover:text-white text-charcoal cursor-pointer border border-sage/30'
                              }`}
                            >
                              <Plus size={13} strokeWidth={2.5} />
                              <span>Add</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* 3. Selected Items (Cart Review) */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-gray mb-1.5">
                  Selected Items ({newSaleCart.reduce((sum, it) => sum + it.qty, 0)})
                </label>
                {newSaleCart.length === 0 ? (
                  <div className="p-4 bg-soft-cream/30 border border-dashed border-border rounded-[12px] text-center text-muted-gray text-xs">
                    No products added yet. Select drinks or cosmetics above.
                  </div>
                ) : (
                  <div className="bg-white border border-border rounded-[12px] divide-y divide-border/60 overflow-hidden">
                    {newSaleCart.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between p-3 gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-charcoal truncate">
                              {item.name}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-muted-gray px-1.5 py-0.5 rounded bg-soft-cream">
                              {item.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-gray mt-0.5">
                            {item.unitPrice.toLocaleString('en-US')} FCFA each
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {/* Qty controls in cart */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={item.qty <= 1}
                              onClick={() =>
                                updateNewSaleCartQty(item.productId, item.qty - 1)
                              }
                              className="w-6 h-6 rounded border border-border flex items-center justify-center font-bold text-xs hover:bg-soft-cream disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                            >
                              -
                            </button>
                            <span className="w-7 text-center font-bold text-xs">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              disabled={item.qty >= item.stock}
                              onClick={() =>
                                updateNewSaleCartQty(item.productId, item.qty + 1)
                              }
                              className="w-6 h-6 rounded border border-border flex items-center justify-center font-bold text-xs hover:bg-soft-cream disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>

                          <span className="font-bold text-charcoal text-xs min-w-[70px] text-right">
                            {item.price.toLocaleString('en-US')} FCFA
                          </span>

                          <button
                            type="button"
                            onClick={() => removeFromNewSaleCart(item.productId)}
                            className="w-6 h-6 rounded-full hover:bg-error-soft text-muted-gray hover:text-error flex items-center justify-center cursor-pointer transition-colors"
                            title="Remove item"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center px-3.5 py-2.5 bg-sage-soft/30 font-bold text-xs text-charcoal">
                      <span>Total Products</span>
                      <span className="font-extrabold text-sm">
                        {newSaleTotal.toLocaleString('en-US')} FCFA
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Payment Method */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-gray mb-1.5">
                  Payment Method:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((pm) => {
                    const isSelected = newSalePaymentMethod === pm.key;
                    return (
                      <button
                        key={pm.key}
                        type="button"
                        onClick={() => setNewSalePaymentMethod(pm.key)}
                        className={`h-[42px] px-3 rounded-[10px] text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected
                            ? 'bg-sage-soft border-sage text-charcoal ring-1 ring-sage/40'
                            : 'bg-white border-border text-charcoal/80 hover:border-sage/40'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-sage bg-sage'
                              : 'border-muted-gray/50 bg-white'
                          }`}
                        >
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </span>
                        <span>{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-border bg-soft-cream/30 shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-gray block">
                  Final Total
                </span>
                <span className="text-base font-extrabold text-charcoal">
                  {newSaleTotal.toLocaleString('en-US')} FCFA
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="flex-1 sm:flex-none"
                  onClick={closeNewRetailSaleModal}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 sm:flex-none"
                  disabled={newSaleCart.length === 0 || newSaleTotal <= 0}
                  onClick={handleCollectNewSale}
                >
                  <DollarSign size={16} strokeWidth={1.8} />
                  Collect Payment ({newSaleTotal.toLocaleString('en-US')} FCFA)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          PRINT RECEIPT MODAL
          ============================================================ */}
      <ReceiptModal
        isOpen={Boolean(receiptInvoice)}
        onClose={() => setReceiptInvoice(null)}
        invoice={receiptInvoice}
        clientLoyalty={receiptInvoice ? getClientLoyalty(receiptInvoice.clientId) : null}
      />
    </div>
  );
}
