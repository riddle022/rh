import { useState, useEffect, useMemo } from 'react';
import {
    Loader2,
    Search,
    DollarSign,
    Plus,
    Calculator,
    Save,
    ChevronRight,
    Edit2,
    Trash2,
    Check,
    X as CloseIcon,
    Calendar as CalendarIcon,
    Filter,
    FileText
} from 'lucide-react';
import { useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import type { Funcionario, ValeMercadoriaData, ValeMercadoriaParcela, Filial } from '../types';
import { exportValeMercadoriaToPdf } from '../utils/valeMercadoriaPdfExport';

interface Installment {
    id: string;
    parcela: number;
    valor: number;
    vencimento: string;
    pago: boolean;
}

export const ValeMercadoria = ({ permissions }: { permissions: any }) => {
    const { showToast, confirm: confirmAction } = useNotification();
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [selectedFuncionarioId, setSelectedFuncionarioId] = useState('');
    const [selectedVale, setSelectedVale] = useState<ValeMercadoriaData | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [vales, setVales] = useState<ValeMercadoriaData[]>([]);
    const [totalValue, setTotalValue] = useState<number>(0);
    const [installmentsCount, setInstallmentsCount] = useState<number>(1);
    const [installments, setInstallments] = useState<Installment[]>([]);
    const [editingParcelaId, setEditingParcelaId] = useState<string | null>(null);
    const [editParcelaData, setEditParcelaData] = useState<{ valor: number; data_vencimento: string }>({
        valor: 0,
        data_vencimento: ''
    });

    // Filtering State
    const [listSearchTerm, setListSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());
    const [filterFilial, setFilterFilial] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterData, setFilterData] = useState<string>('');
    const [filterTotal, setFilterTotal] = useState<string>('');
    const [filiais, setFiliais] = useState<Filial[]>([]);
    const [openFilter, setOpenFilter] = useState<string | null>(null);
    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: funcData } = await supabase
                .from('funcionarios')
                .select('*, filial:filiais(*), setor:setores(*)')
                .eq('ativo', true)
                .order('nome');

            const { data: valesData } = await supabase
                .from('vales_mercadoria')
                .select('*, funcionario:funcionarios(*, filial:filiais(*)), parcelas:vales_mercadoria_parcelas(*)')
                .order('created_at', { ascending: false });

            const { data: filialData } = await supabase
                .from('filiais')
                .select('*')
                .order('nome');

            setFuncionarios(funcData || []);
            setVales(valesData || []);
            setFiliais(filialData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setOpenFilter(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredVales = useMemo(() => {
        return vales.filter(vale => {
            const matchesSearch = vale.funcionario?.nome.toLowerCase().includes(listSearchTerm.toLowerCase());
            const matchesFilial = filterFilial === 'all' || vale.funcionario?.filial?.nome === filterFilial;
            const matchesStatus = filterStatus === 'all' || vale.status === filterStatus;
            const matchesData = !filterData || new Date(vale.created_at).toLocaleDateString('pt-BR').includes(filterData);
            const matchesTotal = !filterTotal || vale.valor_total.toString().includes(filterTotal);

            let matchesMonthYear = true;
            if (selectedMonth !== 'all' || selectedYear !== 'all') {
                matchesMonthYear = vale.parcelas?.some(p => {
                    const dueDate = new Date(p.data_vencimento);
                    const pMonth = dueDate.getMonth() + 1;
                    const pYear = dueDate.getFullYear();
                    const monthMatch = selectedMonth === 'all' || pMonth === selectedMonth;
                    const yearMatch = selectedYear === 'all' || pYear === selectedYear;
                    return monthMatch && yearMatch && !p.pago;
                }) || false;
            }

            return matchesSearch && matchesFilial && matchesStatus && matchesData && matchesTotal && matchesMonthYear;
        });
    }, [vales, listSearchTerm, filterFilial, filterStatus, filterData, filterTotal, selectedMonth, selectedYear]);

    const filteredTotal = useMemo(() => {
        return filteredVales.reduce((acc: number, v: ValeMercadoriaData) => acc + v.valor_total, 0);
    }, [filteredVales]);

    // Automated Calculation Logic
    useEffect(() => {
        if (totalValue > 0 && installmentsCount > 0) {
            const installmentValue = parseFloat((totalValue / installmentsCount).toFixed(2));
            const newInstallments: Installment[] = [];

            const today = new Date();

            for (let i = 1; i <= installmentsCount; i++) {
                const dueDate = new Date(today);
                dueDate.setMonth(today.getMonth() + i);

                newInstallments.push({
                    id: i.toString(),
                    parcela: i,
                    valor: i === installmentsCount
                        ? parseFloat((totalValue - (installmentValue * (installmentsCount - 1))).toFixed(2)) // Adjustment for rounding
                        : installmentValue,
                    vencimento: dueDate.toISOString().split('T')[0],
                    pago: false
                });
            }
            setInstallments(newInstallments);
        } else {
            setInstallments([]);
        }
    }, [totalValue, installmentsCount]);

    const handleUpdateInstallment = (id: string, field: 'valor' | 'vencimento', value: any) => {
        setInstallments(prev => prev.map(inst =>
            inst.id === id ? { ...inst, [field]: value } : inst
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFuncionarioId) return showToast('Selecione um funcionário', 'warning');
        if (totalValue <= 0) return showToast('Informe o valor total', 'warning');

        try {
            setLoading(true);

            // 1. Create the Vale
            const { data: vale, error: valeError } = await supabase
                .from('vales_mercadoria')
                .insert([{
                    funcionario_id: selectedFuncionarioId,
                    valor_total: totalValue,
                    parcelas_total: installmentsCount,
                    status: 'ativo'
                }])
                .select()
                .single();

            if (valeError) throw valeError;

            // 2. Create the Installments
            const installmentsToInsert = installments.map(inst => ({
                vale_id: vale.id,
                num_parcela: inst.parcela,
                valor: inst.valor,
                data_vencimento: inst.vencimento,
                pago: false
            }));

            const { error: instError } = await supabase
                .from('vales_mercadoria_parcelas')
                .insert(installmentsToInsert);

            if (instError) throw instError;

            showToast('Vale mercadoria registrado com sucesso!', 'success');
            setIsModalOpen(false);
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Error saving vale:', error);
            showToast('Erro ao salvar vale mercadoria', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleParcela = async (parcela: ValeMercadoriaParcela) => {
        try {
            const newPago = !parcela.pago;
            const { error } = await supabase
                .from('vales_mercadoria_parcelas')
                .update({
                    pago: newPago,
                    data_pagamento: newPago ? new Date().toISOString().split('T')[0] : null
                })
                .eq('id', parcela.id);

            if (error) throw error;

            fetchData();

            if (selectedVale) {
                const updatedParcelas = selectedVale.parcelas?.map(p =>
                    p.id === parcela.id ? { ...p, pago: newPago, data_pagamento: newPago ? new Date().toISOString().split('T')[0] : null } : p
                );

                const allPaid = updatedParcelas?.every(p => p.pago);
                if (allPaid && selectedVale.status !== 'quitado') {
                    await supabase.from('vales_mercadoria').update({ status: 'quitado' }).eq('id', selectedVale.id);
                } else if (!allPaid && selectedVale.status === 'quitado') {
                    await supabase.from('vales_mercadoria').update({ status: 'ativo' }).eq('id', selectedVale.id);
                }

                setSelectedVale({ ...selectedVale, parcelas: updatedParcelas });
                fetchData();
            }
        } catch (error) {
            console.error('Error updating installment:', error);
            showToast('Erro ao atualizar parcela', 'error');
        }
    };

    const handleDeleteParcela = async (parcelaId: string) => {
        const confirmed = await confirmAction({
            title: 'Excluir Parcela',
            message: 'Tem certeza que deseja excluir esta parcela?',
            variant: 'danger'
        });
        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('vales_mercadoria_parcelas')
                .delete()
                .eq('id', parcelaId);

            if (error) throw error;

            if (selectedVale) {
                const refreshedParcelas = selectedVale.parcelas?.filter(p => p.id !== parcelaId);
                setSelectedVale({ ...selectedVale, parcelas: refreshedParcelas });

                // Update total in vale if needed? Usually we don't, but maybe we should update status
                const allPaid = refreshedParcelas?.length ? refreshedParcelas.every(p => p.pago) : true;
                if (allPaid && selectedVale.status !== 'quitado') {
                    await supabase.from('vales_mercadoria').update({ status: 'quitado' }).eq('id', selectedVale.id);
                }
            }

            fetchData();
        } catch (error) {
            console.error('Error deleting installment:', error);
            showToast('Erro ao excluir parcela', 'error');
        }
    };

    const handleDeleteVale = async () => {
        if (!selectedVale) return;

        const hasPaidParcelas = selectedVale.parcelas?.some(p => p.pago);
        if (hasPaidParcelas) {
            return showToast('Não é possível excluir o vale completo pois existem parcelas já pagas. Você deve excluir ou estornar as parcelas pagas antes de remover o registro completo.', 'warning');
        }

        const confirmed = await confirmAction({
            title: 'Excluir Registro Completo',
            message: 'Tem certeza que deseja excluir este vale completo e todas as suas parcelas? Esta ação não pode ser desfeita.',
            variant: 'danger',
            confirmLabel: 'Excluir registro completo'
        });
        if (!confirmed) return;

        try {
            setLoading(true);
            const { error } = await supabase
                .from('vales_mercadoria')
                .delete()
                .eq('id', selectedVale.id);

            if (error) throw error;

            showToast('Vale mercadoria excluído com sucesso!', 'success');
            setIsDetailModalOpen(false);
            setSelectedVale(null);
            fetchData();
        } catch (error) {
            console.error('Error deleting vale:', error);
            showToast('Erro ao excluir vale mercadoria', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleStartEditParcela = (parcela: ValeMercadoriaParcela) => {
        setEditingParcelaId(parcela.id);
        setEditParcelaData({
            valor: parcela.valor,
            data_vencimento: parcela.data_vencimento
        });
    };

    const handleSaveParcelaUpdate = async (parcelaId: string) => {
        try {
            const { error } = await supabase
                .from('vales_mercadoria_parcelas')
                .update({
                    valor: editParcelaData.valor,
                    data_vencimento: editParcelaData.data_vencimento
                })
                .eq('id', parcelaId);

            if (error) throw error;

            if (selectedVale) {
                const updatedParcelas = selectedVale.parcelas?.map(p =>
                    p.id === parcelaId ? { ...p, ...editParcelaData } : p
                );
                setSelectedVale({ ...selectedVale, parcelas: updatedParcelas });
            }

            setEditingParcelaId(null);
            fetchData();
        } catch (error) {
            console.error('Error updating installment:', error);
            showToast('Erro ao salvar alteração', 'error');
        }
    };

    const resetForm = () => {
        setSelectedFuncionarioId('');
        setTotalValue(0);
        setInstallmentsCount(1);
        setInstallments([]);
        setSearchTerm('');
    };

    const filteredFuncionarios = funcionarios.filter(f =>
        f.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const handleExportPDF = () => {
        exportValeMercadoriaToPdf({
            vales: filteredVales,
            periodo: {
                mes: selectedMonth,
                ano: selectedYear
            },
            filtros: {
                funcionario: listSearchTerm || undefined,
                filial: filterFilial !== 'all' ? filterFilial : undefined,
                status: filterStatus !== 'all' ? filterStatus : undefined,
                data: filterData || undefined,
                total: filterTotal || undefined
            },
            totalGeral: filteredTotal
        });
    };

    if (loading) {
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
                    <h1 className="text-3xl font-bold text-cyan-400">Vale Mercadoria</h1>
                </div>
                {permissions?.editar && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Novo Vale
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6 bg-[#0F1629]/50 border-cyan-500/10 transition-all hover:bg-[#0F1629]/80 hover:border-cyan-500/30">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Saldo Devedor Geral</p>
                            <p className="text-2xl font-bold text-gray-200">
                                R$ {vales.reduce((acc, v) => {
                                    const devidovale = v.parcelas?.reduce((pAcc, p) => !p.pago ? pAcc + p.valor : pAcc, 0) || 0;
                                    return acc + devidovale;
                                }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-[#0F1629]/50 border-cyan-500/10 transition-all hover:bg-[#0F1629]/80 hover:border-cyan-500/30">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                            <CalendarIcon className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Cobrança no Período</p>
                            <p className="text-2xl font-bold text-gray-200">
                                R$ {vales.reduce((acc, v) => {
                                    const devidomes = v.parcelas?.reduce((pAcc, p) => {
                                        const dueDate = new Date(p.data_vencimento);
                                        const pMonth = dueDate.getMonth() + 1;
                                        const pYear = dueDate.getFullYear();
                                        const monthMatch = selectedMonth === 'all' || pMonth === selectedMonth;
                                        const yearMatch = selectedYear === 'all' || pYear === selectedYear;
                                        return (monthMatch && yearMatch && !p.pago) ? pAcc + p.valor : pAcc;
                                    }, 0) || 0;
                                    return acc + devidomes;
                                }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="bg-[#0F1629]/50 border-cyan-500/10 overflow-hidden">
                <div className="p-6 border-b border-cyan-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-gray-200">Últimas Concessões</h2>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Buscador de Funcionários */}
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

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportPDF}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#151B2D] border border-cyan-500/10 hover:border-cyan-500/30 text-gray-300 hover:text-white text-xs font-bold rounded-lg transition-all"
                                title="Exportar PDF"
                            >
                                <FileText className="w-4 h-4 text-cyan-400" />
                                <span className="hidden sm:inline">Exportar PDF</span>
                            </button>

                            {/* Filtro de Mês/Ano */}
                            <div className="flex items-center gap-2 bg-[#151B2D] border border-cyan-500/10 rounded-lg px-3 py-1.5 transition-all hover:border-cyan-500/30">
                                <CalendarIcon className="w-4 h-4 text-cyan-400" />
                                <div className="flex items-center gap-2">
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                        className="bg-transparent text-xs text-gray-300 focus:outline-none cursor-pointer appearance-none pr-1"
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
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                        className="bg-transparent text-xs text-gray-300 focus:outline-none cursor-pointer appearance-none"
                                    >
                                        <option value="all" className="bg-[#0F1629]">Ano: Todos</option>
                                        {[2024, 2025, 2026, 2027].map(y => (
                                            <option key={y} value={y} className="bg-[#0F1629]">{y}</option>
                                        ))}
                                    </select>
                                </div>
                                {(selectedMonth !== 'all' || selectedYear !== 'all') && (
                                    <button
                                        onClick={() => { setSelectedMonth('all'); setSelectedYear('all'); }}
                                        className="ml-1 p-0.5 hover:bg-gray-700 rounded-full text-gray-500 transition-colors"
                                        title="Limpar Filtros"
                                    >
                                        <CloseIcon className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-0 overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left bg-cyan-500/5">
                                <th className="px-6 py-4 text-xs font-bold text-cyan-400 uppercase tracking-wider relative">
                                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setOpenFilter(openFilter === 'filial' ? null : 'filial')}>
                                        Funcionário / Filial
                                        <Filter className={`w-3 h-3 transition-colors ${(openFilter === 'filial' || filterFilial !== 'all') ? 'text-yellow-400' : 'text-cyan-500/50 hover:text-cyan-400'}`} />
                                    </div>
                                    {openFilter === 'filial' && (
                                        <div ref={filterRef} className="absolute z-[100] top-full left-0 mt-1 p-2 bg-[#151B2D] border border-cyan-500/20 rounded-lg shadow-2xl min-w-[150px]">
                                            <div className="flex items-center justify-between mb-1 px-1">
                                                <span className="text-[9px] text-gray-400 uppercase font-bold">Filial</span>
                                                <button onClick={() => setOpenFilter(null)}><CloseIcon className="w-3 h-3 text-gray-500 hover:text-white" /></button>
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
                                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setOpenFilter(openFilter === 'data' ? null : 'data')}>
                                        Data
                                        <Filter className={`w-3 h-3 transition-colors ${(openFilter === 'data' || filterData !== '') ? 'text-yellow-400' : 'text-cyan-500/50 hover:text-cyan-400'}`} />
                                    </div>
                                    {openFilter === 'data' && (
                                        <div ref={filterRef} className="absolute z-[100] top-full left-0 mt-1 p-2 bg-[#151B2D] border border-cyan-500/20 rounded-lg shadow-2xl min-w-[120px]">
                                            <div className="flex items-center justify-between mb-1 px-1">
                                                <span className="text-[9px] text-gray-400 uppercase font-bold">Data</span>
                                                <button onClick={() => setOpenFilter(null)}><CloseIcon className="w-3 h-3 text-gray-500 hover:text-white" /></button>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="..."
                                                value={filterData}
                                                onChange={(e) => setFilterData(e.target.value)}
                                                className="w-full bg-[#0F1629] border border-cyan-500/10 rounded px-2 py-1.5 text-xs text-gray-200 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                                                autoFocus
                                            />
                                        </div>
                                    )}
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-cyan-400 uppercase tracking-wider relative">
                                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setOpenFilter(openFilter === 'total' ? null : 'total')}>
                                        Total
                                        <Filter className={`w-3 h-3 transition-colors ${(openFilter === 'total' || filterTotal !== '') ? 'text-yellow-400' : 'text-cyan-500/50 hover:text-cyan-400'}`} />
                                    </div>
                                    {openFilter === 'total' && (
                                        <div ref={filterRef} className="absolute z-[100] top-full left-0 mt-1 p-2 bg-[#151B2D] border border-cyan-500/20 rounded-lg shadow-2xl min-w-[120px]">
                                            <div className="flex items-center justify-between mb-1 px-1">
                                                <span className="text-[9px] text-gray-400 uppercase font-bold">Valor</span>
                                                <button onClick={() => setOpenFilter(null)}><CloseIcon className="w-3 h-3 text-gray-500 hover:text-white" /></button>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="..."
                                                value={filterTotal}
                                                onChange={(e) => setFilterTotal(e.target.value)}
                                                className="w-full bg-[#0F1629] border border-cyan-500/10 rounded px-2 py-1.5 text-xs text-gray-200 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                                                autoFocus
                                            />
                                        </div>
                                    )}
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-cyan-400 uppercase tracking-wider">Parcelas</th>
                                <th className="px-6 py-4 text-xs font-bold text-cyan-400 uppercase tracking-wider relative">
                                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setOpenFilter(openFilter === 'status' ? null : 'status')}>
                                        Status
                                        <Filter className={`w-3 h-3 transition-colors ${(openFilter === 'status' || filterStatus !== 'all') ? 'text-yellow-400' : 'text-cyan-500/50 hover:text-cyan-400'}`} />
                                    </div>
                                    {openFilter === 'status' && (
                                        <div ref={filterRef} className="absolute z-[100] top-full left-0 mt-1 p-2 bg-[#151B2D] border border-cyan-500/20 rounded-lg shadow-2xl min-w-[120px]">
                                            <div className="flex items-center justify-between mb-1 px-1">
                                                <span className="text-[9px] text-gray-400 uppercase font-bold">Status</span>
                                                <button onClick={() => setOpenFilter(null)}><CloseIcon className="w-3 h-3 text-gray-500 hover:text-white" /></button>
                                            </div>
                                            <div className="space-y-0.5">
                                                {['all', 'ativo', 'quitado', 'cancelado'].map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => { setFilterStatus(s); setOpenFilter(null); }}
                                                        className={`w-full text-left px-2 py-1 rounded text-xs transition-colors capitalize ${filterStatus === s ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-white/5'}`}
                                                    >
                                                        {s === 'all' ? 'Todos' : s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </th>
                                <th className="px-6 py-4 text-xs font-bold text-cyan-400 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-cyan-500/5">
                            {filteredVales.length > 0 ? (
                                filteredVales.map((vale: ValeMercadoriaData) => (
                                    <tr key={vale.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-gray-200 font-medium">{vale.funcionario?.nome}</span>
                                                <span className="text-[10px] text-gray-500 uppercase">{vale.funcionario?.filial?.nome || vale.funcionario?.filial_id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 text-sm">
                                            {new Date(vale.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 text-gray-300 font-bold">
                                            R$ {vale.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">
                                            {vale.parcelas_total}x
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${vale.status === 'ativo' ? 'bg-cyan-500/20 text-cyan-400' :
                                                vale.status === 'quitado' ? 'bg-green-500/20 text-green-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>
                                                {vale.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => {
                                                    setSelectedVale(vale);
                                                    setIsDetailModalOpen(true);
                                                }}
                                                className="text-gray-500 hover:text-cyan-400 transition-colors"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        Nenhum vale registrado ainda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {filteredVales.length > 0 && (
                            <tfoot className="bg-cyan-500/5 border-t border-cyan-500/20">
                                <tr>
                                    <td colSpan={2} className="px-6 py-4 text-xs font-bold text-gray-500 text-right uppercase tracking-wider">
                                        Total Geral:
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-cyan-400 font-black text-base">
                                        R$ {filteredTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td colSpan={3}></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); resetForm(); }}
                title="Nova Concessão de Vale"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-400 mb-2 mt-2">Selecionar Funcionário</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Pesquisar funcionário..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-[#151B2D] border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500 transition-all font-medium"
                                />
                            </div>
                            <div className="mt-2 max-h-40 overflow-y-auto bg-[#151B2D] border border-gray-700 rounded-xl divide-y divide-gray-700 shadow-xl">
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
                                                <span className="font-semibold">{f.nome}</span>
                                                <span className="text-[10px] text-gray-500 uppercase">{f.filial?.nome} • {f.setor?.nome}</span>
                                            </div>
                                            <ChevronRight className={`w-4 h-4 transition-transform ${selectedFuncionarioId === f.id ? 'rotate-90 text-cyan-400' : 'text-gray-600'}`} />
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-3 text-sm text-gray-500 text-center italic">Nenhum funcionário encontrado</div>
                                )}
                            </div>
                        </div>

                        <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-400 mb-2">Valor Total do Vale (R$)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="number"
                                    step="0.01"
                                    value={totalValue || ''}
                                    onChange={(e) => setTotalValue(Number(e.target.value))}
                                    className="w-full pl-10 pr-4 py-3 bg-[#151B2D] border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500 transition-all font-bold"
                                    placeholder="0,00"
                                    required
                                />
                            </div>
                        </div>

                        <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-400 mb-2">Número de Parcelas</label>
                            <div className="relative">
                                <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="number"
                                    min="1"
                                    max="12"
                                    value={installmentsCount || ''}
                                    onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                                    className="w-full pl-10 pr-4 py-3 bg-[#151B2D] border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500 transition-all font-bold"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {installments.length > 0 && (
                        <div className="mt-4 space-y-3">
                            <h4 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                                <ChevronRight className="w-4 h-4" /> Planejamento de Parcelas
                            </h4>
                            <div className="bg-[#151B2D]/50 rounded-xl border border-cyan-500/10 overflow-hidden shadow-inner">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-cyan-500/5 text-gray-400">
                                            <th className="px-4 py-3 text-left font-semibold">Parcela</th>
                                            <th className="px-4 py-3 text-left font-semibold">Valor</th>
                                            <th className="px-4 py-3 text-left font-semibold">Vencimento</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {installments.map((inst) => (
                                            <tr key={inst.id} className="hover:bg-cyan-500/5 transition-colors">
                                                <td className="px-4 py-3 text-gray-300 font-medium">#{inst.parcela}</td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={inst.valor}
                                                        onChange={(e) => handleUpdateInstallment(inst.id, 'valor', Number(e.target.value))}
                                                        className="w-28 px-2 py-1.5 bg-[#0F1629] border border-gray-700 rounded-lg text-cyan-400 focus:ring-2 focus:ring-cyan-500 font-bold transition-all"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="date"
                                                        value={inst.vencimento}
                                                        onChange={(e) => handleUpdateInstallment(inst.id, 'vencimento', e.target.value)}
                                                        className="bg-transparent text-gray-300 border border-transparent hover:border-cyan-500/30 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-cyan-500 cursor-pointer hover:text-cyan-400 transition-all"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-[11px] text-gray-500 italic flex items-center gap-1">
                                <Calculator className="w-3 h-3" />
                                Os valores e datas foram calculados automaticamente, mas você pode editá-los livremente.
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-6 border-t border-gray-700">
                        <button
                            type="button"
                            onClick={() => { setIsModalOpen(false); resetForm(); }}
                            className="flex-1 px-4 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all font-semibold"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white rounded-xl shadow-lg shadow-cyan-500/30 transition-all font-bold flex items-center justify-center gap-2"
                        >
                            <Save className="w-5 h-5" />
                            Finalizar Concessão
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal de Detalhes do Vale */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={`Detalhes do Vale - ${selectedVale?.funcionario?.nome}`}
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 bg-[#151B2D] p-4 rounded-xl border border-cyan-500/10">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Total do Vale</p>
                            <p className="text-xl font-bold text-cyan-400">R$ {selectedVale?.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Status Atual</p>
                            <span className={`inline-block mt-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${selectedVale?.status === 'ativo' ? 'bg-cyan-500/20 text-cyan-400' :
                                selectedVale?.status === 'quitado' ? 'bg-green-500/20 text-green-400' :
                                    'bg-red-500/20 text-red-400'
                                }`}>
                                {selectedVale?.status}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-gray-200">Parcelas</h4>
                        <div className="bg-[#151B2D] rounded-xl border border-cyan-500/10 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-cyan-500/5 text-gray-400 text-left">
                                        <th className="px-4 py-3 font-semibold">Nº</th>
                                        <th className="px-4 py-3 font-semibold">Valor</th>
                                        <th className="px-4 py-3 font-semibold">Vencimento</th>
                                        <th className="px-4 py-3 font-semibold text-center">Pago</th>
                                        <th className="px-4 py-3 font-semibold text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {selectedVale?.parcelas?.sort((a, b) => a.num_parcela - b.num_parcela).map((p) => (
                                        <tr key={p.id} className="hover:bg-cyan-500/5 transition-colors">
                                            <td className="px-4 py-3 text-gray-400">#{p.num_parcela}</td>
                                            <td className="px-4 py-3 text-gray-200 font-medium">
                                                {editingParcelaId === p.id ? (
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editParcelaData.valor}
                                                        onChange={(e) => setEditParcelaData({ ...editParcelaData, valor: Number(e.target.value) })}
                                                        className="w-24 px-2 py-1 bg-[#0F1629] border border-cyan-500/30 rounded text-cyan-400 text-sm focus:outline-none"
                                                    />
                                                ) : (
                                                    `R$ ${p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-300">
                                                {editingParcelaId === p.id ? (
                                                    <input
                                                        type="date"
                                                        value={editParcelaData.data_vencimento}
                                                        onChange={(e) => setEditParcelaData({ ...editParcelaData, data_vencimento: e.target.value })}
                                                        className="px-2 py-1 bg-[#0F1629] border border-cyan-500/30 rounded text-gray-300 text-sm focus:outline-none"
                                                    />
                                                ) : (
                                                    new Date(p.data_vencimento).toLocaleDateString('pt-BR')
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleToggleParcela(p)}
                                                    className={`mx-auto w-6 h-6 rounded flex items-center justify-center transition-all ${p.pago
                                                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                                                        : 'bg-gray-800 border border-gray-700 text-gray-500 hover:border-cyan-500/50'
                                                        }`}
                                                >
                                                    {p.pago && <Save className="w-3 h-3" />}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {editingParcelaId === p.id ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleSaveParcelaUpdate(p.id)}
                                                                className="p-1 hover:text-green-400 text-gray-400 transition-colors"
                                                                title="Salvar"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingParcelaId(null)}
                                                                className="p-1 hover:text-red-400 text-gray-400 transition-colors"
                                                                title="Cancelar"
                                                            >
                                                                <CloseIcon className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            {permissions?.editar && (
                                                                <button
                                                                    onClick={() => handleStartEditParcela(p)}
                                                                    className="p-1.5 hover:bg-cyan-500/10 text-gray-500 hover:text-cyan-400 rounded-lg transition-all"
                                                                    title="Editar"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {permissions?.excluir && (
                                                                <button
                                                                    onClick={() => handleDeleteParcela(p.id)}
                                                                    className="p-1.5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg transition-all"
                                                                    title="Excluir"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-700">
                        {permissions?.excluir && (
                            <button
                                onClick={handleDeleteVale}
                                className="flex-1 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all font-bold flex items-center justify-center gap-2 border border-red-500/20"
                            >
                                <Trash2 className="w-5 h-5" />
                                Excluir Vale
                            </button>
                        )}
                        <button
                            onClick={() => setIsDetailModalOpen(false)}
                            className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all font-semibold"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
