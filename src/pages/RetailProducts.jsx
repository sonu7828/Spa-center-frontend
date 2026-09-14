/**
 * RetailProducts — Screen for Managing Retail Drinks & Cosmetics
 *
 * Provides two clean tabs:
 *   [ Drinks ]   [ Cosmetics ]
 *
 * Manager can:
 *   - View products (Name, Selling Price, Current Stock, Active/Inactive)
 *   - + Add Product (Drink or Cosmetic)
 *   - Edit Product (Name, Selling Price, Stock, Active status)
 *   - Quick Toggle Active / Deactivate
 */

import { useState } from 'react';
import { Coffee, Sparkles, Plus, Pencil, CheckCircle2, XCircle, AlertCircle, X, Check } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useRetail } from '../context/RetailContext';
import { useAuth } from '../context/AuthContext';

export default function RetailProducts() {
  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  const {
    drinks,
    cosmetics,
    addDrink,
    updateDrink,
    toggleDrinkActive,
    addCosmetic,
    updateCosmetic,
    toggleCosmeticActive,
  } = useRetail();

  // Active tab: 'drinks' | 'cosmetics'
  const [activeTab, setActiveTab] = useState('drinks');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // null for Add, object for Edit

  // Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const currentProducts = activeTab === 'drinks' ? drinks : cosmetics;

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setStock('');
    setIsActive(true);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(String(product.price));
    setStock(String(product.stock));
    setIsActive(product.active);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setErrorMsg('');
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Product name is required');
      return;
    }

    const priceNum = parseInt(price, 10);
    if (isNaN(priceNum) || priceNum < 0) {
      setErrorMsg('Please enter a valid price');
      return;
    }

    const stockNum = parseInt(stock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      setErrorMsg('Please enter a valid stock quantity');
      return;
    }

    if (activeTab === 'drinks') {
      if (editingProduct) {
        updateDrink(editingProduct.id, {
          name: name.trim(),
          price: priceNum,
          stock: stockNum,
          active: isActive,
        });
      } else {
        addDrink({
          name: name.trim(),
          price: priceNum,
          stock: stockNum,
          active: isActive,
        });
      }
    } else {
      if (editingProduct) {
        updateCosmetic(editingProduct.id, {
          name: name.trim(),
          price: priceNum,
          stock: stockNum,
          active: isActive,
        });
      } else {
        addCosmetic({
          name: name.trim(),
          price: priceNum,
          stock: stockNum,
          active: isActive,
        });
      }
    }

    closeModal();
  };

  const handleToggle = (product) => {
    if (activeTab === 'drinks') {
      toggleDrinkActive(product.id);
    } else {
      toggleCosmeticActive(product.id);
    }
  };

  return (
    <div>
      <PageHeader
        title="Retail Products"
        subtitle="Drinks and cosmetics sold to clients."
        action={
          isManager && (
            <Button onClick={openAddModal}>
              <Plus size={16} strokeWidth={2} />
              {activeTab === 'drinks' ? 'Add Drink' : 'Add Cosmetic'}
            </Button>
          )
        }
      />

      {/* ── Tabs ── */}
      <div className="flex items-center gap-2 sm:gap-3 mb-6 overflow-x-auto pb-0.5 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('drinks')}
          className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-[12px] text-xs font-bold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'drinks'
              ? 'bg-charcoal text-white shadow-sm'
              : 'bg-white border border-border text-muted-gray hover:text-charcoal hover:bg-soft-cream/40'
          }`}
        >
          <Coffee size={15} />
          <span>Drinks</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'drinks' ? 'bg-white/20 text-white' : 'bg-soft-cream text-charcoal'
            }`}
          >
            {drinks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cosmetics')}
          className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-[12px] text-xs font-bold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'cosmetics'
              ? 'bg-charcoal text-white shadow-sm'
              : 'bg-white border border-border text-muted-gray hover:text-charcoal hover:bg-soft-cream/40'
          }`}
        >
          <Sparkles size={15} />
          <span>Cosmetics</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'cosmetics' ? 'bg-white/20 text-white' : 'bg-soft-cream text-charcoal'
            }`}
          >
            {cosmetics.length}
          </span>
        </button>
      </div>

      {/* ── Products List / Table ── */}
      <div className="bg-white border border-border rounded-[16px] shadow-card overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-soft-cream/60 border-b border-border text-[10px] font-bold text-muted-gray uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-5">Product Name</th>
                <th className="py-3.5 px-5">Category</th>
                <th className="py-3.5 px-5">Selling Price</th>
                <th className="py-3.5 px-5">Current Stock</th>
                <th className="py-3.5 px-5">Status</th>
                {isManager && <th className="py-3.5 px-5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {currentProducts.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 6 : 5} className="py-12 text-center text-sm text-muted-gray">
                    No products found in this category.
                  </td>
                </tr>
              ) : (
                currentProducts.map((product) => (
                <tr
                  key={product.id}
                  className="hover:bg-sage-soft/10 transition-colors"
                >
                  <td className="py-3.5 px-5 font-bold text-charcoal text-sm">
                    {product.name}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-soft-cream text-charcoal">
                      {activeTab === 'drinks' ? '🥤 Drink' : '✨ Cosmetic'}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 font-extrabold text-charcoal text-sm">
                    {product.price.toLocaleString('en-US')}{' '}
                    <span className="text-xs font-normal text-muted-gray">FCFA</span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span
                      className={`font-mono font-bold px-2 py-1 rounded-[6px] text-xs ${
                        product.stock === 0
                          ? 'bg-error-soft text-error'
                          : product.stock <= 5
                          ? 'bg-warning-soft text-warning'
                          : 'bg-success-soft text-success'
                      }`}
                    >
                      {product.stock} units
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <button
                      type="button"
                      disabled={!isManager}
                      onClick={() => handleToggle(product)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-bold border transition-colors ${
                        product.active
                          ? 'bg-success-soft text-success border-success/30 hover:bg-success/10'
                          : 'bg-muted-gray/10 text-muted-gray border-border hover:bg-muted-gray/20'
                      } ${isManager ? 'cursor-pointer' : 'cursor-default'}`}
                      title={isManager ? 'Click to toggle Active / Inactive' : undefined}
                    >
                      {product.active ? (
                        <>
                          <CheckCircle2 size={13} className="text-success" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={13} className="text-muted-gray" />
                          <span>Inactive</span>
                        </>
                      )}
                    </button>
                  </td>
                  {isManager && (
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(product)}
                          className="h-8 px-3 rounded-[8px] bg-sage-soft/70 hover:bg-sage-soft text-charcoal font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Pencil size={13} />
                          <span>Edit</span>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile / Tablet Portrait Cards View */}
        <div className="block md:hidden divide-y divide-border/60">
          {currentProducts.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-gray">
              No products found in this category.
            </div>
          ) : (
            currentProducts.map((product) => (
            <div key={product.id} className="p-4 space-y-3 hover:bg-soft-cream/20 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-charcoal">{product.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-soft-cream text-charcoal">
                      {activeTab === 'drinks' ? '🥤 Drink' : '✨ Cosmetic'}
                    </span>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded-[5px] text-[11px] ${
                        product.stock === 0
                          ? 'bg-error-soft text-error'
                          : product.stock <= 5
                          ? 'bg-warning-soft text-warning'
                          : 'bg-success-soft text-success'
                      }`}
                    >
                      {product.stock} units
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-extrabold text-charcoal">
                    {product.price.toLocaleString('en-US')} FCFA
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                <button
                  type="button"
                  disabled={!isManager}
                  onClick={() => handleToggle(product)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-bold border transition-colors ${
                    product.active
                      ? 'bg-success-soft text-success border-success/30'
                      : 'bg-muted-gray/10 text-muted-gray border-border'
                  } ${isManager ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {product.active ? (
                    <>
                      <CheckCircle2 size={13} className="text-success" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={13} className="text-muted-gray" />
                      <span>Inactive</span>
                    </>
                  )}
                </button>

                {isManager && (
                  <button
                    type="button"
                    onClick={() => openEditModal(product)}
                    className="h-9 px-4 rounded-[9px] bg-sage-soft hover:bg-sage/20 text-charcoal font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-sage/30"
                  >
                    <Pencil size={13} />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            </div>
          ))
          )}
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-[20px] max-w-[calc(100vw-24px)] sm:max-w-md w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border shrink-0">
              <span className="font-bold text-sm text-charcoal">
                {editingProduct
                  ? `Edit ${activeTab === 'drinks' ? 'Drink' : 'Cosmetic'}`
                  : `Add ${activeTab === 'drinks' ? 'Drink' : 'Cosmetic'}`}
              </span>
              <button
                type="button"
                onClick={closeModal}
                className="w-8 h-8 rounded-full hover:bg-soft-cream flex items-center justify-center text-muted-gray hover:text-charcoal cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-[10px] bg-error-soft text-error text-xs font-semibold">
                  <AlertCircle size={15} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-charcoal mb-1">
                  Product Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    activeTab === 'drinks'
                      ? 'e.g. Mineral Water, Fresh Mango Juice'
                      : 'e.g. Face Cream, Argan Oil, Cuticle Oil'
                  }
                  className="w-full h-[44px] px-3.5 py-2.5 rounded-[11px] border border-border text-sm focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1">
                    Selling Price (FCFA) <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full h-[44px] px-3.5 py-2.5 rounded-[11px] border border-border text-sm focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1">
                    Current Stock <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="e.g. 20"
                    className="w-full h-[44px] px-3.5 py-2.5 rounded-[11px] border border-border text-sm focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal mb-2">
                  Status
                </label>
                <div className="flex items-center gap-3">
                  <label
                    onClick={() => setIsActive(true)}
                    className={`flex-1 flex items-center justify-center gap-2 h-[42px] px-3.5 rounded-[10px] border text-xs font-bold cursor-pointer transition-all ${
                      isActive
                        ? 'bg-success-soft border-success/40 text-success'
                        : 'bg-white border-border text-muted-gray'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isActive ? 'border-success bg-success' : 'border-muted-gray'
                      }`}
                    >
                      {isActive && <Check size={10} className="text-white" />}
                    </span>
                    <span>Active</span>
                  </label>

                  <label
                    onClick={() => setIsActive(false)}
                    className={`flex-1 flex items-center justify-center gap-2 h-[42px] px-3.5 rounded-[10px] border text-xs font-bold cursor-pointer transition-all ${
                      !isActive
                        ? 'bg-muted-gray/10 border-muted-gray/40 text-charcoal'
                        : 'bg-white border-border text-muted-gray'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        !isActive ? 'border-charcoal bg-charcoal' : 'border-muted-gray'
                      }`}
                    >
                      {!isActive && <Check size={10} className="text-white" />}
                    </span>
                    <span>Inactive</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-border shrink-0">
                <Button variant="secondary" className="w-full sm:w-auto" onClick={closeModal} type="button">
                  Cancel
                </Button>
                <Button className="w-full sm:w-auto" type="submit">
                  {editingProduct ? 'Save Changes' : 'Add Product'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
