import { formatCurrency } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type DrePdfLinha = {
  descricao: string;
  valor: number;
  percentual: number | null;
  indent?: boolean;
};

export type DrePdfTotais = {
  totalVendasEfetivas: number;
  totalDespesasEfetivas: number;
  resultadoEfetivoMes: number;
  margemResultado: number;
};

export type DrePdfOptions = {
  periodoRotulo: string;
  rocaNome?: string;
  linhas: DrePdfLinha[];
  totais: DrePdfTotais;
};

const COR_PRIMARIA: [number, number, number] = [0, 51, 102];
const COR_CINZA: [number, number, number] = [100, 116, 139];

function slugArquivo(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function nomeArquivo(periodoRotulo: string): string {
  const hoje = new Date().toISOString().slice(0, 10);
  const slug = slugArquivo(periodoRotulo) || 'periodo';
  return `dre_${slug}_${hoje}.pdf`;
}

function montarDocumento(opcoes: DrePdfOptions): jsPDF {
  const { periodoRotulo, rocaNome, linhas, totais } = opcoes;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margem = 14;
  let y = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...COR_PRIMARIA);
  doc.text('DRE — Demonstrativo de Resultados no Exercício', margem, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COR_CINZA);
  doc.text(`Período: ${periodoRotulo}`, margem, y);

  if (rocaNome) {
    y += 5;
    doc.text(`Roça: ${rocaNome}`, margem, y);
  }

  y += 4;
  doc.setFontSize(8);
  doc.text(
    'Valores por tipo espelham o Centro de Despesa. Percentual sobre vendas efetivas.',
    margem,
    y,
  );

  const corpo = linhas.map((l) => [
    l.indent ? `  ${l.descricao}` : l.descricao,
    formatCurrency(l.valor),
    l.percentual === null ? '—' : `${l.percentual}%`,
  ]);

  autoTable(doc, {
    startY: y + 4,
    head: [['Conta', 'Valor', '%']],
    body: corpo,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2.5,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COR_PRIMARIA,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { halign: 'right', cellWidth: 45 },
      2: { halign: 'right', cellWidth: 25 },
    },
    margin: { left: margem, right: margem },
  });

  const posResumo =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
    y + 40;

  autoTable(doc, {
    startY: posResumo + 8,
    body: [
      ['Total de Vendas Efetivas', formatCurrency(totais.totalVendasEfetivas)],
      ['Total de Despesas Efetivas', formatCurrency(totais.totalDespesasEfetivas)],
      ['Resultado Efetivo', formatCurrency(totais.resultadoEfetivoMes)],
      ['Margem sobre vendas', `${totais.margemResultado}%`],
    ],
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 3,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 95 },
      1: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margem, right: margem },
    didParseCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 1) return;
      if (data.row.index === 0) {
        data.cell.styles.textColor = [4, 120, 87];
      }
      if (data.row.index === 1) {
        data.cell.styles.textColor = [190, 18, 60];
      }
      if (data.row.index === 2) {
        data.cell.styles.textColor =
          totais.resultadoEfetivoMes < 0 ? [190, 18, 60] : [4, 120, 87];
      }
    },
  });

  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COR_CINZA);
    doc.text(
      `Gerado em ${new Date().toLocaleString('pt-BR')} — TopERP`,
      margem,
      doc.internal.pageSize.getHeight() - 8,
    );
    doc.text(
      `Página ${i} de ${paginas}`,
      doc.internal.pageSize.getWidth() - margem,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'right' },
    );
  }

  return doc;
}

export function downloadDrePdf(opcoes: DrePdfOptions): void {
  const doc = montarDocumento(opcoes);
  doc.save(nomeArquivo(opcoes.periodoRotulo));
}

export function imprimirDrePdf(opcoes: DrePdfOptions): void {
  const doc = montarDocumento(opcoes);
  doc.autoPrint();
  const blob = doc.output('bloburl');
  const janela = window.open(blob, '_blank');
  if (!janela) {
    doc.save(nomeArquivo(opcoes.periodoRotulo));
    return;
  }
  janela.onload = () => {
    janela.focus();
    janela.print();
  };
}
