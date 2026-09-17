/**
 * Stock — Screen 12: Service Stock (Products consumed during services)
 *
 * Fully Responsive for all screen sizes:
 *   - Large Desktop: 1440px+
 *   - Laptop: 1280px
 *   - Tablet Landscape: 1024x768
 *   - Tablet Portrait: 768x1024
 *   - Mobile: 430px, 390px, 375px, 320px
 *
 * Source: FLOW.md §21-24, §36-38, WIREFRAME.md Screen 12
 */

import { useState } from 'react';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Sparkles,
  AlertTriangle,
  ClipboardCheck,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Scissors,
  History,
} from 'lucide-react';

import Button from '../components/Button';
import { useOperations } from '../context/OperationsContext';
import { useAuth } from '../context/AuthContext';
import { useServices } from '../context/ServicesContext';

export default function Stock() {
  const { user } = useAuth();
  const isManager = user?.role === 'manager';
  const { getActiveServices } = useServices();
  const activeServices = getActiveServices();

  const {
    serviceStock,
    consumptionRules,
    lowStockThresholdDays,
    setLowStockThresholdDays,
    latestReconciliation,
    confirmStockCheck,
    getProductMetrics,
    addStock,
    adjustStock,
    stockAuditLog,
    addNewProduct,
    updateProduct,
    deleteProduct,
    toggleProductActive,
    saveServiceConsumptionRules,
  } = useOperations();

  // Modals state: 'stock_check' | 'consumption_rules' | 'add_stock' | 'adjust_stock' | 'audit_log' | 'new_product' | 'edit_product' | null
  const [activeModal, setActiveModal] = useState(null);

  // Success toast
  const [successMsg, setSuccessMsg] = useState('');

  // ── 1. Refill Stock State ──
  const [refillProduct, setRefillProduct] = useState(serviceStock[0]?.name || 'Massage Oil');
  const [refillQuantity, setRefillQuantity] = useState('');
  const [refillNote, setRefillNote] = useState('');

  // ── 2. New Product Form State ──
  const [newProdName, setNewProdName] = useState('');
  const [newProdQty, setNewProdQty] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('ml');

  // ── 3. Edit Product Form State ──
  const [editingOriginalName, setEditingOriginalName] = useState('');
  const [editProdName, setEditProdName] = useState('');
  const [editProdQty, setEditProdQty] = useState('');
  const [editProdUnit, setEditProdUnit] = useState('ml');
  const [editProdActive, setEditProdActive] = useState(true);

  // ── 4. Stock Check (Actual vs Expected) State ──
  const [actualCounts, setActualCounts] = useState({});

  // ── 5. Consumption Rules State ──
  const [selectedServiceRule, setSelectedServiceRule] = useState(
    activeServices[0]?.name || consumptionRules[0]?.serviceName || 'Massage'
  );
  const [activeRulesList, setActiveRulesList] = useState(
    consumptionRules[0]?.rules || []
  );
  const [newRuleProduct, setNewRuleProduct] = useState(serviceStock[0]?.name || 'Massage Oil');
  const [newRuleQuantity, setNewRuleQuantity] = useState('');

  // ── 6. Adjustment State (Known non-service stock reductions) ──
  const [adjustProduct, setAdjustProduct] = useState(serviceStock[0]?.name || 'Massage Oil');
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('Wastage');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustError, setAdjustError] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const selectedAdjustProductObj = serviceStock.find(
    (p) => p.name.toLowerCase() === adjustProduct.toLowerCase()
  ) || serviceStock[0];

  const adjustQtyNum = parseInt(adjustQuantity, 10) || 0;
  const projectedRemainingStock = selectedAdjustProductObj
    ? selectedAdjustProductObj.quantity - adjustQtyNum
    : 0;

  // ── 7. Stock Activity / History Filter State ──
  const [historyTypeFilter, setHistoryTypeFilter] = useState('ALL'); // 'ALL' | 'REFILL' | 'ADJUSTMENT' | 'STOCK CHECK'
  const [historyProductFilter, setHistoryProductFilter] = useState('ALL');

  const filteredHistory = stockAuditLog.filter((item) => {
    if (historyTypeFilter !== 'ALL' && item.type !== historyTypeFilter) return false;
    if (
      historyProductFilter !== 'ALL' &&
      item.productName.toLowerCase() !== historyProductFilter.toLowerCase()
    )
      return false;
    return true;
  });

  // ── Helpers ──
  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  // Open Stock Check Modal
  const openStockCheckModal = () => {
    const initial = {};
    serviceStock.forEach((p) => {
      initial[p.name] = String(p.quantity);
    });
    setActualCounts(initial);
    setActiveModal('stock_check');
  };

  // Confirm Stock Check
  const handleConfirmStockCheck = () => {
    confirmStockCheck(actualCounts, user?.name || 'Manager');
    setActiveModal(null);
    showToast(`Stock count confirmed. Baseline updated.`);
  };

  // Handle Adjustment Submit (Known non-service reductions)
  const handleAdjustSubmit = async (e) => {
    e?.preventDefault();
    setAdjustError('');
    const qty = parseInt(adjustQuantity, 10);
    if (!adjustProduct || isNaN(qty) || qty <= 0) {
      setAdjustError('Please enter a valid quantity greater than 0.');
      return;
    }

    setIsAdjusting(true);
    try {
      const res = await adjustStock({
        productName: adjustProduct,
        quantity: qty,
        reason: adjustReason,
        note: adjustNote,
        performedBy: user?.name || 'Manager',
      });

      if (!res || !res.success) {
        setAdjustError(res?.error || 'Failed to adjust stock.');
        return;
      }

      setActiveModal(null);
      setAdjustQuantity('');
      setAdjustNote('');
      setAdjustReason('Wastage');
      showToast(`Stock adjusted: -${qty} ${selectedAdjustProductObj?.unit || ''} (${adjustReason})`);
    } catch (err) {
      setAdjustError(err.message || 'Failed to adjust stock.');
    } finally {
      setIsAdjusting(false);
    }
  };

  // Open Consumption Rules Modal (Dynamic Services from ServicesContext)
  const openConsumptionRulesModal = () => {
    const firstService = activeServices[0]?.name || consumptionRules[0]?.serviceName || 'Massage';
    setSelectedServiceRule(firstService);
    const matched = consumptionRules.find(
      (r) => r.serviceName.toLowerCase() === firstService.toLowerCase()
    );
    setActiveRulesList(matched ? [...matched.rules] : []);
    setActiveModal('consumption_rules');
  };

  const handleSelectServiceForRules = (serviceName) => {
    setSelectedServiceRule(serviceName);
    const matched = consumptionRules.find(
      (r) => r.serviceName.toLowerCase() === serviceName.toLowerCase()
    );
    setActiveRulesList(matched ? [...matched.rules] : []);
  };

  const handleSaveRuleQuantity = (ruleIdx, newQty) => {
    const qty = parseInt(newQty, 10);
    if (isNaN(qty) || qty < 0) return;
    const updated = activeRulesList.map((r, i) =>
      i === ruleIdx ? { ...r, quantity: qty } : r
    );
    setActiveRulesList(updated);
    saveServiceConsumptionRules(selectedServiceRule, updated);
  };

  const handleDeleteRule = (ruleIdx) => {
    const updated = activeRulesList.filter((_, i) => i !== ruleIdx);
    setActiveRulesList(updated);
    saveServiceConsumptionRules(selectedServiceRule, updated);
  };

  const handleAddRuleToService = () => {
    const qty = parseInt(newRuleQuantity, 10);
    if (!newRuleProduct || isNaN(qty) || qty <= 0) return;
    const prod = serviceStock.find((p) => p.name === newRuleProduct);
    const newRuleItem = {
      productName: newRuleProduct,
      quantity: qty,
      unit: prod?.unit || 'ml',
    };
    const updated = [...activeRulesList, newRuleItem];
    setActiveRulesList(updated);
    saveServiceConsumptionRules(selectedServiceRule, updated);
    setNewRuleQuantity('');
  };

  // Refill Stock Submit
  const handleRefillStock = async (e) => {
    e?.preventDefault();
    const qty = parseInt(refillQuantity, 10);
    if (!refillProduct || isNaN(qty) || qty <= 0) return;
    await addStock(refillProduct, qty, refillNote, user?.name || 'Manager');
    setActiveModal(null);
    setRefillQuantity('');
    setRefillNote('');
    showToast(`+${qty} added to ${refillProduct}`);
  };

  // Add New Product Submit
  const handleAddNewProduct = async (e) => {
    e?.preventDefault();
    const name = newProdName.trim();
    if (!name) return;
    const qty = parseInt(newProdQty, 10) || 0;
    await addNewProduct(name, qty, newProdUnit, true);
    setActiveModal(null);
    setNewProdName('');
    setNewProdQty('');
    showToast(`Product "${name}" created with ${qty} ${newProdUnit}`);
  };

  // Edit Product Submit
  const handleUpdateProduct = async (e) => {
    e?.preventDefault();
    const name = editProdName.trim();
    if (!name) return;
    const qty = parseInt(editProdQty, 10) || 0;
    await updateProduct(editingOriginalName, name, qty, editProdUnit, editProdActive);
    setActiveModal(null);
    showToast(`Product "${name}" updated`);
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Page Header: Responsive Title & Action Grid */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-[28px] font-semibold text-charcoal truncate">
            Service Stock
          </h1>
          <p className="text-xs sm:text-sm text-muted-gray mt-0.5 sm:mt-1">
            Products consumed by technicians during services.
          </p>
        </div>

        {isManager && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:flex xl:flex-wrap xl:items-center gap-2 w-full xl:w-auto">
            <Button
              variant="secondary"
              onClick={openStockCheckModal}
              className="w-full xl:w-auto h-11 px-2.5 sm:px-3 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <ClipboardCheck size={15} className="text-sage shrink-0" />
              <span className="truncate">Stock Check</span>
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                setAdjustProduct(serviceStock[0]?.name || 'Massage Oil');
                setAdjustQuantity('');
                setAdjustReason('Wastage');
                setAdjustNote('');
                setAdjustError('');
                setActiveModal('adjust_stock');
              }}
              className="w-full xl:w-auto h-11 px-2.5 sm:px-3 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Scissors size={15} className="text-warning shrink-0" />
              <span className="truncate">Adjust</span>
            </Button>

            <Button
              variant="secondary"
              onClick={openConsumptionRulesModal}
              className="w-full xl:w-auto h-11 px-2 sm:px-3 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Sliders size={15} className="text-sage shrink-0" />
              <span className="truncate">Consumption Rules</span>
            </Button>

            <Button
              variant="secondary"
              onClick={() => setActiveModal('audit_log')}
              className="w-full xl:w-auto h-11 px-2.5 sm:px-3 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <History size={15} className="text-charcoal shrink-0" />
              <span className="truncate">History</span>
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                setNewProdName('');
                setNewProdQty('');
                setNewProdUnit('ml');
                setActiveModal('new_product');
              }}
              className="w-full xl:w-auto h-11 px-2.5 sm:px-3 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Sparkles size={15} className="text-sage shrink-0" />
              <span className="truncate">New Product</span>
            </Button>

            <Button
              onClick={() => {
                setRefillQuantity('');
                setRefillProduct(serviceStock[0]?.name || 'Massage Oil');
                setActiveModal('add_stock');
              }}
              className="w-full xl:w-auto h-11 px-2.5 sm:px-3 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Plus size={16} strokeWidth={2} className="shrink-0" />
              <span className="truncate">Add Stock</span>
            </Button>
          </div>
        )}
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3.5 rounded-[12px] bg-success-soft border border-success/30 text-success text-xs font-bold flex items-center gap-2 animate-fade-in shadow-2xs">
          <Check size={16} strokeWidth={2.5} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Low Stock Alert Threshold Controls & Latest Reconciliation Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Threshold setting */}
        <div className="bg-white border border-border rounded-[14px] p-4 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-gray block">
              Low Stock Alert Threshold
            </span>
            <p className="text-xs text-muted-gray mt-0.5">
              Flag as Low Stock when Days Left drops to or below:
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="number"
              min="1"
              max="30"
              disabled={!isManager}
              value={lowStockThresholdDays}
              onChange={(e) =>
                setLowStockThresholdDays(
                  Math.max(1, parseInt(e.target.value, 10) || 1)
                )
              }
              className="w-16 h-10 px-2.5 text-center font-bold text-sm bg-soft-cream/60 border border-border rounded-[8px] focus:outline-none focus:border-sage"
            />
            <span className="text-xs font-bold text-charcoal whitespace-nowrap">Days Left</span>
          </div>
        </div>

        {/* Latest Stock Reconciliation Status */}
        <div className="bg-white border border-border rounded-[14px] p-4 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-gray block">
              Latest Stock Check
            </span>
            <p className="text-xs text-muted-gray mt-0.5 break-words">
              {latestReconciliation
                ? `${latestReconciliation.date} at ${latestReconciliation.confirmedAt}`
                : 'No physical stock check performed yet'}
            </p>
          </div>
          <div className="shrink-0">
            {latestReconciliation ? (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-[6px] bg-success-soft text-success border border-success/20 inline-block">
                Reconciled ✓
              </span>
            ) : (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-[6px] bg-soft-cream text-muted-gray inline-block">
                Pending Check
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Service Stock Overview: Table (Desktop/Landscape) + Cards (Mobile/Portrait) */}
      <div className="bg-white border border-border rounded-[16px] shadow-card overflow-hidden w-full">
        <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wider">
            Service Products ({serviceStock.length})
          </h3>
          <span className="text-xs text-muted-gray">
            Live Expected Stock calculated from completed services
          </span>
        </div>

        {/* Desktop / Tablet Landscape Table View (lg:block) */}
        <div className="hidden lg:block overflow-x-auto w-full">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-soft-cream/40 text-[10px] font-bold text-muted-gray uppercase tracking-wider">
                <th className="px-5 py-3.5">Product</th>
                <th className="px-5 py-3.5">Current / Expected Stock</th>
                <th className="px-5 py-3.5">Unit</th>
                <th className="px-5 py-3.5">Estimated Days Left</th>
                <th className="px-5 py-3.5">Status</th>
                {isManager && <th className="px-5 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {serviceStock.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 6 : 5} className="py-12 text-center text-sm text-muted-gray">
                    No stock records available.
                  </td>
                </tr>
              ) : (
                serviceStock.map((prod) => {
                const metrics = getProductMetrics(prod.name);
                const isOutOfStock = prod.quantity <= 0;
                const isLowStock =
                  !isOutOfStock &&
                  metrics.daysLeft !== null &&
                  metrics.daysLeft <= lowStockThresholdDays;

                let statusBadge = (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-success-soft text-success font-bold text-[10px] border border-success/30">
                    <CheckCircle2 size={12} />
                    In Stock
                  </span>
                );

                if (isOutOfStock) {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-error-soft text-error font-bold text-[10px] border border-error/30">
                      <AlertTriangle size={12} />
                      Out of Stock
                    </span>
                  );
                } else if (isLowStock) {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-warning-soft text-warning font-bold text-[10px] border border-warning/30">
                      <AlertTriangle size={12} />
                      Low Stock
                    </span>
                  );
                }

                return (
                  <tr
                    key={prod.id}
                    className="hover:bg-sage-soft/10 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-bold text-charcoal text-sm">
                      {prod.name}
                      {!prod.active && (
                        <span className="ml-2 text-[10px] text-muted-gray uppercase font-normal">
                          (Inactive)
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-extrabold text-charcoal font-mono text-sm">
                      {prod.quantity.toLocaleString('en-US')}{' '}
                      <span className="text-xs font-normal text-muted-gray">{prod.unit}</span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-muted-gray uppercase text-[11px]">
                      {prod.unit}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-charcoal">
                      {metrics.daysLeft !== null ? (
                        <span
                          className={
                            isLowStock
                              ? 'text-warning font-extrabold'
                              : 'text-charcoal'
                          }
                        >
                          {metrics.daysLeft} Days Left
                          <span className="block text-[10px] text-muted-gray font-normal">
                            (~{metrics.avgDailyUsage} {prod.unit}/day)
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-gray font-normal">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">{statusBadge}</td>
                    {isManager && (
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRefillProduct(prod.name);
                              setRefillQuantity('');
                              setActiveModal('add_stock');
                            }}
                            className="h-8 px-3 rounded-[7px] bg-sage-soft/60 hover:bg-sage-soft text-charcoal font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                            title="Refill Stock"
                          >
                            <Plus size={13} />
                            <span>Refill</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAdjustProduct(prod.name);
                              setAdjustQuantity('');
                              setAdjustReason('Wastage');
                              setAdjustNote('');
                              setAdjustError('');
                              setActiveModal('adjust_stock');
                            }}
                            className="h-8 px-3 rounded-[7px] bg-warning-soft hover:bg-warning-soft/80 text-warning font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                            title="Adjust Stock (Wastage / Damaged / Expired)"
                          >
                            <Scissors size={13} />
                            <span>Adjust</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingOriginalName(prod.name);
                              setEditProdName(prod.name);
                              setEditProdQty(String(prod.quantity));
                              setEditProdUnit(prod.unit);
                              setEditProdActive(prod.active);
                              setActiveModal('edit_product');
                            }}
                            className="h-8 px-3 rounded-[7px] bg-soft-cream hover:bg-border/60 text-charcoal font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Pencil size={13} />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile / Tablet Portrait Product Cards (lg:hidden) */}
        <div className="block lg:hidden divide-y divide-border/60">
          {serviceStock.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-gray">
              No stock records available.
            </div>
          ) : (
            serviceStock.map((prod) => {
            const metrics = getProductMetrics(prod.name);
            const isOutOfStock = prod.quantity <= 0;
            const isLowStock =
              !isOutOfStock &&
              metrics.daysLeft !== null &&
              metrics.daysLeft <= lowStockThresholdDays;

            let statusBadge = (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-success-soft text-success font-bold text-[10px] border border-success/30">
                <CheckCircle2 size={12} />
                In Stock
              </span>
            );

            if (isOutOfStock) {
              statusBadge = (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-error-soft text-error font-bold text-[10px] border border-error/30">
                  <AlertTriangle size={12} />
                  Out of Stock
                </span>
              );
            } else if (isLowStock) {
              statusBadge = (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-warning-soft text-warning font-bold text-[10px] border border-warning/30">
                  <AlertTriangle size={12} />
                  Low Stock
                </span>
              );
            }

            return (
              <div key={prod.id} className="p-4 space-y-3">
                {/* Header: Product name & Status badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-charcoal text-base truncate">
                      {prod.name}
                    </h4>
                    {!prod.active && (
                      <span className="text-[10px] text-muted-gray uppercase font-normal block">
                        (Inactive)
                      </span>
                    )}
                  </div>
                  <div className="shrink-0">{statusBadge}</div>
                </div>

                {/* Info Grid: Current/Expected & Estimated Days Left */}
                <div className="grid grid-cols-2 gap-2.5 bg-soft-cream/40 p-3 rounded-[12px] border border-border/60 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-muted-gray uppercase block">
                      Current / Expected
                    </span>
                    <span className="text-sm font-extrabold text-charcoal font-mono">
                      {prod.quantity.toLocaleString('en-US')}{' '}
                      <span className="text-xs font-normal text-muted-gray">{prod.unit}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-muted-gray uppercase block">
                      Estimated Days Left
                    </span>
                    {metrics.daysLeft !== null ? (
                      <div>
                        <span
                          className={`text-sm font-bold ${
                            isLowStock ? 'text-warning font-extrabold' : 'text-charcoal'
                          }`}
                        >
                          {metrics.daysLeft} Days
                        </span>
                        <span className="block text-[10px] text-muted-gray font-normal">
                          ~{metrics.avgDailyUsage} {prod.unit}/day
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-gray font-normal">—</span>
                    )}
                  </div>
                </div>

                {/* Actions: Minimum touch height 40px, non-overlapping */}
                {isManager && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRefillProduct(prod.name);
                        setRefillQuantity('');
                        setActiveModal('add_stock');
                      }}
                      className="h-10 px-2 rounded-[8px] bg-sage-soft/60 hover:bg-sage-soft text-charcoal font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={13} className="shrink-0" />
                      <span>Refill</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAdjustProduct(prod.name);
                        setAdjustQuantity('');
                        setAdjustReason('Wastage');
                        setAdjustNote('');
                        setAdjustError('');
                        setActiveModal('adjust_stock');
                      }}
                      className="h-10 px-2 rounded-[8px] bg-warning-soft hover:bg-warning-soft/80 text-warning font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Scissors size={13} className="shrink-0" />
                      <span>Adjust</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingOriginalName(prod.name);
                        setEditProdName(prod.name);
                        setEditProdQty(String(prod.quantity));
                        setEditProdUnit(prod.unit);
                        setEditProdActive(prod.active);
                        setActiveModal('edit_product');
                      }}
                      className="h-10 px-2 rounded-[8px] bg-soft-cream hover:bg-border/60 text-charcoal font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Pencil size={13} className="shrink-0" />
                      <span>Edit</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
          )}
        </div>
      </div>

      {/* ============================================================
          1. MODAL: ACTUAL STOCK COUNT & RECONCILIATION
          ============================================================ */}
      {activeModal === 'stock_check' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-[20px] max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[90vh]">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <ClipboardCheck size={18} className="text-sage shrink-0" />
                <span className="font-bold text-sm text-charcoal truncate">
                  Stock Check & Physical Reconciliation
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full hover:bg-soft-cream flex items-center justify-center text-muted-gray hover:text-charcoal cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="p-3 bg-sage-soft/30 rounded-[10px] border border-sage/20 text-muted-gray text-[11px] leading-relaxed">
                Enter physical stock counts. Differences are calculated automatically. Expected stock will ONLY be updated when you click <strong>Confirm Stock Count</strong>.
              </div>

              {/* Desktop / Tablet Landscape Table */}
              <div className="hidden sm:block bg-white border border-border rounded-[12px] overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-soft-cream/60 border-b border-border text-[10px] font-bold text-muted-gray uppercase">
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3">Expected Stock</th>
                      <th className="py-2.5 px-3">Actual Count</th>
                      <th className="py-2.5 px-3 text-right">Difference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {serviceStock.map((p) => {
                      const expected = p.quantity;
                      const enteredVal = actualCounts[p.name];
                      const actual =
                        enteredVal !== undefined && enteredVal !== ''
                          ? parseInt(enteredVal, 10) || 0
                          : expected;
                      const diff = actual - expected;

                      let diffLabel = (
                        <span className="text-success font-bold">Matched ✓</span>
                      );
                      if (diff < 0) {
                        diffLabel = (
                          <span className="text-error font-bold">
                            Missing: {Math.abs(diff)} {p.unit}
                          </span>
                        );
                      } else if (diff > 0) {
                        diffLabel = (
                          <span className="text-sage font-bold">
                            Extra: +{diff} {p.unit}
                          </span>
                        );
                      }

                      return (
                        <tr key={p.id} className="hover:bg-soft-cream/20">
                          <td className="py-3 px-3 font-bold text-charcoal">
                            {p.name}
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-charcoal">
                            {expected.toLocaleString('en-US')} {p.unit}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                value={actualCounts[p.name] ?? expected}
                                onChange={(e) =>
                                  setActualCounts((prev) => ({
                                    ...prev,
                                    [p.name]: e.target.value,
                                  }))
                                }
                                className="w-24 h-8 px-2 rounded-[6px] border border-border font-mono font-bold text-xs focus:outline-none focus:border-sage bg-white"
                              />
                              <span className="text-muted-gray text-[10px]">{p.unit}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono">
                            {diffLabel}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile / Tablet Portrait Compact Cards */}
              <div className="block sm:hidden space-y-3">
                {serviceStock.map((p) => {
                  const expected = p.quantity;
                  const enteredVal = actualCounts[p.name];
                  const actual =
                    enteredVal !== undefined && enteredVal !== ''
                      ? parseInt(enteredVal, 10) || 0
                      : expected;
                  const diff = actual - expected;

                  let diffBadge = (
                    <span className="text-success font-bold text-[11px] bg-success-soft px-2 py-0.5 rounded-[5px] border border-success/20">
                      Matched ✓
                    </span>
                  );
                  if (diff < 0) {
                    diffBadge = (
                      <span className="text-error font-bold text-[11px] bg-error-soft px-2 py-0.5 rounded-[5px] border border-error/20">
                        -{Math.abs(diff)} {p.unit}
                      </span>
                    );
                  } else if (diff > 0) {
                    diffBadge = (
                      <span className="text-sage font-bold text-[11px] bg-sage-soft px-2 py-0.5 rounded-[5px] border border-sage/20">
                        +{diff} {p.unit}
                      </span>
                    );
                  }

                  return (
                    <div
                      key={p.id}
                      className="p-3.5 bg-soft-cream/40 rounded-[12px] border border-border/80 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-charcoal">{p.name}</span>
                        {diffBadge}
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                        <span className="text-muted-gray">
                          Expected: <strong className="text-charcoal font-mono">{expected.toLocaleString('en-US')} {p.unit}</strong>
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-gray text-[11px]">Actual:</span>
                          <input
                            type="number"
                            min="0"
                            value={actualCounts[p.name] ?? expected}
                            onChange={(e) =>
                              setActualCounts((prev) => ({
                                ...prev,
                                [p.name]: e.target.value,
                              }))
                            }
                            className="w-20 h-8 px-2 rounded-[6px] border border-border font-mono font-bold text-center text-xs focus:outline-none focus:border-sage bg-white"
                          />
                          <span className="text-muted-gray text-[11px]">{p.unit}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end sm:gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-border bg-white shrink-0">
              <Button
                variant="secondary"
                onClick={() => setActiveModal(null)}
                className="w-full sm:w-auto h-11"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmStockCheck}
                className="w-full sm:w-auto h-11 text-xs sm:text-sm"
              >
                Confirm Stock Count
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          2. MODAL: SERVICE CONSUMPTION RULES
          ============================================================ */}
      {activeModal === 'consumption_rules' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-[20px] max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[90vh]">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Sliders size={18} className="text-sage shrink-0" />
                <span className="font-bold text-sm text-charcoal truncate">
                  Service Consumption Rules
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full hover:bg-soft-cream flex items-center justify-center text-muted-gray hover:text-charcoal cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-xs flex-1">
              <p className="text-muted-gray leading-relaxed text-xs">
                Configure which products and quantities are automatically consumed whenever a technician completes a service.
              </p>

              {/* Service Select Tabs (Dynamic from Active Services, horizontally scrollable with no overflow) */}
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {activeServices.map((svc) => (
                  <button
                    key={svc.id || svc.name}
                    type="button"
                    onClick={() => handleSelectServiceForRules(svc.name)}
                    className={`shrink-0 px-3 sm:px-3.5 py-2 rounded-[10px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedServiceRule.toLowerCase() === svc.name.toLowerCase()
                        ? 'bg-charcoal text-white shadow-xs'
                        : 'bg-soft-cream text-charcoal hover:bg-border/60'
                    }`}
                  >
                    {svc.name}
                  </button>
                ))}
              </div>

              {/* Current Rules for selected service */}
              <div className="bg-soft-cream/40 rounded-[14px] p-3 sm:p-4 border border-border/80">
                <h4 className="font-bold text-charcoal mb-3 text-xs uppercase tracking-wider">
                  Products Consumed per &ldquo;{selectedServiceRule}&rdquo;
                </h4>

                {activeRulesList.length === 0 ? (
                  <p className="text-muted-gray text-xs py-2">
                    No products configured for this service yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {activeRulesList.map((r, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3 rounded-[10px] border border-border/70"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Package size={14} className="text-sage shrink-0" />
                          <span className="font-bold text-charcoal truncate">{r.productName}</span>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-gray text-xs">Qty:</span>
                            <input
                              type="number"
                              min="1"
                              value={r.quantity}
                              onChange={(e) => handleSaveRuleQuantity(idx, e.target.value)}
                              className="w-16 sm:w-20 h-8 px-2 rounded-[6px] border border-border font-bold text-center text-xs focus:outline-none focus:border-sage bg-white"
                            />
                            <span className="font-semibold text-charcoal text-xs whitespace-nowrap">
                              {r.unit} per service
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteRule(idx)}
                            className="w-7 h-7 rounded-full hover:bg-error-soft text-muted-gray hover:text-error flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-1"
                            title="Remove Rule"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add product to service rule */}
                <div className="mt-4 pt-4 border-t border-border/60 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2">
                  <div className="w-full sm:flex-1 min-w-0">
                    <label className="block sm:hidden text-[10px] font-bold text-muted-gray uppercase mb-1">
                      Product
                    </label>
                    <select
                      value={newRuleProduct}
                      onChange={(e) => setNewRuleProduct(e.target.value)}
                      className="w-full h-10 px-3 rounded-[8px] border border-border text-xs bg-white focus:outline-none focus:border-sage font-medium"
                    >
                      {serviceStock.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name} ({p.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex-1 sm:w-24">
                      <label className="block sm:hidden text-[10px] font-bold text-muted-gray uppercase mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={newRuleQuantity}
                        onChange={(e) => setNewRuleQuantity(e.target.value)}
                        className="w-full h-10 px-2.5 rounded-[8px] border border-border text-xs font-bold text-center focus:outline-none focus:border-sage bg-white"
                      />
                    </div>

                    <div className="shrink-0 self-end sm:self-auto">
                      <Button
                        className="h-10 px-4 text-xs font-bold whitespace-nowrap"
                        onClick={handleAddRuleToService}
                      >
                        Add Rule
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end px-4 sm:px-6 py-3.5 sm:py-4 border-t border-border bg-white shrink-0">
              <Button onClick={() => setActiveModal(null)} className="w-full sm:w-auto h-11">
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          3. MODAL: REFILL STOCK
          ============================================================ */}
      {activeModal === 'add_stock' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-[20px] max-w-sm w-full shadow-2xl p-4 sm:p-6 overflow-y-auto max-h-[88vh]">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="font-bold text-sm text-charcoal">Refill Service Stock</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-full hover:bg-soft-cream flex items-center justify-center text-muted-gray cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleRefillStock} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-charcoal mb-1">Product</label>
                <select
                  value={refillProduct}
                  onChange={(e) => setRefillProduct(e.target.value)}
                  className="w-full h-11 px-3 rounded-[9px] border border-border bg-white text-xs font-semibold focus:outline-none focus:border-sage"
                >
                  {serviceStock.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} (Current: {p.quantity} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-charcoal mb-1">Quantity to Add</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 500"
                  value={refillQuantity}
                  onChange={(e) => setRefillQuantity(e.target.value)}
                  className="w-full h-11 px-3 rounded-[9px] border border-border text-xs font-bold focus:outline-none focus:border-sage"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-charcoal mb-1">Optional Note</label>
                <input
                  type="text"
                  placeholder="e.g. Supplier delivery, replenishment..."
                  value={refillNote}
                  onChange={(e) => setRefillNote(e.target.value)}
                  className="w-full h-11 px-3 rounded-[9px] border border-border text-xs focus:outline-none focus:border-sage"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setActiveModal(null)}
                  className="w-full h-11"
                >
                  Cancel
                </Button>
                <Button type="submit" className="w-full h-11">
                  + Refill Stock
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          4. MODAL: NEW PRODUCT
          ============================================================ */}
      {activeModal === 'new_product' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-[20px] max-w-sm w-full shadow-2xl p-4 sm:p-6 overflow-y-auto max-h-[88vh]">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="font-bold text-sm text-charcoal">New Service Stock Product</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-full hover:bg-soft-cream flex items-center justify-center text-muted-gray cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAddNewProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-charcoal mb-1">Product Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rose Water Tonic"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full h-11 px-3 rounded-[9px] border border-border text-xs focus:outline-none focus:border-sage"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-charcoal mb-1">Opening Stock</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1000"
                    value={newProdQty}
                    onChange={(e) => setNewProdQty(e.target.value)}
                    className="w-full h-11 px-3 rounded-[9px] border border-border text-xs font-bold focus:outline-none focus:border-sage"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-charcoal mb-1">Unit</label>
                  <select
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value)}
                    className="w-full h-11 px-3 rounded-[9px] border border-border bg-white text-xs font-bold focus:outline-none focus:border-sage"
                  >
                    <option value="ml">ml</option>
                    <option value="g">g</option>
                    <option value="pcs">pcs</option>
                    <option value="units">units</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setActiveModal(null)}
                  className="w-full h-11"
                >
                  Cancel
                </Button>
                <Button type="submit" className="w-full h-11">
                  Create Product
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          5. MODAL: EDIT PRODUCT
          ============================================================ */}
      {activeModal === 'edit_product' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-[20px] max-w-sm w-full shadow-2xl p-4 sm:p-6 overflow-y-auto max-h-[88vh]">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="font-bold text-sm text-charcoal">Edit Product</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-full hover:bg-soft-cream flex items-center justify-center text-muted-gray cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-charcoal mb-1">Product Name</label>
                <input
                  type="text"
                  value={editProdName}
                  onChange={(e) => setEditProdName(e.target.value)}
                  className="w-full h-11 px-3 rounded-[9px] border border-border text-xs focus:outline-none focus:border-sage"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-charcoal mb-1">Current Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={editProdQty}
                    onChange={(e) => setEditProdQty(e.target.value)}
                    className="w-full h-11 px-3 rounded-[9px] border border-border text-xs font-bold focus:outline-none focus:border-sage"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-charcoal mb-1">Unit</label>
                  <select
                    value={editProdUnit}
                    onChange={(e) => setEditProdUnit(e.target.value)}
                    className="w-full h-11 px-3 rounded-[9px] border border-border bg-white text-xs font-bold focus:outline-none focus:border-sage"
                  >
                    <option value="ml">ml</option>
                    <option value="g">g</option>
                    <option value="pcs">pcs</option>
                    <option value="units">units</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-charcoal mb-1">Status</label>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={editProdActive}
                    onChange={(e) => setEditProdActive(e.target.checked)}
                    className="w-4 h-4 rounded text-sage accent-sage"
                  />
                  <span className="font-semibold text-charcoal">Active Product</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setActiveModal(null)}
                  className="w-full h-11"
                >
                  Cancel
                </Button>
                <Button type="submit" className="w-full h-11">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          6. MODAL: STOCK ADJUSTMENT (Known non-service reductions)
          ============================================================ */}
      {activeModal === 'adjust_stock' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-[20px] max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Scissors size={18} className="text-warning shrink-0" />
                <h3 className="font-bold text-sm text-charcoal">Stock Adjustment</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full hover:bg-soft-cream flex items-center justify-center text-muted-gray hover:text-charcoal cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="p-3 bg-warning-soft/30 rounded-[10px] border border-warning/20 text-muted-gray text-[11px] leading-relaxed">
                Use this ONLY for <strong>known non-service stock reductions</strong> (wastage, damaged, expired, manual correction).
                <span className="block mt-1 text-charcoal font-semibold">
                  Do NOT use Adjustment for unexplained missing stock (use Stock Check instead).
                </span>
              </div>

              {adjustError && (
                <div className="p-3 rounded-[10px] bg-error-soft border border-error/30 text-error text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{adjustError}</span>
                </div>
              )}

              <form id="adjust-form" onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-charcoal uppercase tracking-wider mb-1.5">
                    Product
                  </label>
                  <select
                    value={adjustProduct}
                    onChange={(e) => {
                      setAdjustProduct(e.target.value);
                      setAdjustError('');
                    }}
                    className="w-full h-11 px-3 rounded-[10px] border border-border bg-white text-charcoal font-semibold text-xs focus:outline-none focus:border-sage"
                  >
                    {serviceStock.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} (Current: {p.quantity.toLocaleString('en-US')} {p.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-charcoal uppercase tracking-wider mb-1.5">
                    Quantity to Deduct
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="Enter quantity"
                      value={adjustQuantity}
                      onChange={(e) => {
                        setAdjustQuantity(e.target.value);
                        setAdjustError('');
                      }}
                      className="flex-1 min-w-0 h-11 px-3 rounded-[10px] border border-border text-xs font-bold focus:outline-none focus:border-sage"
                    />
                    <span className="font-semibold text-charcoal text-xs shrink-0">
                      {selectedAdjustProductObj?.unit || 'units'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-charcoal uppercase tracking-wider mb-1.5">
                    Reason
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Wastage', 'Damaged', 'Expired', 'Manual Correction'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setAdjustReason(r)}
                        className={`min-h-[42px] px-2.5 py-1.5 rounded-[8px] border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                          adjustReason === r
                            ? 'border-charcoal bg-charcoal text-white'
                            : 'border-border bg-soft-cream/40 text-charcoal hover:bg-border/40'
                        }`}
                      >
                        <span className="truncate">{r}</span>
                        {adjustReason === r && <Check size={12} className="shrink-0 ml-1" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-charcoal uppercase tracking-wider mb-1.5">
                    Optional Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Broken bottle, pump failure..."
                    value={adjustNote}
                    onChange={(e) => setAdjustNote(e.target.value)}
                    className="w-full h-11 px-3 rounded-[10px] border border-border text-xs focus:outline-none focus:border-sage"
                  />
                </div>

                {/* Stock Preview */}
                {selectedAdjustProductObj && (
                  <div className="p-3 rounded-[10px] bg-soft-cream/60 border border-border/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-muted-gray block text-[10px]">Current Stock</span>
                      <span className="font-bold text-charcoal">
                        {selectedAdjustProductObj.quantity.toLocaleString('en-US')} {selectedAdjustProductObj.unit}
                      </span>
                    </div>
                    <span className="text-muted-gray font-bold px-2">→</span>
                    <div>
                      <span className="text-muted-gray block text-[10px]">Remaining Stock</span>
                      <span
                        className={`font-bold ${
                          projectedRemainingStock < 0 ? 'text-error' : 'text-charcoal'
                        }`}
                      >
                        {projectedRemainingStock.toLocaleString('en-US')} {selectedAdjustProductObj.unit}
                      </span>
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="grid grid-cols-2 gap-2 p-4 sm:px-6 sm:py-4 border-t border-border bg-white shrink-0">
              <Button
                variant="secondary"
                onClick={() => setActiveModal(null)}
                className="w-full h-11"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="adjust-form"
                disabled={isAdjusting}
                className="w-full h-11 text-xs sm:text-sm disabled:opacity-60"
              >
                {isAdjusting ? 'Adjusting...' : 'Confirm Adjustment'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          7. MODAL: IN-MEMORY STOCK ACTIVITY / HISTORY
          ============================================================ */}
      {activeModal === 'audit_log' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-[20px] max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[8px] bg-soft-cream flex items-center justify-center text-charcoal shrink-0">
                  <History size={17} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-charcoal truncate">
                    Stock Activity / History
                  </h3>
                  <p className="text-[11px] text-muted-gray truncate">
                    Read-only record of all Refills, Adjustments, and Stock Checks.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full hover:bg-soft-cream flex items-center justify-center text-muted-gray hover:text-charcoal cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Explanatory Notice */}
            <div className="px-4 sm:px-6 py-2.5 bg-sage-soft/30 border-b border-border/70 text-[11px] text-muted-gray leading-relaxed shrink-0">
              <span className="font-semibold text-charcoal">Important distinction:</span> Known adjustments (Wastage, Damaged, Expired, Manual Correction) are <em>explained</em> stock movements and are <strong>not</strong> classified as Missing Stock. Missing Stock comes exclusively from unexplained physical Stock Check shortages.
            </div>

            {/* Filter controls */}
            <div className="px-4 sm:px-6 py-3 border-b border-border/70 bg-soft-cream/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-muted-gray uppercase mr-1 shrink-0">
                  Type:
                </span>
                {['ALL', 'REFILL', 'ADJUSTMENT', 'STOCK CHECK'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setHistoryTypeFilter(t)}
                    className={`px-2.5 py-1 rounded-[6px] font-bold text-[11px] transition-colors cursor-pointer ${
                      historyTypeFilter === t
                        ? 'bg-charcoal text-white shadow-2xs'
                        : 'bg-white text-muted-gray border border-border/80 hover:bg-soft-cream'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-[10px] font-bold text-muted-gray uppercase shrink-0">
                  Product:
                </span>
                <select
                  value={historyProductFilter}
                  onChange={(e) => setHistoryProductFilter(e.target.value)}
                  className="w-full sm:w-auto h-8 px-2 rounded-[6px] border border-border bg-white text-xs font-semibold focus:outline-none focus:border-sage"
                >
                  <option value="ALL">All Products</option>
                  {serviceStock.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* History Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {filteredHistory.length === 0 ? (
                <div className="py-12 text-center text-muted-gray">
                  No stock activity records found.
                </div>
              ) : (
                <>
                  {/* Desktop Table View (lg:block) */}
                  <div className="hidden lg:block border border-border rounded-[14px] overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-soft-cream/60 border-b border-border text-[10px] font-bold text-muted-gray uppercase tracking-wider">
                          <th className="py-3 px-3.5">Date / Time</th>
                          <th className="py-3 px-3.5">Product</th>
                          <th className="py-3 px-3.5">Type</th>
                          <th className="py-3 px-3.5">Quantity</th>
                          <th className="py-3 px-3.5">Before → After</th>
                          <th className="py-3 px-3.5">Reason</th>
                          <th className="py-3 px-3.5">Note</th>
                          <th className="py-3 px-3.5">By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {filteredHistory.map((item) => {
                          let typeBadge = (
                            <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              REFILL
                            </span>
                          );
                          if (item.type === 'ADJUSTMENT') {
                            typeBadge = (
                              <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                                ADJUSTMENT
                              </span>
                            );
                          } else if (item.type === 'STOCK CHECK') {
                            typeBadge = (
                              <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-300">
                                STOCK CHECK
                              </span>
                            );
                          }

                          const isNeg = item.quantity < 0;

                          return (
                            <tr key={item.id} className="hover:bg-soft-cream/20 transition-colors">
                              <td className="py-3 px-3.5 font-medium text-muted-gray whitespace-nowrap text-[11px]">
                                {item.dateTime}
                              </td>
                              <td className="py-3 px-3.5 font-bold text-charcoal">
                                {item.productName}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap">{typeBadge}</td>
                              <td className="py-3 px-3.5 font-mono font-bold whitespace-nowrap">
                                <span
                                  className={
                                    item.type === 'REFILL'
                                      ? 'text-emerald-600'
                                      : item.type === 'ADJUSTMENT' || isNeg
                                      ? 'text-rose-600'
                                      : 'text-muted-gray'
                                  }
                                >
                                  {item.type === 'REFILL'
                                    ? `+${Math.abs(item.quantity).toLocaleString('en-US')}`
                                    : item.type === 'ADJUSTMENT'
                                    ? `-${Math.abs(item.quantity).toLocaleString('en-US')}`
                                    : item.quantity > 0
                                    ? `+${item.quantity.toLocaleString('en-US')}`
                                    : item.quantity.toLocaleString('en-US')}{' '}
                                  {item.unit}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 font-mono text-[11px] whitespace-nowrap">
                                {item.beforeStock !== undefined && item.afterStock !== undefined ? (
                                  <div className="space-y-0.5">
                                    <div>
                                      <span className="text-muted-gray text-[10px]">Before: </span>
                                      <span className="text-charcoal font-semibold">
                                        {item.beforeStock.toLocaleString('en-US')} {item.unit}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-gray text-[10px]">After: </span>
                                      <span className="text-charcoal font-semibold">
                                        {item.afterStock.toLocaleString('en-US')} {item.unit}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="py-3 px-3.5 font-medium text-charcoal whitespace-nowrap">
                                {item.reason || '—'}
                              </td>
                              <td className="py-3 px-3.5 text-muted-gray max-w-[200px] truncate" title={item.note}>
                                {item.note || '—'}
                              </td>
                              <td className="py-3 px-3.5 text-muted-gray font-medium whitespace-nowrap">
                                {item.performedBy || 'Manager'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile / Tablet Portrait Card View (lg:hidden) */}
                  <div className="block lg:hidden space-y-3">
                    {filteredHistory.map((item) => {
                      let typeBadge = (
                        <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              REFILL
                        </span>
                      );
                      if (item.type === 'ADJUSTMENT') {
                        typeBadge = (
                          <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                                ADJUSTMENT
                          </span>
                        );
                      } else if (item.type === 'STOCK CHECK') {
                        typeBadge = (
                          <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-300">
                                STOCK CHECK
                          </span>
                        );
                      }

                      const isNeg = item.quantity < 0;
                      const qtyFormatted =
                        item.type === 'REFILL'
                          ? `+${Math.abs(item.quantity).toLocaleString('en-US')}`
                          : item.type === 'ADJUSTMENT'
                          ? `-${Math.abs(item.quantity).toLocaleString('en-US')}`
                          : item.quantity > 0
                          ? `+${item.quantity.toLocaleString('en-US')}`
                          : item.quantity.toLocaleString('en-US');

                      return (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-[12px] bg-white border border-border/80 shadow-2xs space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-muted-gray font-medium">
                              {item.dateTime}
                            </span>
                            {typeBadge}
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-sm text-charcoal truncate">
                              {item.productName}
                            </span>
                            <span
                              className={`font-mono font-bold text-sm shrink-0 ${
                                item.type === 'REFILL'
                                  ? 'text-emerald-600'
                                  : item.type === 'ADJUSTMENT' || isNeg
                                  ? 'text-rose-600'
                                  : 'text-muted-gray'
                              }`}
                            >
                              {qtyFormatted} {item.unit}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-border/40 text-[11px]">
                            <div>
                              <span className="text-muted-gray block text-[10px]">Before Stock</span>
                              <span className="font-semibold text-charcoal">
                                {item.beforeStock !== undefined
                                  ? `${item.beforeStock.toLocaleString('en-US')} ${item.unit}`
                                  : '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-gray block text-[10px]">After Stock</span>
                              <span className="font-semibold text-charcoal">
                                {item.afterStock !== undefined
                                  ? `${item.afterStock.toLocaleString('en-US')} ${item.unit}`
                                  : '—'}
                              </span>
                            </div>
                          </div>

                          {(item.reason || item.note || item.performedBy) && (
                            <div className="pt-1.5 border-t border-border/40 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px]">
                              {item.reason && (
                                <div>
                                  <span className="text-muted-gray text-[10px]">Reason: </span>
                                  <span className="font-semibold text-charcoal">{item.reason}</span>
                                </div>
                              )}
                              {item.performedBy && (
                                <div>
                                  <span className="text-muted-gray text-[10px]">By: </span>
                                  <span className="font-medium text-charcoal">{item.performedBy}</span>
                                </div>
                              )}
                              {item.note && (
                                <div className="w-full text-muted-gray text-[10px] italic">
                                  Note: {item.note}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end px-4 sm:px-6 py-3.5 sm:py-4 border-t border-border bg-white shrink-0">
              <Button onClick={() => setActiveModal(null)} className="w-full sm:w-auto h-11">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
