import { formatMoney } from './money';

const fr = (iso) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10).split('-').reverse().join('/') : iso || '');

// jsPDF's built-in fonts cannot print the narrow no-break space toLocaleString uses.
const money = (n) => formatMoney(n).replace(/[  ]/g, ' ');

// Invoice as a PDF: clinic header, number, lines, total, payments and balance.
// jsPDF is large, so it is only downloaded when this runs.
export async function pdfInvoice(facture) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const left = 14;
  const right = 196;
  let y = 20;

  doc.setFillColor(67, 56, 202);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('MEDIBuddy', left, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Cabinet médical - gestion des patients', left, 21);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`FACTURE ${facture.numero}`, right, 14, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date : ${fr(facture.date)}`, right, 21, { align: 'right' });
  if (facture.annulee) doc.text('ANNULÉE', right, 27, { align: 'right' });

  doc.setTextColor(40, 40, 40);
  y = 44;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Patient', left, y);
  doc.setFont('helvetica', 'normal');
  doc.text(facture.patient_nom || '', left + 22, y);

  y += 14;
  doc.setFillColor(238, 242, 255);
  doc.rect(left, y - 5, right - left, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Service', left + 2, y);
  doc.text('Qté', 120, y, { align: 'right' });
  doc.text('Prix unitaire', 158, y, { align: 'right' });
  doc.text('Montant', right - 2, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  y += 9;
  facture.lignes.forEach((l) => {
    doc.text(String(l.service), left + 2, y);
    doc.text(String(l.qty), 120, y, { align: 'right' });
    doc.text(money(l.prix), 158, y, { align: 'right' });
    doc.text(money(l.qty * l.prix), right - 2, y, { align: 'right' });
    y += 7;
  });

  doc.setDrawColor(200, 200, 200);
  doc.line(left, y - 3, right, y - 3);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Total', 158, y, { align: 'right' });
  doc.text(money(facture.total), right - 2, y, { align: 'right' });

  y += 14;
  doc.setFontSize(12);
  doc.text('Paiements', left, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  y += 7;
  if (facture.paiements.length === 0) {
    doc.text('Aucun paiement enregistré.', left + 2, y);
    y += 7;
  }
  facture.paiements.forEach((p) => {
    doc.text(`${fr(p.date)}  -  ${p.mode}`, left + 2, y);
    doc.text(money(p.montant), right - 2, y, { align: 'right' });
    y += 7;
  });

  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(left, y - 4, right, y - 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Payé', 158, y, { align: 'right' });
  doc.text(money(facture.paye), right - 2, y, { align: 'right' });
  y += 8;
  doc.text('Reste à payer', 158, y, { align: 'right' });
  doc.text(money(facture.reste), right - 2, y, { align: 'right' });
  y += 8;
  doc.text('Statut', 158, y, { align: 'right' });
  doc.text(facture.statut, right - 2, y, { align: 'right' });

  if (facture.annulee && facture.annulation) {
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Annulée le ${fr(facture.annulation.date)} : ${facture.annulation.motif}`, left, y);
  }

  doc.save(`facture_${facture.numero}.pdf`);
}
