import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Funcionario } from '../types';

interface ExportData {
    funcionarios: Funcionario[];
    filtros: {
        nome?: string;
        filial?: string;
        departamento?: string;
        cargo?: string;
    };
}

export const exportFuncionariosToPdf = ({
    funcionarios,
    filtros
}: ExportData) => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    // --- Header ---
    doc.setDrawColor(34, 211, 238); // Cyan 400
    doc.setLineWidth(0.5);
    doc.line(15, 30, 282, 30);

    doc.setTextColor(14, 116, 144); // Cyan 700
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('RH Inteligente', 15, 18);

    doc.setTextColor(71, 85, 105); // Slate 600
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Gestão de Capital Humano', 15, 24);

    doc.setTextColor(30, 41, 59); // Slate 800
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Funcionários', 282, 18, { align: 'right' });

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 282, 24, { align: 'right' });

    let filterLine = 28;
    const hasFilialFilter = filtros.filial && filtros.filial !== '';
    const hasDeptoFilter = filtros.departamento && filtros.departamento !== '';
    const hasCargoFilter = filtros.cargo && filtros.cargo !== '';

    if (filtros.nome || hasFilialFilter || hasDeptoFilter || hasCargoFilter) {
        doc.setFontSize(8);
        let filterTxt = 'Filtros: ';
        if (filtros.nome) filterTxt += `Busca: ${filtros.nome} | `;
        if (hasFilialFilter) filterTxt += `Filial: ${filtros.filial} | `;
        if (hasDeptoFilter) filterTxt += `Depto: ${filtros.departamento} | `;
        if (hasCargoFilter) filterTxt += `Cargo: ${filtros.cargo} | `;
        doc.text(filterTxt.replace(/ \| $/, ''), 282, filterLine, { align: 'right' });
    }

    // --- Table ---
    const showFilial = !hasFilialFilter;
    const showDepto = !hasDeptoFilter;
    const showCargo = !hasCargoFilter;

    const tableHeaders = [];
    const headerRow = [];
    headerRow.push('Status', 'Nome Completo');
    if (showFilial) headerRow.push('Filial');
    if (showDepto) headerRow.push('Departamento');
    if (showCargo) headerRow.push('Cargo');
    headerRow.push('CPF', 'Celular', 'Email', 'Admissão');
    tableHeaders.push(headerRow);

    const tableRows = funcionarios.map(f => {
        const row = [];
        row.push(f.ativo ? 'ATIVO' : 'INATIVO');
        row.push(f.nome);
        if (showFilial) row.push(f.filial?.nome || '-');
        if (showDepto) row.push(f.departamento?.nome || '-');
        if (showCargo) row.push(f.cargo_rel?.nome || '-');
        row.push(f.cpf || '-');
        row.push(f.celular || '-');
        row.push(f.email || '-');
        row.push(f.data_admissao.split('-').reverse().join('/'));
        return row;
    });

    autoTable(doc, {
        startY: 35,
        head: tableHeaders,
        body: tableRows,
        theme: 'striped',
        styles: {
            fontSize: 7,
            cellPadding: 2,
            valign: 'middle',
            font: 'helvetica',
            lineWidth: 0.1,
            lineColor: [226, 232, 240]
        },
        headStyles: {
            fillColor: [241, 245, 249],
            textColor: [51, 65, 85],
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'left'
        },
        columnStyles: {
            0: { fontStyle: 'bold', halign: 'center' },
            1: { fontStyle: 'bold' }
        },
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
        doc.line(15, 195, 282, 195);
        doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} - RH Inteligente`, 15, 200);
        doc.text(`Página ${i} de ${pageCount}`, 282, 200, { align: 'right' });
    }

    doc.save(`Relatorio_Funcionarios_${new Date().toISOString().slice(0, 10)}.pdf`);
};
