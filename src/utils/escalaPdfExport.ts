import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Escala, EscalaEntrada, Funcionario, Cargo } from '../types';

interface ExportData {
    escala: Escala;
    entries: EscalaEntrada[];
    funcionarios: (Funcionario & { cargo_rel?: Cargo | null })[];
    days: Date[];
    filialNome: string;
    grupoNome: string;
}

const getWeekday = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', '');
};

const getEntry = (entries: EscalaEntrada[], funcionarioId: string, dia: number) => {
    return entries.find(e => e.funcionario_id === funcionarioId && e.dia === dia)?.turno || '';
};

const getEntryStyle = (code: string) => {
    const val = code.toUpperCase();
    switch (val) {
        case 'F': return { fill: [239, 68, 68], textColor: [255, 255, 255] }; // Red
        case 'FD': return { fill: [16, 185, 129], textColor: [255, 255, 255] }; // Emerald
        case 'FR': return { fill: [6, 182, 212], textColor: [255, 255, 255] }; // Cyan
        case 'FE': return { fill: [245, 158, 11], textColor: [255, 255, 255] }; // Amber
        case 'CF': return { fill: [168, 85, 247], textColor: [255, 255, 255] }; // Purple
        case 'AT': return { fill: [234, 179, 8], textColor: [255, 255, 255] }; // Yellow
        case 'CH': return { fill: [249, 115, 22], textColor: [255, 255, 255] }; // Orange
        case 'T1':
        case 'T2': return { fill: [243, 244, 246], textColor: [31, 41, 55] }; // Gray 100
        default: return { fill: [255, 255, 255], textColor: [31, 41, 55] }; // White
    }
};

export const exportEscalaToPdf = ({
    escala,
    entries,
    funcionarios,
    days,
    filialNome,
    grupoNome
}: ExportData) => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    // --- Header ---
    // Background removed to save ink

    // Bottom border line for header
    doc.setDrawColor(34, 211, 238);
    doc.setLineWidth(0.5);
    doc.line(15, 35, 282, 35);

    doc.setTextColor(14, 116, 144); // Darker Cyan (Cyan 700) for white background
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('RH Inteligente', 15, 20);

    doc.setTextColor(71, 85, 105); // Slate 600
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Gestão & Performance', 15, 26);

    doc.setTextColor(30, 41, 59); // Slate 800
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Escala: ${escala.nome}`, 282, 15, { align: 'right' });

    doc.setTextColor(71, 85, 105); // Slate 600
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`${grupoNome} - ${filialNome}`, 282, 22, { align: 'right' });
    doc.text(`Mês/Ano: ${escala.mes}/${escala.ano}`, 282, 28, { align: 'right' });

    // --- Table ---
    const tableHeaders = [
        'Funcionário / Função',
        ...days.map(d => `${d.getDate()}\n${getWeekday(d)}`)
    ];

    const tableRows = funcionarios.map(f => [
        `${f.nome}\n(${f.cargo_rel?.nome || 'Aux. Logística'})`,
        ...days.map(d => getEntry(entries, f.id, d.getDate()))
    ]);

    autoTable(doc, {
        startY: 45,
        head: [tableHeaders],
        body: tableRows,
        theme: 'grid',
        styles: {
            fontSize: 7,
            cellPadding: 1,
            halign: 'center',
            valign: 'middle',
            lineWidth: 0.1,
            lineColor: [200, 200, 200]
        },
        headStyles: {
            fillColor: [241, 245, 249], // Very light gray (Slate 100)
            textColor: [15, 23, 42], // Dark text
            fontStyle: 'bold',
            fontSize: 8,
            lineWidth: 0.1,
            lineColor: [200, 200, 200]
        },
        columnStyles: {
            0: { halign: 'left', fontStyle: 'bold', minCellWidth: 40, fontSize: 8 }
        },
        didParseCell: (data: any) => {
            // Color columns for Sundays
            if (data.section === 'head' && data.column.index > 0) {
                const dayIndex = data.column.index - 1;
                if (days[dayIndex].getDay() === 0) {
                    data.cell.styles.fillColor = [37, 99, 235]; // Blue 600
                    data.cell.styles.textColor = [255, 255, 255];
                }
            }

            if (data.section === 'body' && data.column.index > 0) {
                const cellValue = data.cell.raw;
                if (cellValue) {
                    const style = getEntryStyle(cellValue);
                    data.cell.styles.fillColor = style.fill;
                    data.cell.styles.textColor = style.textColor;
                    data.cell.styles.fontStyle = 'bold';
                }

                // Highlight Sunday column in body too
                const dayIndex = data.column.index - 1;
                if (days[dayIndex].getDay() === 0 && !cellValue) {
                    data.cell.styles.fillColor = [240, 249, 255]; // Light blue background for empty Sundays
                }
            }
        }
    });

    // --- Legend ---
    const finalY = ((doc as any).lastAutoTable?.finalY || 160) + 10;

    if (finalY < 190) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text('Legenda:', 15, finalY);

        const legends = [
            { code: 'F', label: 'Folga Semanal' },
            { code: 'FD', label: 'Folga Domingo' },
            { code: 'FR', label: 'Férias' },
            { code: 'FE', label: 'Feriado' },
            { code: 'CF', label: 'Compensação' },
            { code: 'AT', label: 'Atestado' },
            { code: 'CH', label: 'CH (a1)' },
            { code: 'T1', label: 'Turno 1' }
        ];

        let currentX = 15;
        let currentY = finalY + 5;

        legends.forEach((leg, index) => {
            const style = getEntryStyle(leg.code);
            doc.setFillColor(style.fill[0], style.fill[1], style.fill[2]);
            doc.rect(currentX, currentY, 5, 5, 'F');

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(`${leg.code}: ${leg.label}`, currentX + 7, currentY + 4);

            currentX += 35;
            if ((index + 1) % 4 === 0) {
                currentX = 15;
                currentY += 8;
            }
        });
    }

    // --- Footer ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Gerado em ${new Date().toLocaleString('pt-BR')} - Página ${i} de ${pageCount}`,
            15,
            200
        );
    }

    doc.save(`Escala_${escala.nome}_${escala.mes}_${escala.ano}.pdf`);
};
