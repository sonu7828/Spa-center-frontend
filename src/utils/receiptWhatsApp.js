import { formatInvoiceNumber } from '../context/InvoiceContext';

/**
 * Builds a beautifully formatted official digital receipt for WhatsApp
 */
export function buildReceiptWhatsAppMessage(invoice, client, clientLoyalty) {
  if (!invoice) return '';

  const invNumber = formatInvoiceNumber(invoice);
  const clientName = client?.name || invoice.clientName || 'Valued Guest';

  const paidDate = invoice.paidAt ? new Date(invoice.paidAt) : new Date();
  const dateStr = paidDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = invoice.paidTime || paidDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const grandTotal =
    invoice.finalTotal !== undefined
      ? invoice.finalTotal
      : invoice.totalAmount !== undefined
      ? invoice.totalAmount
      : invoice.total || 0;

  const formatPaymentMethod = (pm) => {
    const p = String(pm || 'cash').trim().toUpperCase();
    if (p.includes('MTN')) return 'MTN MoMo';
    if (p.includes('ORANGE')) return 'Orange Money';
    return 'Cash';
  };
  const pmDisplay = formatPaymentMethod(invoice.paymentMethod);

  // Line items formatting
  const items = invoice.items || [];
  let itemsText = '';
  if (items.length > 0) {
    itemsText = items
      .map((it) => {
        const priceNum =
          typeof it.price === 'number'
            ? it.price
            : parseInt(String(it.price).replace(/[^0-9]/g, ''), 10) || 0;
        const tech = it.technician && it.technician !== '—' && it.technician !== 'Staff'
          ? ` _(Tech: ${it.technician})_`
          : '';
        return `• ${it.service || it.name || 'Treatment'} — *${priceNum.toLocaleString('en-US')} FCFA*${tech}`;
      })
      .join('\n');
  } else {
    itemsText = `• Spa Treatments — *${Number(grandTotal).toLocaleString('en-US')} FCFA*`;
  }

  const pointsEarned = invoice.pointsEarned || Math.round(Number(grandTotal) / 1000);
  const currentBalance =
    clientLoyalty?.balance !== undefined
      ? clientLoyalty.balance
      : client?.loyaltyPoints !== undefined
      ? client.loyaltyPoints
      : pointsEarned;

  return `🧾 *OMEGA SPA — Reçu / Official Receipt*
----------------------------------------
*Facture / Invoice:* ${invNumber}
*Date:* ${dateStr} à ${timeStr}
*Client:* ${clientName}

*Prestations & Soins / Services:*
${itemsText}

----------------------------------------
*Total Payé / Paid:* *${Number(grandTotal).toLocaleString('en-US')} FCFA*
*Mode de Paiement:* ${pmDisplay}
*Points Fidélité / Loyalty:* +${pointsEarned} pts (Solde: ${currentBalance} pts)
----------------------------------------
_Merci pour votre visite chez OMEGA SPA !_ 🌿
_Douala, Cameroun · Tél: +237 6 87 67 32 62_`;
}
