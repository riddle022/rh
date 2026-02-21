import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ValeMercadoriaData } from '../types';

interface ExportData {
    vales: ValeMercadoriaData[];
    periodo: {
        mes: number | 'all';
        ano: number | 'all';
    };
    filtros: {
        funcionario?: string;
        filial?: string;
        status?: string;
        data?: string;
        total?: string;
    };
    totalGeral: number;
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

export const exportValeMercadoriaToPdf = ({
    vales,
    periodo,
    filtros,
    totalGeral
}: ExportData) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // --- Header ---
    doc.setDrawColor(34, 211, 238); // Cyan 400
    doc.setLineWidth(0.5);
    doc.line(15, 30, 195, 30);

    doc.setTextColor(14, 116, 144); // Cyan 700
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('RH Inteligente', 15, 18);

    doc.setTextColor(71, 85, 105); // Slate 600
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Gestão de Vales Mercadoria', 15, 24);

    doc.setTextColor(30, 41, 59); // Slate 800
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Vales Mercadoria', 195, 18, { align: 'right' });

    const mesTxt = periodo.mes === 'all' ? 'Todos' : getMesNome(periodo.mes);
    const anoTxt = periodo.ano === 'all' ? 'Todos' : periodo.ano;
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${mesTxt} / ${anoTxt}`, 195, 24, { align: 'right' });

    let filterLine = 28;
    const hasFilialFilter = filtros.filial && filtros.filial !== 'all';
    const hasStatusFilter = filtros.status && filtros.status !== 'all';

    if (filtros.funcionario || hasFilialFilter || hasStatusFilter || filtros.data || filtros.total) {
        doc.setFontSize(8);
        let filterTxt = 'Filtros: ';
        if (filtros.funcionario) filterTxt += `Func.: ${filtros.funcionario} | `;
        if (hasFilialFilter) filterTxt += `Filial: ${filtros.filial} | `;
        if (hasStatusFilter) filterTxt += `Status: ${filtros.status} | `;
        if (filtros.data) filterTxt += `Data: ${filtros.data} | `;
        if (filtros.total) filterTxt += `Valor: ${filtros.total} | `;
        doc.text(filterTxt.replace(/ \| $/, ''), 195, filterLine, { align: 'right' });
    }

    // --- Summary ---
    let currentY = 40;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, currentY, 180, 15, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.1);
    doc.roundedRect(15, currentY, 180, 15, 2, 2, 'D');

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL EM VALES FILTRADOS', 20, currentY + 6);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(formatCurrency(totalGeral), 20, currentY + 11);

    currentY += 25;

    // --- Table ---
    const showFunc = !filtros.funcionario;
    const showFilial = !hasFilialFilter;
    const showStatus = !hasStatusFilter;

    const tableHeaders = [];
    const headerRow = [];
    if (showFunc) headerRow.push('Funcionário');
    if (showFilial) headerRow.push('Filial');
    headerRow.push('Data', 'Total');
    headerRow.push('Parcelas');
    if (showStatus) headerRow.push('Status');
    tableHeaders.push(headerRow);

    const tableRows = vales.map(v => {
        const row = [];
        if (showFunc) row.push(v.funcionario?.nome || 'N/A');
        if (showFilial) row.push(v.funcionario?.filial?.nome || 'N/A');
        row.push(new Date(v.created_at).toLocaleDateString('pt-BR'));
        row.push(v.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
        row.push(`${v.parcelas_total}x`);
        if (showStatus) row.push(v.status);
        return row;
    });

    const valorColIndex = headerRow.indexOf('Total');
    const tableFoot = [headerRow.map((_, index) => {
        if (index === valorColIndex) return formatCurrency(totalGeral);
        if (index === valorColIndex - 1) return 'TOTAL:';
        return '';
    })];

    const columnStyles: any = {};
    if (showFunc) columnStyles[0] = { fontStyle: 'bold', minCellWidth: 40 };
    if (valorColIndex !== -1) columnStyles[valorColIndex] = { halign: 'right', fontStyle: 'bold' };

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
            lineColor: [226, 232, 240]
        },
        headStyles: {
            fillColor: [241, 245, 249],
            textColor: [51, 65, 85],
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left'
        },
        footStyles: {
            fillColor: [248, 250, 252],
            textColor: [14, 116, 144],
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left'
        },
        columnStyles: columnStyles,
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        }
    });

    // --- Footer ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.1);
        doc.line(15, 280, 195, 280);
        doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} - RH Inteligente`, 15, 285);
        doc.text(`Página ${i} de ${pageCount}`, 195, 285, { align: 'right' });
    }

    doc.save(`Relatorio_Vales_Mercadoria_${mesTxt}_${anoTxt}.pdf`);
};
