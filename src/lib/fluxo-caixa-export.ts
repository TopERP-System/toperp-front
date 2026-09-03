import type { FluxoCaixaResponse } from '@/services/financeiro.service';
import * as XLSX from 'xlsx';

const FMT_MOEDA_BR = '"R$" #.##0,00';
const FMT_NUMERO_BR = '#.##0,00';

type GridCell = string | number;

function downloadArrayBuffer(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function setCellNumber(
  ws: XLSX.WorkSheet,
  row: number,
  col: number,
  value: number,
  numFmt: string,
): void {
  const ref = XLSX.utils.encode_cell({ r: row, c: col });
  ws[ref] = { t: 'n', v: value, z: numFmt };
}

function setCellString(ws: XLSX.WorkSheet, row: number, col: number, value: string): void {
  const ref = XLSX.utils.encode_cell({ r: row, c: col });
  ws[ref] = { t: 's', v: value };
}

/**
 * Exporta fluxo de caixa em .xlsx com colunas, larguras e números formatados.
 */
export function exportarFluxoCaixaExcel(
  data: FluxoCaixaResponse,
  options?: { rocaNome?: string },
): void {
  const { periodo, cards, colunas, linhas: rows } = data;
  const totalCols = 1 + colunas.length;

  const grid: GridCell[][] = [];
  let titleRow = 0;
  let rocaRow: number | null = null;
  let headerRow = 0;

  grid.push([`Fluxo de Caixa — ${periodo.inicio} a ${periodo.fim}`]);
  titleRow = grid.length - 1;

  if (options?.rocaNome) {
    grid.push([`Roça: ${options.rocaNome}`]);
    rocaRow = grid.length - 1;
  }

  grid.push([]);

  const resumoStart = grid.length;
  grid.push(['Saldo inicial', cards.saldo_inicial]);
  grid.push(['Total a receber', cards.total_a_receber]);
  grid.push(['Previsão de entrada', cards.previsao_entrada]);
  grid.push(['Total a pagar', cards.total_a_pagar]);
  grid.push(['Saldo projetado', cards.saldo_projetado]);

  grid.push([]);

  headerRow = grid.length;
  grid.push([
    'Centro de custo / Categoria',
    ...colunas.map((c) => `${c.label} (${c.weekday})`),
  ]);

  const dataStartRow = grid.length;
  const sectionRows: number[] = [];

  for (const row of rows) {
    if (row.tipo === 'secao') {
      grid.push([row.label]);
      sectionRows.push(grid.length - 1);
      continue;
    }

    const label = row.indent ? `  ${row.label}` : row.label;
    grid.push([
      label,
      ...row.valores.map((v) => (v == null ? '' : v)),
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(grid);

  // Larguras: coluna A larga, demais colunas de data uniformes
  ws['!cols'] = [
    { wch: 30 },
    ...colunas.map(() => ({ wch: 12 })),
  ];

  // Mesclar título e linhas de seção na largura total
  const merges: XLSX.Range[] = [
    { s: { r: titleRow, c: 0 }, e: { r: titleRow, c: totalCols - 1 } },
  ];
  if (rocaRow != null) {
    merges.push({ s: { r: rocaRow, c: 0 }, e: { r: rocaRow, c: totalCols - 1 } });
  }
  for (const r of sectionRows) {
    merges.push({ s: { r, c: 0 }, e: { r, c: totalCols - 1 } });
  }
  ws['!merges'] = merges;

  // Congelar painéis: coluna A + linha do cabeçalho da grade
  ws['!views'] = [
    {
      state: 'frozen',
      xSplit: 1,
      ySplit: headerRow + 1,
      topLeftCell: XLSX.utils.encode_cell({ r: headerRow + 1, c: 1 }),
      activePane: 'bottomRight',
    },
  ];

  // Formato moeda no resumo (coluna B)
  for (let r = resumoStart; r < resumoStart + 5; r++) {
    const valores = [
      cards.saldo_inicial,
      cards.total_a_receber,
      cards.previsao_entrada,
      cards.total_a_pagar,
      cards.saldo_projetado,
    ];
    setCellNumber(ws, r, 1, valores[r - resumoStart], FMT_MOEDA_BR);
  }

  // Formato numérico nas células de valores da grade
  for (let r = dataStartRow; r < grid.length; r++) {
    if (sectionRows.includes(r)) continue;
    for (let c = 1; c < totalCols; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      const cell = ws[ref];
      if (cell && cell.t === 'n') {
        cell.z = FMT_NUMERO_BR;
      }
    }
  }

  // Reforçar cabeçalho da grade como texto
  setCellString(ws, headerRow, 0, 'Centro de custo / Categoria');
  colunas.forEach((c, i) => {
    setCellString(ws, headerRow, i + 1, `${c.label} (${c.weekday})`);
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Fluxo de Caixa');

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const nomeArquivo = `fluxo-caixa_${periodo.inicio}_${periodo.fim}.xlsx`;
  downloadArrayBuffer(buffer, nomeArquivo);
}
