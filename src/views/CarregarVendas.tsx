import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';

export const CarregarVendas = ({ permissions: _permissions }: { permissions: any }) => {
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    imported: number;
    errors: string[];
  } | null>(null);

  const processFile = async (file: File) => {
    setLoading(true);
    setResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const vendedoresRes = await supabase
        .from('vendedores')
        .select('id, nome');

      if (vendedoresRes.error) throw vendedoresRes.error;

      const vendedoresMap = new Map(
        (vendedoresRes.data || []).map(v => [v.nome.toLowerCase(), v.id])
      );

      const vendasToInsert: any[] = [];
      const errors: string[] = [];
      const today = new Date().toISOString().split('T')[0];

      jsonData.forEach((row: any, index) => {
        const vendedorNome = row['Vendedor'] || row['vendedor'] || row['VENDEDOR'] || row['Nome'] || row['nome'];
        const valorStr = row['Valor'] || row['valor'] || row['VALOR'] || row['Total'] || row['total'];
        const dataVenda = row['Data'] || row['data'] || row['DATA'] || today;

        if (!vendedorNome) {
          errors.push(`Linha ${index + 2}: Nome do vendedor não encontrado`);
          return;
        }

        if (!valorStr) {
          errors.push(`Linha ${index + 2}: Valor não encontrado`);
          return;
        }

        const vendedorId = vendedoresMap.get(vendedorNome.toString().toLowerCase().trim());
        if (!vendedorId) {
          errors.push(`Linha ${index + 2}: Vendedor "${vendedorNome}" não cadastrado no sistema`);
          return;
        }

        const valor = typeof valorStr === 'number' ? valorStr : parseFloat(String(valorStr).replace(/[^\d.,]/g, '').replace(',', '.'));
        if (isNaN(valor)) {
          errors.push(`Linha ${index + 2}: Valor inválido "${valorStr}"`);
          return;
        }

        vendasToInsert.push({
          vendedor_id: vendedorId,
          valor,
          data_venda: dataVenda,
        });
      });

      if (vendasToInsert.length > 0) {
        const { error } = await supabase
          .from('vendas')
          .insert(vendasToInsert);

        if (error) throw error;
      }

      setResult({
        success: true,
        message: `Importação concluída com sucesso!`,
        imported: vendasToInsert.length,
        errors,
      });
    } catch (error) {
      console.error('Error processing file:', error);
      setResult({
        success: false,
        message: 'Erro ao processar arquivo. Verifique o formato e tente novamente.',
        imported: 0,
        errors: [String(error)],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xls') || file.name.endsWith('.xlsx'))) {
      processFile(file);
    } else {
      setResult({
        success: false,
        message: 'Por favor, selecione um arquivo Excel (.xls ou .xlsx)',
        imported: 0,
        errors: [],
      });
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-cyan-400">Carregar Vendas</h1>
      </div>

      <Card className="p-8">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${dragging
            ? 'border-cyan-400 bg-cyan-500/10'
            : 'border-gray-700 hover:border-cyan-500/50 hover:bg-cyan-500/5'
            }`}
        >
          <div className="flex flex-col items-center gap-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${dragging
              ? 'bg-gradient-to-br from-cyan-400 to-cyan-600 scale-110'
              : 'bg-gradient-to-br from-cyan-500/20 to-cyan-600/20'
              }`}>
              {loading ? (
                <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
              ) : (
                <Upload className="w-10 h-10 text-cyan-400" />
              )}
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-200 mb-2">
                {loading ? 'Processando arquivo...' : 'Arraste um arquivo Excel aqui'}
              </h3>
              <p className="text-gray-400">ou</p>
            </div>

            <label className="cursor-pointer">
              <input
                type="file"
                accept=".xls,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
                disabled={loading}
              />
              <span className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 transition-all duration-200">
                <FileSpreadsheet className="w-5 h-5" />
                Selecionar Arquivo
              </span>
            </label>

            <p className="text-sm text-gray-500 mt-4">
              Formatos aceitos: .xls, .xlsx
            </p>
          </div>
        </div>
      </Card>

      {result && (
        <Card className={`p-6 border-2 ${result.success ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${result.success ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {result.success ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <XCircle className="w-6 h-6 text-red-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className={`text-lg font-bold mb-2 ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.message}
              </h3>
              {result.success && (
                <p className="text-gray-300">
                  {result.imported} venda(s) importada(s) com sucesso
                </p>
              )}
              {result.errors.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-semibold text-gray-300">Avisos:</p>
                  <ul className="space-y-1">
                    {result.errors.slice(0, 10).map((error, index) => (
                      <li key={index} className="text-sm text-gray-400">
                        • {error}
                      </li>
                    ))}
                    {result.errors.length > 10 && (
                      <li className="text-sm text-gray-400">
                        ... e mais {result.errors.length - 10} avisos
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-bold text-cyan-400 mb-4">Formato do Arquivo</h3>
        <div className="space-y-3 text-sm text-gray-300">
          <p>O arquivo Excel deve conter as seguintes colunas:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>
              <span className="font-semibold text-cyan-400">Vendedor</span> - Nome completo do vendedor (deve estar cadastrado no sistema)
            </li>
            <li>
              <span className="font-semibold text-cyan-400">Valor</span> - Valor da venda (número ou texto com formatação monetária)
            </li>
            <li>
              <span className="font-semibold text-cyan-400">Data</span> (opcional) - Data da venda (formato: YYYY-MM-DD). Se não informada, será usada a data atual
            </li>
          </ul>
          <div className="mt-4 p-4 bg-[#151B2D] rounded-lg border border-cyan-500/20">
            <p className="text-xs text-gray-400 mb-2">Exemplo de formato:</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-2 text-cyan-400">Vendedor</th>
                  <th className="text-left p-2 text-cyan-400">Valor</th>
                  <th className="text-left p-2 text-cyan-400">Data</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-700/50">
                  <td className="p-2">João Silva</td>
                  <td className="p-2">1500.00</td>
                  <td className="p-2">2025-10-22</td>
                </tr>
                <tr>
                  <td className="p-2">Maria Santos</td>
                  <td className="p-2">2300.50</td>
                  <td className="p-2">2025-10-22</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
};
