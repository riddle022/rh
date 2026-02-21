import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { LancamentoFinanceiro } from '../types';

interface ExportData {
    lancamentos: LancamentoFinanceiro[];
    periodo: {
        mes: number | 'all';
        ano: number | 'all';
    };
    filtros: {
        tipo: string;
        funcionario?: string;
        filial?: string;
    };
    totals: {
        Comissao: number;
        Bonificacao: number;
        HorasExtras: number;
        Geral: number;
    };
}

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
};

const getMesNome = (mes: number) => {
    const date = new Date(2000, mes - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long' });
};

export const exportLancamentosToPdf = ({
    lancamentos,
    periodo,
    filtros,
    totals
}: ExportData) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // --- Header ---
    // Cyan Divider Line
    doc.setDrawColor(34, 211, 238); // Cyan 400
    doc.setLineWidth(0.5);
    doc.line(15, 30, 195, 30);

    // RH Inteligente Brand
    doc.setTextColor(14, 116, 144); // Cyan 700
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('RH Inteligente', 15, 18);

    doc.setTextColor(71, 85, 105); // Slate 600
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Gestão Financeira & Performance', 15, 24);

    // Report Title
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Lançamentos Financeiros', 195, 18, { align: 'right' });

    // Period Info & Filters
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const mesTxt = periodo.mes === 'all' ? 'Todos' : getMesNome(periodo.mes);
    const anoTxt = periodo.ano === 'all' ? 'Todos' : periodo.ano;
    doc.text(`Período: ${mesTxt} / ${anoTxt}`, 195, 24, { align: 'right' });

    let filterLine = 28;
    const hasFilialFilter = filtros.filial && filtros.filial !== 'all';
    if (filtros.tipo !== 'all' || filtros.funcionario || hasFilialFilter) {
        doc.setFontSize(8);
        let filterTxt = 'Filtros: ';
        if (filtros.tipo !== 'all') filterTxt += `Tipo: ${filtros.tipo} | `;
        if (filtros.funcionario) filterTxt += `Func.: ${filtros.funcionario} | `;
        if (hasFilialFilter) filterTxt += `Filial: ${filtros.filial}`;
        doc.text(filterTxt.replace(/ \| $/, ''), 195, filterLine, { align: 'right' });
    }

    // --- Resumo de Totais ---
    let currentY = 40;

    doc.setFillColor(248, 250, 252); // Slate 50
    doc.roundedRect(15, currentY, 180, 20, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.1);
    doc.roundedRect(15, currentY, 180, 20, 2, 2, 'D');

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text('TOTAL COMISSÕES', 20, currentY + 7);
    doc.text('TOTAL BONIFICAÇÕES', 80, currentY + 7);
    doc.text('TOTAL H. EXTRAS', 140, currentY + 7);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text(formatCurrency(totals.Comissao), 20, currentY + 14);
    doc.text(formatCurrency(totals.Bonificacao), 80, currentY + 14);
    doc.text(formatCurrency(totals.HorasExtras), 140, currentY + 14);

    currentY += 30;

    // --- Table ---
    // Dynamic Columns Logic
    const showFunc = !filtros.funcionario;
    const showFilial = !hasFilialFilter;
    const showTipo = filtros.tipo === 'all';

    const tableHeaders = [];
    const headerRow = [];
    if (showFunc) headerRow.push('Funcionário');
    if (showFilial) headerRow.push('Filial');
    if (showTipo) headerRow.push('Tipo');
    headerRow.push('Referência', 'Valor', 'Data');
    tableHeaders.push(headerRow);

    const tableRows = lancamentos.map(l => {
        const row = [];
        if (showFunc) row.push(l.funcionario?.nome || 'N/A');
        if (showFilial) row.push(l.funcionario?.filial?.nome || 'N/A');
        if (showTipo) row.push(l.tipo === 'Comissao' ? 'Comissão' : l.tipo === 'Bonificacao' ? 'Bonificação' : 'H. Extras');
        row.push(
            `${String(l.mes).padStart(2, '0')}/${l.ano}`,
            l.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            l.data_lancamento.split('-').reverse().join('/')
        );
        return row;
    });

    // Calculate dynamic column styles
    const columnStyles: any = {};
    const valorColIndex = headerRow.indexOf('Valor');
    const dataColIndex = headerRow.indexOf('Data');

    const tableFoot = [headerRow.map((_, index) => {
        if (index === valorColIndex) return formatCurrency(totals.Geral);
        if (index === valorColIndex - 1) return 'TOTAL GERAL:';
        return '';
    })];

    if (showFunc) columnStyles[0] = { fontStyle: 'bold', minCellWidth: 40 };
    if (valorColIndex !== -1) columnStyles[valorColIndex] = { halign: 'right', fontStyle: 'bold' };
    if (dataColIndex !== -1) columnStyles[dataColIndex] = { halign: 'center' };

    autoTable(doc, {
        startY: currentY,
        head: tableHeaders,
        body: tableRows,
        foot: tableFoot,
        theme: 'striped',
        styles: {
            fontSize: 8,
            cellPadding: 3,
            valign: 'middle',
            font: 'helvetica',
            lineWidth: 0.1,
            lineColor: [226, 232, 240] // Slate 200
        },
        headStyles: {
            fillColor: [241, 245, 249], // Slate 100 (Eco-friendly)
            textColor: [51, 65, 85], // Slate 700
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left'
        },
        footStyles: {
            fillColor: [248, 250, 252], // Slate 50
            textColor: [14, 116, 144], // Cyan 700
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left'
        },
        columnStyles: columnStyles,
        alternateRowStyles: {
            fillColor: [248, 250, 252] // Slate 50
        }
    });

    // --- Footer ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184); // Slate 400

        // Horizontal line for footer
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.1);
        doc.line(15, 280, 195, 280);

        doc.text(
            `Gerado em ${new Date().toLocaleString('pt-BR')} - RH Inteligente Software`,
            15,
            285
        );
        doc.text(
            `Página ${i} de ${pageCount}`,
            195,
            285,
            { align: 'right' }
        );
    }

    doc.save(`Relatorio_Lancamentos_${mesTxt}_${anoTxt}.pdf`);
};
