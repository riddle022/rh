import { useState, useEffect } from 'react';
import { FileText, Calendar, Filter, TrendingUp, Users, Building2, Network, Award, Loader2, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import { Card } from '../components/ui/Card';
import type { Filial, Setor, Vendedor } from '../types';
import * as XLSX from 'xlsx';

type TipoRelatorio = 'vendedor' | 'filial' | 'setor' | 'ranking' | 'comparativo';

export const Relatorios = ({ permissions: _permissions }: { permissions: any }) => {
  const { showToast } = useNotification();
  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>('vendedor');
  const [loading, setLoading] = useState(false);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [dadosRelatorio, setDadosRelatorio] = useState<any[]>([]);
  const [mostrarPrevia, setMostrarPrevia] = useState(false);

  const currentDate = new Date();
  const [filtros, setFiltros] = useState({
    data_inicio: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0],
    data_fim: currentDate.toISOString().split('T')[0],
    filial_id: '',
    setor_id: '',
    vendedor_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [filiaisRes, setoresRes, vendedoresRes] = await Promise.all([
        supabase.from('filiais').select('*').order('nome'),
        supabase.from('setores').select('*').order('nome'),
        supabase.from('vendedores').select('*').order('nome'),
      ]);

      if (filiaisRes.data) setFiliais(filiaisRes.data);
      if (setoresRes.data) setSetores(setoresRes.data);
      if (vendedoresRes.data) setVendedores(vendedoresRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const gerarRelatorio = async () => {
    setLoading(true);
    try {
      let dados: any[] = [];

      switch (tipoRelatorio) {
        case 'vendedor':
          dados = await gerarRelatorioVendedor();
          break;
        case 'filial':
          dados = await gerarRelatorioFilial();
          break;
        case 'setor':
          dados = await gerarRelatorioSetor();
          break;
        case 'ranking':
          dados = await gerarRelatorioRanking();
          break;
        case 'comparativo':
          dados = await gerarRelatorioComparativo();
          break;
      }

      setDadosRelatorio(dados);
      setMostrarPrevia(true);
    } catch (error) {
      console.error('Error generating report:', error);
      showToast('Erro ao gerar relatório. Verifique os filtros e tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = () => {
    if (dadosRelatorio.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(dadosRelatorio);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');

    const nomeArquivo = `relatorio-${tipoRelatorio}-${new Date().getTime()}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
  };

  const gerarRelatorioVendedor = async () => {
    let query = supabase
      .from('vendas')
      .select('*, vendedor:vendedores(nome, filial:filiais(nome), setor:setores(nome))')
      .gte('data_venda', filtros.data_inicio)
      .lte('data_venda', filtros.data_fim);

    if (filtros.vendedor_id) {
      query = query.eq('vendedor_id', filtros.vendedor_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    const vendedoresMap = new Map();

    data?.forEach((venda: any) => {
      const vendedorId = venda.vendedor_id;
      if (!vendedoresMap.has(vendedorId)) {
        vendedoresMap.set(vendedorId, {
          Vendedor: venda.vendedor?.nome || 'Sem vendedor',
          Filial: venda.vendedor?.filial?.nome || 'Sem filial',
          Setor: venda.vendedor?.setor?.nome || 'Sem setor',
          'Total Vendas': 0,
          Quantidade: 0,
        });
      }

      const vendedorData = vendedoresMap.get(vendedorId);
      vendedorData['Total Vendas'] += Number(venda.valor);
      vendedorData.Quantidade += 1;
    });

    return Array.from(vendedoresMap.values()).map(v => ({
      ...v,
      'Total Vendas': formatCurrency(v['Total Vendas']),
      'Ticket Médio': formatCurrency(v['Total Vendas'] / v.Quantidade || 0),
    }));
  };

  const gerarRelatorioFilial = async () => {
    const { data, error } = await supabase
      .from('vendas')
      .select('*, vendedor:vendedores(filial:filiais(id, nome, meta_global))')
      .gte('data_venda', filtros.data_inicio)
      .lte('data_venda', filtros.data_fim);

    if (error) throw error;

    const filiaisMap = new Map();

    data?.forEach((venda: any) => {
      const filialId = venda.vendedor?.filial?.id;
      if (!filialId) return;

      if (!filiaisMap.has(filialId)) {
        filiaisMap.set(filialId, {
          Filial: venda.vendedor?.filial?.nome || 'Sem filial',
          'Total Vendas': 0,
          Quantidade: 0,
          Meta: Number(venda.vendedor?.filial?.meta_global || 0),
        });
      }

      const filialData = filiaisMap.get(filialId);
      filialData['Total Vendas'] += Number(venda.valor);
      filialData.Quantidade += 1;
    });

    return Array.from(filiaisMap.values()).map(f => ({
      ...f,
      'Total Vendas': formatCurrency(f['Total Vendas']),
      Meta: formatCurrency(f.Meta),
      Atingimento: formatPercent((f['Total Vendas'] / f.Meta) * 100 || 0),
    }));
  };

  const gerarRelatorioSetor = async () => {
    const { data, error } = await supabase
      .from('vendas')
      .select('*, vendedor:vendedores(filial:filiais(nome), setor:setores(id, nome, meta_mensal))')
      .gte('data_venda', filtros.data_inicio)
      .lte('data_venda', filtros.data_fim);

    if (error) throw error;

    const setoresMap = new Map();

    data?.forEach((venda: any) => {
      const setorId = venda.vendedor?.setor?.id;
      if (!setorId) return;

      if (!setoresMap.has(setorId)) {
        setoresMap.set(setorId, {
          Setor: venda.vendedor?.setor?.nome || 'Sem setor',
          Filial: venda.vendedor?.filial?.nome || 'Sem filial',
          'Total Vendas': 0,
          Quantidade: 0,
          Meta: Number(venda.vendedor?.setor?.meta_mensal || 0),
        });
      }

      const setorData = setoresMap.get(setorId);
      setorData['Total Vendas'] += Number(venda.valor);
      setorData.Quantidade += 1;
    });

    return Array.from(setoresMap.values()).map(s => ({
      ...s,
      'Total Vendas': formatCurrency(s['Total Vendas']),
      Meta: formatCurrency(s.Meta),
      Atingimento: formatPercent((s['Total Vendas'] / s.Meta) * 100 || 0),
    }));
  };

  const gerarRelatorioRanking = async () => {
    const { data, error } = await supabase
      .from('vendas')
      .select('*, vendedor:vendedores(nome, filial:filiais(nome), setor:setores(meta_mensal))')
      .gte('data_venda', filtros.data_inicio)
      .lte('data_venda', filtros.data_fim);

    if (error) throw error;

    const vendedoresMap = new Map();

    data?.forEach((venda: any) => {
      const vendedorId = venda.vendedor_id;
      if (!vendedoresMap.has(vendedorId)) {
        vendedoresMap.set(vendedorId, {
          vendedor: venda.vendedor?.nome || 'Sem vendedor',
          filial: venda.vendedor?.filial?.nome || 'Sem filial',
          total_vendas: 0,
          meta: Number(venda.vendedor?.setor?.meta_mensal || 0),
        });
      }

      const vendedorData = vendedoresMap.get(vendedorId);
      vendedorData.total_vendas += Number(venda.valor);
    });

    const ranking = Array.from(vendedoresMap.values())
      .sort((a, b) => b.total_vendas - a.total_vendas)
      .slice(0, 20)
      .map((v, index) => ({
        Posição: `${index + 1}º`,
        Vendedor: v.vendedor,
        Filial: v.filial,
        'Total Vendas': formatCurrency(v.total_vendas),
        Atingimento: formatPercent((v.total_vendas / v.meta) * 100 || 0),
      }));

    return ranking;
  };

  const gerarRelatorioComparativo = async () => {
    const dataInicio = new Date(filtros.data_inicio);
    const dataFim = new Date(filtros.data_fim);
    const diffDias = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));

    const periodoAnteriorFim = new Date(dataInicio);
    periodoAnteriorFim.setDate(periodoAnteriorFim.getDate() - 1);
    const periodoAnteriorInicio = new Date(periodoAnteriorFim);
    periodoAnteriorInicio.setDate(periodoAnteriorInicio.getDate() - diffDias);

    const [atualRes, anteriorRes] = await Promise.all([
      supabase
        .from('vendas')
        .select('*, vendedor:vendedores(filial:filiais(id, nome, meta_global))')
        .gte('data_venda', filtros.data_inicio)
        .lte('data_venda', filtros.data_fim),
      supabase
        .from('vendas')
        .select('valor')
        .gte('data_venda', periodoAnteriorInicio.toISOString().split('T')[0])
        .lte('data_venda', periodoAnteriorFim.toISOString().split('T')[0]),
    ]);

    if (atualRes.error || anteriorRes.error) throw atualRes.error || anteriorRes.error;

    const filiaisAtualMap = new Map();
    let totalAtual = 0;

    atualRes.data?.forEach((venda: any) => {
      const filialId = venda.vendedor?.filial?.id;
      if (!filialId) return;

      if (!filiaisAtualMap.has(filialId)) {
        filiaisAtualMap.set(filialId, {
          Filial: venda.vendedor?.filial?.nome || 'Sem filial',
          'Período Atual': 0,
          Meta: Number(venda.vendedor?.filial?.meta_global || 0),
        });
      }

      const filialData = filiaisAtualMap.get(filialId);
      filialData['Período Atual'] += Number(venda.valor);
      totalAtual += Number(venda.valor);
    });

    let totalAnterior = 0;
    anteriorRes.data?.forEach((venda: any) => {
      totalAnterior += Number(venda.valor);
    });

    const crescimento = totalAnterior > 0 ? ((totalAtual - totalAnterior) / totalAnterior) * 100 : 0;

    return Array.from(filiaisAtualMap.values()).map(f => ({
      ...f,
      'Período Atual': formatCurrency(f['Período Atual']),
      Meta: formatCurrency(f.Meta),
      Atingimento: formatPercent((f['Período Atual'] / f.Meta) * 100 || 0),
      Crescimento: formatPercent(crescimento),
    }));
  };

  const tiposRelatorio = [
    { id: 'vendedor' as TipoRelatorio, nome: 'Vendas por Vendedor', icon: Users, descricao: 'Análise detalhada de performance individual' },
    { id: 'filial' as TipoRelatorio, nome: 'Vendas por Filial', icon: Building2, descricao: 'Performance por unidade com metas' },
    { id: 'setor' as TipoRelatorio, nome: 'Vendas por Setor', icon: Network, descricao: 'Resultados por departamento' },
    { id: 'ranking' as TipoRelatorio, nome: 'Ranking de Vendedores', icon: Award, descricao: 'Top 20 performers do período' },
    { id: 'comparativo' as TipoRelatorio, nome: 'Comparativo de Períodos', icon: TrendingUp, descricao: 'Análise de crescimento temporal' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-cyan-400">Relatórios</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiposRelatorio.map((tipo) => {
          const Icon = tipo.icon;
          return (
            <Card
              key={tipo.id}
              className={`p-6 cursor-pointer transition-all ${tipoRelatorio === tipo.id
                ? 'ring-2 ring-cyan-500 bg-cyan-500/5'
                : 'hover:bg-[#151B2D]'
                }`}
              onClick={() => setTipoRelatorio(tipo.id)}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${tipoRelatorio === tipo.id
                  ? 'bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/30'
                  : 'bg-gray-700'
                  }`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-200">{tipo.nome}</h3>
                  <p className="text-sm text-gray-400 mt-1">{tipo.descricao}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-5 h-5 text-cyan-400" />
          <h2 className="text-xl font-bold text-gray-200">Filtros</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Data Início
            </label>
            <input
              type="date"
              value={filtros.data_inicio}
              onChange={(e) => setFiltros({ ...filtros, data_inicio: e.target.value })}
              className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Data Fim
            </label>
            <input
              type="date"
              value={filtros.data_fim}
              onChange={(e) => setFiltros({ ...filtros, data_fim: e.target.value })}
              className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          {(tipoRelatorio === 'vendedor' || tipoRelatorio === 'filial') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Building2 className="w-4 h-4 inline mr-1" />
                Filial
              </label>
              <select
                value={filtros.filial_id}
                onChange={(e) => setFiltros({ ...filtros, filial_id: e.target.value })}
                className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">Todas</option>
                {filiais.map((filial) => (
                  <option key={filial.id} value={filial.id}>
                    {filial.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {tipoRelatorio === 'setor' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Network className="w-4 h-4 inline mr-1" />
                Setor
              </label>
              <select
                value={filtros.setor_id}
                onChange={(e) => setFiltros({ ...filtros, setor_id: e.target.value })}
                className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                {setores.map((setor) => (
                  <option key={setor.id} value={setor.id}>
                    {setor.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {tipoRelatorio === 'vendedor' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Vendedor
              </label>
              <select
                value={filtros.vendedor_id}
                onChange={(e) => setFiltros({ ...filtros, vendedor_id: e.target.value })}
                className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                {vendedores.map((vendedor) => (
                  <option key={vendedor.id} value={vendedor.id}>
                    {vendedor.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={gerarRelatorio}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 transition-all duration-200"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Gerar Relatório
              </>
            )}
          </button>

          {mostrarPrevia && dadosRelatorio.length > 0 && (
            <button
              onClick={exportarExcel}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-semibold rounded-lg shadow-lg shadow-green-500/30 transition-all duration-200"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Exportar Excel
            </button>
          )}
        </div>
      </Card>

      {mostrarPrevia && dadosRelatorio.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-200">Prévia do Relatório</h2>
            <span className="text-sm text-gray-400">{dadosRelatorio.length} registros</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  {dadosRelatorio.length > 0 && Object.keys(dadosRelatorio[0]).map((key) => (
                    <th key={key} className="px-4 py-3 text-left text-sm font-semibold text-cyan-400">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dadosRelatorio.slice(0, 10).map((row, index) => (
                  <tr key={index} className="border-b border-gray-800 hover:bg-[#151B2D]">
                    {Object.values(row).map((value: any, i) => (
                      <td key={i} className="px-4 py-3 text-sm text-gray-300">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {dadosRelatorio.length > 10 && (
            <p className="text-sm text-gray-400 mt-4 text-center">
              Mostrando 10 de {dadosRelatorio.length} registros. Exporte para ver todos.
            </p>
          )}
        </Card>
      )}

      <Card className="p-6 bg-gradient-to-br from-cyan-500/5 to-transparent border-cyan-500/20">
        <div className="flex items-start gap-4">
          <FileText className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-gray-200 mb-2">Sobre os Relatórios</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• <span className="text-cyan-400">Vendas por Vendedor:</span> Performance individual, ticket médio e quantidade de vendas</li>
              <li>• <span className="text-cyan-400">Vendas por Filial:</span> Análise por unidade com atingimento de metas</li>
              <li>• <span className="text-cyan-400">Vendas por Setor:</span> Performance departamental com metas mensais</li>
              <li>• <span className="text-cyan-400">Ranking:</span> Top 20 vendedores do período</li>
              <li>• <span className="text-cyan-400">Comparativo:</span> Análise de crescimento entre períodos equivalentes</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};
