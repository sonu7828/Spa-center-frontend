/**
 * ReceiptModal — Professional Printable Receipt for OMEGA SPA
 *
 * Produces a clean, properly formatted A4 / thermal receipt with:
 *   - Business header with logo-style branding
 *   - Invoice number, date, time, cashier
 *   - Client details
 *   - Structured services table with Technician, Product, Unit Price
 *   - Subtotal, Discount, Grand Total
 *   - Payment method & status
 *   - Loyalty points summary
 *   - Footer with thank-you and business info
 *
 * The @media print stylesheet hides ALL app UI and prints ONLY the receipt
 * in a clean format suitable for A4 paper or 80mm thermal printers.
 */

import { Printer, X } from 'lucide-react';
import Button from './Button';
import { formatInvoiceNumber } from '../context/InvoiceContext';

export default function ReceiptModal({ isOpen, onClose, invoice, clientLoyalty }) {
  if (!isOpen || !invoice) return null;

  const invNumber = formatInvoiceNumber(invoice);

  const paidDate = invoice.paidAt ? new Date(invoice.paidAt) : new Date();
  const dateStr = paidDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const timeStr =
    invoice.paidTime ||
    paidDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const subtotal = invoice.total || 0;
  const discount = invoice.discount || 0;
  const grandTotal = invoice.finalTotal !== undefined ? invoice.finalTotal : subtotal;
  
  const formatPaymentMethod = (pm) => {
    const p = String(pm || 'cash').trim().toUpperCase();
    if (p.includes('MTN')) return 'MTN MOMO';
    if (p.includes('ORANGE')) return 'ORANGE MONEY';
    return 'CASH';
  };
  const paymentMethodDisplay = formatPaymentMethod(invoice.paymentMethod);
  const pointsEarned = invoice.pointsEarned || Math.round(grandTotal / 1000);
  const pointsRedeemed = invoice.pointsRedeemed || 0;

  // Unique technicians
  const technicians =
    invoice.items
      .map((it) => it.technician)
      .filter((v, i, a) => a.indexOf(v) === i && v && v !== '—' && v !== 'Retail')
      .join(', ') || '—';

  const serviceItems = (invoice.items || []).filter(
    (it) => it.type !== 'drink' && it.type !== 'cosmetic'
  );
  const drinkItems = (invoice.items || []).filter((it) => it.type === 'drink');
  const cosmeticItems = (invoice.items || []).filter((it) => it.type === 'cosmetic');

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/50 backdrop-blur-xs overflow-hidden">
      {/* ── Print-only CSS ── */}
      <style>{`
        @media print {
          /* Hide everything */
          html, body { margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden !important; }

          /* Show only receipt */
          #omega-receipt-print, #omega-receipt-print * {
            visibility: visible !important;
          }

          #omega-receipt-print {
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 28px 36px !important;
            background: #fff !important;
            color: #1a1a1a !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif !important;
            font-size: 11pt !important;
            line-height: 1.5 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .receipt-header-bar {
            background: #2E2F31 !important;
            color: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .receipt-total-row {
            background: #f5f1ec !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .receipt-paid-badge {
            background: #EDF4EE !important;
            color: #4a8c5c !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print { display: none !important; }

          @page {
            size: A4;
            margin: 12mm 16mm;
          }
        }
      `}</style>

      <div className="bg-white rounded-[20px] max-w-[520px] w-full shadow-2xl flex flex-col" style={{ maxHeight: 'min(92vh, 92dvh)', height: 'min(92vh, 92dvh)' }}>
        {/* ── Modal Chrome (hidden on print) ── */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border no-print shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-sage-soft flex items-center justify-center shrink-0">
              <Printer size={16} className="text-sage" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-sm text-charcoal block leading-tight truncate">Receipt Preview</span>
              <span className="text-[11px] text-muted-gray">{invNumber}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-soft-cream flex items-center justify-center text-muted-gray hover:text-charcoal transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Receipt Content (scrollable in preview, full in print) ── */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 sm:p-5 bg-warm-ivory/40 flex justify-center items-start">
          <div
            id="omega-receipt-print"
            style={{ fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif" }}
            className="bg-white border border-border rounded-[14px] w-full max-w-[460px] shadow-card"
          >

            {/* ═══════ TOP BAR ═══════ */}
            <div className="receipt-header-bar bg-charcoal text-white px-4 sm:px-6 py-4 sm:py-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '2px', margin: 0 }}>
                    OMEGA SPA
                  </h1>
                  <p style={{ fontSize: '10px', opacity: 0.7, margin: '2px 0 0', letterSpacing: '1px' }}>
                    DOUALA, CAMEROON
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '10px', opacity: 0.6, margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Official Receipt
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: 700, margin: '2px 0 0', letterSpacing: '0.5px' }}>
                    {invNumber}
                  </p>
                </div>
              </div>
            </div>

            {/* ═══════ DATE / CLIENT INFO ═══════ */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #E8E1D9' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#76736F', width: '100px', verticalAlign: 'top' }}>Date</td>
                    <td style={{ padding: '4px 0', fontWeight: 600, color: '#2E2F31' }}>{dateStr}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#76736F' }}>Time</td>
                    <td style={{ padding: '4px 0', fontWeight: 600, color: '#2E2F31' }}>{timeStr}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#76736F' }}>Client</td>
                    <td style={{ padding: '4px 0', fontWeight: 700, color: '#2E2F31', fontSize: '13px' }}>
                      {invoice.clientName}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#76736F' }}>Technician(s)</td>
                    <td style={{ padding: '4px 0', fontWeight: 600, color: '#2E2F31' }}>{technicians}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ═══════ SERVICES & RETAIL ITEMS ═══════ */}
            <div style={{ padding: '14px 18px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#76736F', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px' }}>
                Items & Services Rendered
              </p>
              <div className="overflow-x-auto w-full space-y-3">
                {/* 1. SERVICES (if any) */}
                {serviceItems.length > 0 && (
                  <div>
                    <div style={{ padding: '4px 0', borderBottom: '1px solid #2E2F31', fontSize: '10px', fontWeight: 800, color: '#2E2F31', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      SERVICES ({serviceItems.length})
                    </div>
                    <table style={{ width: '100%', minWidth: '320px', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <tbody>
                        {serviceItems.map((item, idx) => {
                          const priceNum =
                            typeof item.price === 'number'
                              ? item.price
                              : parseInt(String(item.price).replace(/[^0-9]/g, ''), 10) || 0;
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #E8E1D9' }}>
                              <td style={{ padding: '8px 0', fontWeight: 600, color: '#2E2F31' }}>
                                <div>{item.service || item.name}</div>
                                <div style={{ fontSize: '10px', color: '#76736F', fontWeight: 400 }}>
                                  Tech: {item.technician || 'Staff'} {item.product ? `· ${item.product}` : ''}
                                </div>
                              </td>
                              <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: '#2E2F31', whiteSpace: 'nowrap' }}>
                                {priceNum.toLocaleString('en-US')} FCFA
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 2. DRINKS (if any) */}
                {drinkItems.length > 0 && (
                  <div>
                    <div style={{ padding: '4px 0', borderBottom: '1px solid #2E2F31', fontSize: '10px', fontWeight: 800, color: '#2E2F31', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      DRINKS ({drinkItems.length})
                    </div>
                    <table style={{ width: '100%', minWidth: '320px', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <tbody>
                        {drinkItems.map((item, idx) => {
                          const priceNum =
                            typeof item.price === 'number'
                              ? item.price
                              : parseInt(String(item.price).replace(/[^0-9]/g, ''), 10) || 0;
                          const qty = item.qty || 1;
                          const unitPrice = item.unitPrice || Math.round(priceNum / qty);
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #E8E1D9' }}>
                              <td style={{ padding: '8px 0', fontWeight: 600, color: '#2E2F31' }}>
                                <div>{item.name || item.service}</div>
                                <div style={{ fontSize: '10px', color: '#76736F', fontWeight: 400 }}>
                                  Qty: {qty} {qty > 1 ? `· (${unitPrice.toLocaleString('en-US')} FCFA each)` : '· Retail Drink'}
                                </div>
                              </td>
                              <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: '#2E2F31', whiteSpace: 'nowrap' }}>
                                {priceNum.toLocaleString('en-US')} FCFA
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 3. COSMETICS (if any) */}
                {cosmeticItems.length > 0 && (
                  <div>
                    <div style={{ padding: '4px 0', borderBottom: '1px solid #2E2F31', fontSize: '10px', fontWeight: 800, color: '#2E2F31', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      COSMETICS ({cosmeticItems.length})
                    </div>
                    <table style={{ width: '100%', minWidth: '320px', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <tbody>
                        {cosmeticItems.map((item, idx) => {
                          const priceNum =
                            typeof item.price === 'number'
                              ? item.price
                              : parseInt(String(item.price).replace(/[^0-9]/g, ''), 10) || 0;
                          const qty = item.qty || 1;
                          const unitPrice = item.unitPrice || Math.round(priceNum / qty);
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #E8E1D9' }}>
                              <td style={{ padding: '8px 0', fontWeight: 600, color: '#2E2F31' }}>
                                <div>{item.name || item.service}</div>
                                <div style={{ fontSize: '10px', color: '#76736F', fontWeight: 400 }}>
                                  Qty: {qty} {qty > 1 ? `· (${unitPrice.toLocaleString('en-US')} FCFA each)` : '· Retail Cosmetic'}
                                </div>
                              </td>
                              <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: '#2E2F31', whiteSpace: 'nowrap' }}>
                                {priceNum.toLocaleString('en-US')} FCFA
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* ═══════ TOTALS ═══════ */}
            <div style={{ padding: '0 18px 14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <tbody>
                  {/* Subtotal (always show) */}
                  <tr style={{ borderTop: '1px solid #E8E1D9' }}>
                    <td style={{ padding: '8px 0', color: '#76736F' }}>Subtotal</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: '#2E2F31' }}>
                      {subtotal.toLocaleString('en-US')} FCFA
                    </td>
                  </tr>

                  {/* Discount (if applied) */}
                  {discount > 0 && (
                    <tr>
                      <td style={{ padding: '6px 0', color: '#7FA285' }}>
                        Loyalty Discount ({pointsRedeemed} pts redeemed)
                      </td>
                      <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600, color: '#7FA285' }}>
                        −{discount.toLocaleString('en-US')} FCFA
                      </td>
                    </tr>
                  )}

                  {/* Grand Total */}
                  <tr className="receipt-total-row" style={{ borderTop: '2px solid #2E2F31' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 800, fontSize: '14px', color: '#2E2F31' }}>
                      TOTAL
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, fontSize: '14px', color: '#2E2F31' }}>
                      {grandTotal.toLocaleString('en-US')} FCFA
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ═══════ PAYMENT & STATUS ═══════ */}
            <div style={{ padding: '0 18px 14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <tbody>
                  <tr style={{ borderTop: '1px solid #E8E1D9' }}>
                    <td style={{ padding: '8px 0', color: '#76736F' }}>Payment Method</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: '#2E2F31' }}>
                      {paymentMethodDisplay}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 0', color: '#76736F' }}>Status</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>
                      <span
                        className="receipt-paid-badge"
                        style={{
                          display: 'inline-block',
                          padding: '3px 12px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: '#EDF4EE',
                          color: '#4a8c5c',
                          letterSpacing: '0.5px',
                        }}
                      >
                        ✓ PAID
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ═══════ LOYALTY POINTS ═══════ */}
            {(invoice.clientId || clientLoyalty) && (
              <div style={{
                margin: '0 18px 14px',
                padding: '12px 14px',
                backgroundColor: '#F6F1EB',
                borderRadius: '10px',
                fontSize: '11px',
              }}>
                <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '10px', color: '#76736F', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Loyalty Program
                </p>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '3px 0', color: '#2E2F31' }}>Points Earned This Visit</td>
                      <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 700, color: '#7FA285' }}>
                        +{pointsEarned} pts
                      </td>
                    </tr>
                    {pointsRedeemed > 0 && (
                      <tr>
                        <td style={{ padding: '3px 0', color: '#2E2F31' }}>Points Redeemed</td>
                        <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 600, color: '#C77B6E' }}>
                          −{pointsRedeemed} pts
                        </td>
                      </tr>
                    )}
                    {clientLoyalty && (
                      <tr style={{ borderTop: '1px solid #E8E1D9' }}>
                        <td style={{ padding: '6px 0 3px', fontWeight: 600, color: '#2E2F31' }}>
                          Current Balance
                        </td>
                        <td style={{ padding: '6px 0 3px', textAlign: 'right', fontWeight: 800, color: '#2E2F31', fontSize: '13px' }}>
                          {clientLoyalty.balance} pts
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ═══════ FOOTER ═══════ */}
            <div style={{
              padding: '14px 18px 16px',
              borderTop: '1px solid #E8E1D9',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#2E2F31', margin: '0 0 4px' }}>
                Thank you for visiting OMEGA SPA!
              </p>
              <p style={{ fontSize: '11px', color: '#76736F', margin: '0 0 10px' }}>
                We look forward to pampering you again soon.
              </p>
              <div style={{ fontSize: '10px', color: '#9e9a96', lineHeight: '1.6' }}>
                <p style={{ margin: 0 }}>OMEGA SPA · Douala, Cameroon</p>
                <p style={{ margin: 0 }}>Tel: +237 600 000 000 · info@omegaspa.cm</p>
                <p style={{ margin: '4px 0 0', fontStyle: 'italic', fontSize: '9px' }}>
                  This receipt was generated electronically and is valid without signature.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Modal Actions (hidden on print) ── */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end sm:gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-border bg-white no-print shrink-0">
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto h-11">
            Close
          </Button>
          <Button onClick={handlePrint} className="w-full sm:w-auto h-11">
            <Printer size={16} strokeWidth={1.8} />
            Print Receipt
          </Button>
        </div>
      </div>
    </div>
  );
}
