import { jsPDF } from 'jspdf';

type Finding = {
  id: number;
  kind: string;
  reference: string;
  status: 'Confirmada' | 'Divergente' | 'Não localizada' | 'Atenção';
  risk: 'Baixo' | 'Médio' | 'Alto';
  detail: string;
  action: string;
};

type Review = {
  id: string;
  name: string;
  date: string;
  status: string;
  findings: Finding[];
  text: string;
};

const GOLD: [number, number, number] = [196, 154, 69];
const DARK: [number, number, number] = [16, 27, 43];
const GRAY: [number, number, number] = [110, 125, 141];
const LIGHT_GRAY: [number, number, number] = [232, 237, 242];
const RED: [number, number, number] = [173, 81, 67];
const AMBER: [number, number, number] = [164, 122, 40];
const BLUE: [number, number, number] = [80, 116, 154];

function statusColor(status: string): [number, number, number] {
  if (status === 'Não localizada') return RED;
  if (status === 'Divergente') return AMBER;
  return BLUE;
}

function riskColor(risk: string): [number, number, number] {
  if (risk === 'Alto') return RED;
  if (risk === 'Médio') return AMBER;
  return [66, 132, 93];
}

export function exportReportPDF(review: Review) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = 0;

  // Header band
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 80, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 80, pageW, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('JURISCHECK', margin, 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(196, 154, 69);
  doc.text('INTELIGÊNCIA JURÍDICA', margin, 54);
  doc.setFontSize(8);
  doc.setTextColor(174, 186, 202);
  doc.text('Relatório de conferência', pageW - margin, 38, { align: 'right' });
  doc.text(review.date, pageW - margin, 54, { align: 'right' });

  y = 110;

  // Document info
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const docName = doc.splitTextToSize(review.name, contentW);
  doc.text(docName, margin, y);
  y += docName.length * 16 + 6;

  // Status badge
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(`Status: ${review.status}`, margin, y);
  y += 24;

  // Warning box
  const warnText = 'Relatório demonstrativo — não utilizar como parecer jurídico. Os status abaixo são exemplos de interface. Nenhuma fonte oficial foi consultada e nenhuma conclusão sobre autenticidade foi produzida.';
  const warnLines = doc.splitTextToSize(warnText, contentW - 24);
  const warnH = warnLines.length * 12 + 20;
  doc.setFillColor(255, 241, 239);
  doc.rect(margin, y, contentW, warnH, 'F');
  doc.setDrawColor(240, 209, 203);
  doc.setLineWidth(1);
  doc.rect(margin, y, contentW, warnH, 'S');
  doc.setTextColor(...RED);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('AVISO', margin + 12, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 60, 50);
  doc.setFontSize(8);
  doc.text(warnLines, margin + 12, y + 30);
  y += warnH + 20;

  // Summary
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Resumo da revisão', margin, y);
  y += 8;
  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(1);
  doc.line(margin, y, margin + contentW, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(`Referências analisadas: ${review.findings.length}`, margin, y);
  y += 14;
  doc.text(`Classificação: Simulação (demonstração)`, margin, y);
  y += 24;

  // Findings
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Pontos de conferência', margin, y);
  y += 8;
  doc.line(margin, y, margin + contentW, y);
  y += 18;

  review.findings.forEach((f, idx) => {
    if (y > pageH - 120) { doc.addPage(); y = margin; }

    // Card background
    const refLines = doc.splitTextToSize(f.reference, contentW - 24);
    const detailLines = doc.splitTextToSize(f.detail, contentW - 24);
    const actionLines = doc.splitTextToSize(`Próxima ação: ${f.action}`, contentW - 36);
    const cardH = 28 + refLines.length * 13 + detailLines.length * 12 + actionLines.length * 11 + 20;

    if (y + cardH > pageH - 48) { doc.addPage(); y = margin; }

    doc.setFillColor(252, 253, 254);
    doc.rect(margin, y, contentW, cardH, 'F');
    doc.setDrawColor(...LIGHT_GRAY);
    doc.setLineWidth(1);
    doc.rect(margin, y, contentW, cardH, 'S');

    // Badges
    let bx = margin + 12;
    const by = y + 16;
    const sc = statusColor(f.status);
    doc.setFillColor(sc[0] + 12, sc[1] + 12, sc[2] + 12);
    doc.rect(bx, by, doc.getTextWidth(f.status) + 14, 16, 'F');
    doc.setTextColor(sc[0], sc[1], sc[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(f.status, bx + 7, by + 11);
    bx += doc.getTextWidth(f.status) + 20;

    const rk = `Risco ${f.risk}`;
    const rc = riskColor(f.risk);
    doc.setFillColor(rc[0] + 14, rc[1] + 14, rc[2] + 14);
    doc.rect(bx, by, doc.getTextWidth(rk) + 14, 16, 'F');
    doc.setTextColor(rc[0], rc[1], rc[2]);
    doc.text(rk, bx + 7, by + 11);
    bx += doc.getTextWidth(rk) + 20;

    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(f.kind, bx, by + 11);

    // Reference
    let cy = y + 42;
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(refLines, margin + 12, cy);
    cy += refLines.length * 13 + 4;

    // Detail
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(detailLines, margin + 12, cy);
    cy += detailLines.length * 12 + 6;

    // Action
    doc.setFillColor(...GOLD);
    doc.rect(margin + 12, cy, 3, actionLines.length * 11 + 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(113, 128, 146);
    doc.text(actionLines, margin + 20, cy + 8);

    y += cardH + 12;
  });

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LIGHT_GRAY);
    doc.setLineWidth(1);
    doc.line(margin, pageH - 36, pageW - margin, pageH - 36);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text('© 2026 JurisCheck · Tecnologia de apoio à conferência jurídica', margin, pageH - 22);
    doc.text('Não substitui a análise profissional do advogado.', margin, pageH - 12);
    doc.text(`${i} / ${pageCount}`, pageW - margin, pageH - 12, { align: 'right' });
  }

  const safeName = review.name.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 60);
  doc.save(`JurisCheck_Relatorio_${safeName}.pdf`);
}
