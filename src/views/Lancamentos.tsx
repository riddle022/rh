import { useState, useEffect, useMemo } from 'react';
import {
    Loader2,
    Search,
    DollarSign,
    Plus,
    Save,
    Edit2,
    Trash2,
    Calendar as CalendarIcon,
    ChevronRight,
    TrendingUp,
    Gift,
    Clock,
    Filter,
    X,
    ChevronDown,
    FileText
} from 'lucide-react';
import { useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import type { Funcionario, LancamentoFinanceiro, Filial } from '../types';
import { exportLancamentosToPdf } from '../utils/lancamentosPdfExport';

export const Lancamentos = ({ permissions }: { permissions: any }) => {
    const { showToast, confirm: confirmAction } = useNotification();
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [listSearchTerm, setListSearchTerm] = useState('');
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [filiais, setFiliais] = useState<Filial[]>([]);
    const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);

    // Form State
    const [selectedFuncionarioId, setSelectedFuncionarioId] = useState('');
    const [tipo, setTipo] = useState<'Comissao' | 'Bonificacao' | 'Horas extras'>('Comissao');
    const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
    const [ano, setAno] = useState<number>(new Date().getFullYear());
    const [valor, setValor] = useState<number>(0);
    const [descricao, setDescricao] = useState('');
    const [dataLancamento, setDataLancamento] = useState(new Date().toLocaleDateString('en-CA'));
    const [editingId, setEditingId] = useState<string | null>(null);

    // Filtering State
    const [selectedMonthFilter, setSelectedMonthFilter] = useState<number | 'all'>(new Date().getMonth() + 1);
    const [selectedYearFilter, setSelectedYearFilter] = useState<number | 'all'>(new Date().getFullYear());
    const [filterTipo, setFilterTipo] = useState<string>('all');
    const [filterFilial, setFilterFilial] = useState<string>('all');
    const [filterReferencia, setFilterReferencia] = useState<string>('');
    const [filterData, setFilterData] = useState<string>('');
    const [openFilter, setOpenFilter] = useState<string | null>(null);
    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setOpenFilter(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: funcData } = await supabase
                .from('funcionarios')
                .select('*, filial:filiais(*), setor:setores(*)')
                .eq('ativo', true)
                .order('nome');

            const { data: lancData } = await supabase
                .from('lancamentos_financeiros')
                .select('*, funcionario:funcionarios(*, filial:filiais(*))')
                .order('data_lancamento', { ascending: false });

            const { data: filialData } = await supabase
                .from('filiais')
                .select('*')
                .order('nome');

            setFuncionarios(funcData || []);
            setFiliais(filialData || []);
            setLancamentos(lancData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            showToast('Erro ao carregar dados', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFuncionarioId) return showToast('Selecione um funcionário', 'warning');
        if (valor <= 0) return showToast('Informe o valor', 'warning');

        try {
            setLoading(true);
            const payload = {
                funcionario_id: selectedFuncionarioId,
                tipo,
                mes,
                ano,
                valor,
                descricao: descricao || null,
                data_lancamento: dataLancamento
            };

            if (editingId) {
                const { error } = await supabase
                    .from('lancamentos_financeiros')
                    .update(payload)
                    .eq('id', editingId);
                if (error) throw error;
                showToast('Lançamento atualizado com sucesso!', 'success');
            } else {
                const { error } = await supabase
                    .from('lancamentos_financeiros')
                    .insert([payload]);
                if (error) throw error;
                showToast('Lançamento registrado com sucesso!', 'success');
            }

            setIsModalOpen(false);
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Error saving lancamento:', error);
            showToast('Erro ao salvar lançamento', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirmAction({
            title: 'Excluir Lançamento',
            message: 'Tem certeza que deseja excluir este lançamento financeiro?',
            variant: 'danger'
        });
        if (!confirmed) return;

        try {
            setLoading(true);
            const { error } = await supabase
                .from('lancamentos_financeiros')
                .delete()
                .eq('id', id);
            if (error) throw error;
            showToast('Lançamento excluído com sucesso!', 'success');
            fetchData();
        } catch (error) {
            console.error('Error deleting lancamento:', error);
            showToast('Erro ao excluir lançamento', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (lanc: LancamentoFinanceiro) => {
        setEditingId(lanc.id);
        setSelectedFuncionarioId(lanc.funcionario_id);
        setSearchTerm(lanc.funcionario?.nome || '');
        setTipo(lanc.tipo);
        setMes(lanc.mes);
        setAno(lanc.ano);
        setValor(lanc.valor);
        setDescricao(lanc.descricao || '');
        setDataLancamento(lanc.data_lancamento);
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingId(null);
        setSelectedFuncionarioId('');
        setSearchTerm('');
        setTipo('Comissao');
        setMes(new Date().getMonth() + 1);
        setAno(new Date().getFullYear());
        setValor(0);
        setDescricao('');
        setDataLancamento(new Date().toLocaleDateString('en-CA'));
    };

    const filteredFuncionarios = funcionarios.filter(f =>
        f.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredLancamentos = useMemo(() => {
        return lancamentos.filter(lanc => {
            const matchesSearch = (lanc.funcionario?.nome || '').toLowerCase().includes(listSearchTerm.toLowerCase());
            const matchesFilial = filterFilial === 'all' || lanc.funcionario?.filial?.nome === filterFilial;
            const matchesMonth = selectedMonthFilter === 'all' || lanc.mes === selectedMonthFilter;
            const matchesYear = selectedYearFilter === 'all' || lanc.ano === selectedYearFilter;
            const matchesTipo = filterTipo === 'all' || lanc.tipo === filterTipo;
            const refStr = `${String(lanc.mes).padStart(2, '0')}/${lanc.ano}`;
            const matchesRef = !filterReferencia || refStr.includes(filterReferencia);
            const dataStr = (lanc.data_lancamento || '').split('-').reverse().join('/');
            const matchesData = !filterData || dataStr.includes(filterData);

            return matchesSearch && matchesFilial && matchesMonth && matchesYear && matchesTipo && matchesRef && matchesData;
        });
    }, [lancamentos, listSearchTerm, filterFilial, selectedMonthFilter, selectedYearFilter, filterTipo, filterReferencia, filterData]);

    const filteredTotals = useMemo(() => ({
        Comissao: filteredLancamentos.filter(l => l.tipo === 'Comissao').reduce((acc, l) => acc + l.valor, 0),
        Bonificacao: filteredLancamentos.filter(l => l.tipo === 'Bonificacao').reduce((acc, l) => acc + l.valor, 0),
        HorasExtras: filteredLancamentos.filter(l => l.tipo === 'Horas extras').reduce((acc, l) => acc + l.valor, 0),
        Geral: filteredLancamentos.reduce((acc, l) => acc + l.valor, 0)
    }), [filteredLancamentos]);

    const handleExportPDF = () => {
        exportLancamentosToPdf({
            lancamentos: filteredLancamentos,
            periodo: {
                mes: selectedMonthFilter,
                ano: selectedYearFilter
            },
            filtros: {
                tipo: filterTipo,
                funcionario: listSearchTerm || undefined,
                filial: filterFilial || undefined
            },
            totals: filteredTotals
        });
    };

    const totals = filteredTotals;

    if (loading && lancamentos.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-cyan-400">Lançamentos Financeiros</h1>
                </div>
                {permissions?.editar && (
                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Novo Lançamento
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 bg-[#0F1629]/50 border-cyan-500/10 transition-all hover:bg-[#0F1629]/80 hover:border-cyan-500/30">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Total Comissões</p>
                            <p className="text-2xl font-bold text-gray-200">
                                R$ {totals.Comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-[#0F1629]/50 border-cyan-500/10 transition-all hover:bg-[#0F1629]/80 hover:border-cyan-500/30">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                            <Gift className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Total Bonificações</p>
                            <p className="text-2xl font-bold text-gray-200">
                                R$ {totals.Bonificacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-[#0F1629]/50 border-cyan-500/10 transition-all hover:bg-[#0F1629]/80 hover:border-cyan-500/30">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Total Horas Extras</p>
                            <p className="text-2xl font-bold text-gray-200">
                                R$ {totals.HorasExtras.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="bg-[#0F1629]/50 border-cyan-500/10">
                <div className="p-6 border-b border-cyan-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-gray-200">Histórico de Lançamentos</h2>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar funcionário..."
                                value={listSearchTerm}
                                onChange={(e) => setListSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-[#151B2D] border border-cyan-500/10 rounded-lg text-sm text-gray-200 focus:ring-2 focus:ring-cyan-500 placeholder:text-gray-600 transition-all"
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-[#151B2D] border border-cyan-500/10 rounded-lg px-3 py-1.5">
                            <CalendarIcon className="w-4 h-4 text-cyan-400" />
                            <select
                                value={selectedMonthFilter}
                                onChange={(e) => setSelectedMonthFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                className="bg-transparent text-xs text-gray-300 focus:outline-none appearance-none pr-1"
                            >
                                <option value="all" className="bg-[#0F1629]">Mês: Todos</option>
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i + 1} value={i + 1} className="bg-[#0F1629]">
                                        {new Date(2000, i).toLocaleDateString('pt-BR', { month: 'long' })}
                                    </option>
                                ))}
                            </select>
                            <span className="text-gray-600 font-bold">/</span>
                            <select
                                value={selectedYearFilter}
                                onChange={(e) => setSelectedYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                className="bg-transparent text-xs text-gray-300 focus:outline-none appearance-none"
                            >
                                <option value="all" className="bg-[#0F1629]">Ano: Todos</option>
                                {[2024, 2025, 2026, 2027].map(y => (
                                    <option key={y} value={y} className="bg-[#0F1629]">{y}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleExportPDF}
                            disabled={filteredLancamentos.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-[#151B2D] hover:bg-cyan-500/10 text-gray-400 hover:text-cyan-400 border border-cyan-500/10 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                            title="Exportar PDF"
                        >
                            <FileText className="w-4 h-4 transition-transform group-hover:scale-110" />
                            <span className="hidden sm:inline">Exportar PDF</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto overflow-y-visible min-h-[400px] transition-all">
                    <table className="w-full">
                        <thead className="sticky top-0 z-20">
                            <tr className="text-left bg-cyan-500/5">
                                <th className="px-6 py-4 text-xs font-bold text-cyan-400 uppercase tracking-wider relative">
                                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setOpenFilter(openFilter === 'funcionario' ? null : 'funcionario')}>
                                        Funcionário
                                        <Filter className={`w-3 h-3 transition-colors ${(openFilter === 'funcionario' || listSearchTerm !== '') ? 'text-yellow-400' : 'text-cyan-500/50 cursor-pointer hover:text-cyan-400'}`} />
                                    </div>
                                    {openFilter === 'funcionario' && (
                                        <div ref={filterRef} className="absolute z-[100] top-full left-0 mt-1 p-2 bg-[#151B2D] border border-cyan-500/20 rounded-lg shadow-2xl min-w-[180px]">
                                            <div className="flex items-center justify-between mb-1.5 px-1">
                                                <span className="text-[9px] text-gray-400 uppercase font-bold">Filtrar</span>
                                                <button onClick={() => setOpenFilter(null)}><X className="w-3 h-3 text-gray-500 hover:text-white" /></button>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Buscar..."
                                                value={listSearchTerm}
                                                onChange={(e) => setListSearchTerm(e.target.value)}
                                                className="w-full bg-[#0F1629] border border-cyan-500/10 rounded px-2 py-1.5 text-xs text-gray-200 focus:ring-1 focus:ring-cyan-500 focus:outline-none placeholder:text-gray-600"
                                                autoFocus
                                            />
                                        </div>
                                    )}
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-cyan-400 uppercase tracking-wider relative">
                                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setOpenFilter(openFilter === 'filial' ? null : 'filial')}>
                                        Filial
                                        <Filter className={`w-3 h-3 transition-colors ${(openFilter === 'filial' || filterFilial !== 'all') ? 'text-yellow-400' : 'text-cyan-500/50 cursor-pointer hover:text-cyan-400'}`} />
                                    </div>
                                    {openFilter === 'filial' && (
                                        <div ref={filterRef} className="absolute z-[100] top-full left-0 mt-1 p-2 bg-[#151B2D] border border-cyan-500/20 rounded-lg shadow-2xl min-w-[150px]">
                                            <div className="flex items-center justify-between mb-1 px-1">
                                                <span className="text-[9px] text-gray-400 uppercase font-bold">Filial</span>
                                                <button onClick={() => setOpenFilter(null)}><X className="w-3 h-3 text-gray-500 hover:text-white" /></button>
                                            </div>
                                            <div className="space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
                                                <button
                                                    onClick={() => { setFilterFilial('all'); setOpenFilter(null); }}
                                                    className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${filterFilial === 'all' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-white/5'}`}
                                                >
                                                    Todas
                                                </button>
                                                {filiais.map(f => (
                                                    <button
                                                        key={f.id}
                                                        onClick={() => { setFilterFilial(f.nome); setOpenFilter(null); }}
                                                        className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${filterFilial === f.nome ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-white/5'}`}
                                                    >
                                                        {f.nome}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-cyan-400 uppercase tracking-wider relative">
                                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setOpenFilter(openFilter === 'tipo' ? null : 'tipo')}>
                                        Tipo
                                        <Filter className={`w-3 h-3 transition-colors ${(openFilter === 'tipo' || filterTipo !== 'all') ? 'text-yellow-400' : 'text-cyan-500/50 cursor-pointer hover:text-cyan-400'}`} />
                                    </div>
                                    {openFilter === 'tipo' && (
                                        <div ref={filterRef} className="absolute z-[100] top-full left-0 mt-1 p-2 bg-[#151B2D] border border-cyan-500/20 rounded-lg shadow-2xl min-w-[140px]">
                                            <div className="flex items-center justify-between mb-1 px-1">
                                                <span className="text-[9px] text-gray-400 uppercase font-bold">Tipo</span>
                                                <button onClick={() => setOpenFilter(null)}><X className="w-3 h-3 text-gray-500 hover:text-white" /></button>
                                            </div>
                                            <div className="space-y-0.5">
                                                {['all', 'Comissao', 'Bonificacao', 'Horas extras'].map(t => (
                                                    <button
                                                        key={t}
                                                        onClick={() => { setFilterTipo(t); setOpenFilter(null); }}
                                                        className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${filterTipo === t ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-white/5'}`}
                                                    >
                                                        {t === 'all' ? 'Todos' : t === 'Comissao' ? 'Comissão' : t === 'Bonificacao' ? 'Bonificação' : 'H. Extras'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-cyan-400 uppercase tracking-wider relative">
                                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setOpenFilter(openFilter === 'referencia' ? null : 'referencia')}>
                                        Referência
                                        <Filter className={`w-3 h-3 transition-colors ${openFilter === 'referencia' ? 'text-cyan-400' : 'text-cyan-500/50 cursor-pointer hover:text-cyan-400'}`} />
                                    </div>
                                    {openFilter === 'referencia' && (
                                        <div ref={filterRef} className="absolute z-[100] top-full left-0 mt-1 p-2 bg-[#151B2D] border border-cyan-500/20 rounded-lg shadow-2xl min-w-[150px]">
                                            <div className="flex items-center justify-between mb-1.5 px-1">
                                                <span className="text-[9px] text-gray-400 uppercase font-bold">Mês/Ano</span>
                                                <button onClick={() => setOpenFilter(null)}><X className="w-3 h-3 text-gray-500 hover:text-white" /></button>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="..."
                                                value={filterReferencia}
                                                onChange={(e) => setFilterReferencia(e.target.value)}
                                                className="w-full bg-[#0F1629] border border-cyan-500/10 rounded px-2 py-1.5 text-xs text-gray-200 focus:ring-1 focus:ring-cyan-500 focus:outline-none placeholder:text-gray-600"
                                                autoFocus
                                            />
                                        </div>
                                    )}
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-cyan-400 uppercase tracking-wider">Valor</th>
                                <th className="px-6 py-4 text-xs font-bold text-cyan-400 uppercase tracking-wider relative">
                                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setOpenFilter(openFilter === 'data' ? null : 'data')}>
                                        Data Registro
                                        <Filter className={`w-3 h-3 transition-colors ${openFilter === 'data' ? 'text-cyan-400' : 'text-cyan-500/50 cursor-pointer hover:text-cyan-400'}`} />
                                    </div>
                                    {openFilter === 'data' && (
                                        <div ref={filterRef} className="absolute z-[100] top-full right-0 mt-1 p-2 bg-[#151B2D] border border-cyan-500/20 rounded-lg shadow-2xl min-w-[150px]">
                                            <div className="flex items-center justify-between mb-1.5 px-1">
                                                <span className="text-[9px] text-gray-400 uppercase font-bold">Data</span>
                                                <button onClick={() => setOpenFilter(null)}><X className="w-3 h-3 text-gray-500 hover:text-white" /></button>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="..."
                                                value={filterData}
                                                onChange={(e) => setFilterData(e.target.value)}
                                                className="w-full bg-[#0F1629] border border-cyan-500/10 rounded px-2 py-1.5 text-xs text-gray-200 focus:ring-1 focus:ring-cyan-500 focus:outline-none placeholder:text-gray-600"
                                                autoFocus
                                            />
                                        </div>
                                    )}
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-cyan-400 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-cyan-500/5">
                            {filteredLancamentos.length > 0 ? (
                                filteredLancamentos.map(lanc => (
                                    <tr key={lanc.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-gray-200 font-medium">{lanc.funcionario?.nome}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-gray-400 text-sm">{lanc.funcionario?.filial?.nome || 'N/A'}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${lanc.tipo === 'Comissao' ? 'bg-green-500/20 text-green-400' :
                                                lanc.tipo === 'Bonificacao' ? 'bg-purple-500/20 text-purple-400' :
                                                    'bg-orange-500/20 text-orange-400'
                                                }`}>
                                                {lanc.tipo}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-sm">
                                            {String(lanc.mes).padStart(2, '0')}/{lanc.ano}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-200 font-bold">
                                            R$ {lanc.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-sm">
                                            {lanc.data_lancamento.split('-').reverse().join('/')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                                            {permissions?.editar && (
                                                <button
                                                    onClick={() => handleEdit(lanc)}
                                                    className="p-1.5 hover:bg-cyan-500/10 text-gray-500 hover:text-cyan-400 rounded-lg transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            {permissions?.excluir && (
                                                <button
                                                    onClick={() => handleDelete(lanc.id)}
                                                    className="p-1.5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        Nenhum lançamento encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {filteredLancamentos.length > 0 && (
                            <tfoot className="bg-cyan-500/5 border-t border-cyan-500/20">
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-xs font-bold text-gray-500 text-right uppercase tracking-wider">
                                        Total Geral:
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-cyan-400 font-black text-base">
                                        R$ {filteredTotals.Geral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </Card >

            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); resetForm(); }}
                title={editingId ? 'Editar Lançamento' : 'Novo Lançamento Financeiro'}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        {/* Tipo de Lançamento */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Tipo de Lançamento</label>
                            <div className="grid grid-cols-3 gap-3">
                                {(['Comissao', 'Bonificacao', 'Horas extras'] as const).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setTipo(t)}
                                        className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${tipo === t
                                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-lg shadow-cyan-500/10'
                                            : 'bg-[#151B2D] border-gray-700 text-gray-500 hover:border-gray-600'
                                            }`}
                                    >
                                        {t === 'Comissao' ? 'Comissão' : t === 'Bonificacao' ? 'Bonificação' : 'H. Extras'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Selecionar Funcionário */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Funcionário</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Pesquisar funcionário..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-[#151B2D] border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500 transition-all"
                                />
                            </div>
                            <div className="mt-2 max-h-40 overflow-y-auto bg-[#151B2D] border border-gray-700 rounded-xl divide-y divide-gray-700">
                                {filteredFuncionarios.length > 0 ? (
                                    filteredFuncionarios.map(f => (
                                        <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedFuncionarioId(f.id);
                                                setSearchTerm(f.nome);
                                            }}
                                            className={`w-full px-4 py-2 text-left hover:bg-cyan-500/10 transition-colors flex items-center justify-between ${selectedFuncionarioId === f.id ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-300'}`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold">{f.nome}</span>
                                                <span className="text-[10px] text-gray-500 uppercase">{f.filial?.nome}</span>
                                            </div>
                                            <ChevronRight className={`w-4 h-4 ${selectedFuncionarioId === f.id ? 'text-cyan-400' : 'text-gray-600'}`} />
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-3 text-sm text-gray-500 text-center italic">Nenhum funcionário encontrado</div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Período de Referência */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Período Referência</label>
                                <div className="flex items-center gap-2 bg-[#151B2D] border border-gray-700 rounded-xl px-3 py-2.5">
                                    <select
                                        value={mes}
                                        onChange={(e) => setMes(Number(e.target.value))}
                                        className="bg-transparent text-sm text-gray-200 focus:outline-none flex-1"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <option key={i + 1} value={i + 1} className="bg-[#0F1629]">
                                                {new Date(2000, i).toLocaleDateString('pt-BR', { month: 'long' })}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="text-gray-600">/</span>
                                    <select
                                        value={ano}
                                        onChange={(e) => setAno(Number(e.target.value))}
                                        className="bg-transparent text-sm text-gray-200 focus:outline-none"
                                    >
                                        {[2024, 2025, 2026, 2027].map(y => (
                                            <option key={y} value={y} className="bg-[#0F1629]">{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Valor */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Valor (R$)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={valor || ''}
                                        onChange={(e) => setValor(Number(e.target.value))}
                                        className="w-full pl-10 pr-4 py-2.5 bg-[#151B2D] border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500 font-bold"
                                        placeholder="0,00"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Descrição */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Descrição (Opcional)</label>
                            <textarea
                                value={descricao}
                                onChange={(e) => setDescricao(e.target.value)}
                                className="w-full px-4 py-2.5 bg-[#151B2D] border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500 resize-none h-20 text-sm"
                                placeholder="Adicione detalhes ou observações..."
                            />
                        </div>

                        {/* Data do Lançamento */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Data do Lançamento</label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="date"
                                    value={dataLancamento}
                                    onChange={(e) => setDataLancamento(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-[#151B2D] border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-6 border-t border-gray-700">
                        <button
                            type="button"
                            onClick={() => { setIsModalOpen(false); resetForm(); }}
                            className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all font-semibold"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white rounded-xl shadow-lg shadow-cyan-500/30 transition-all font-bold flex items-center justify-center gap-2"
                        >
                            <Save className="w-5 h-5" />
                            {editingId ? 'Salvar Alterações' : 'Registrar Lançamento'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div >
    );
};
