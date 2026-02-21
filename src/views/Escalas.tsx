import { useState, useEffect, useMemo } from 'react';
import {
    Calendar,
    Plus,
    ChevronLeft,
    Building2,
    Users,
    Save,
    Loader2,
    FileText,
    Edit2,
    Trash2,
    Search
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog, ConfirmOptions } from '../components/ui/ConfirmDialog';
import { useNotification } from '../context/NotificationContext';
import { exportEscalaToPdf } from '../utils/escalaPdfExport';
import type { EscalaGrupo, Escala, EscalaEntrada, Funcionario, Filial } from '../types';

export const Escalas = ({ permissions }: { permissions: any }) => {
    const { showToast } = useNotification();
    // State for navigation/selection
    const [step, setStep] = useState<'groups' | 'grid'>('groups');
    const [selectedGroup, setSelectedGroup] = useState<EscalaGrupo | null>(null);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);

    // Data state
    const [groups, setGroups] = useState<EscalaGrupo[]>([]);
    const [tabs, setTabs] = useState<Escala[]>([]);
    const [entries, setEntries] = useState<EscalaEntrada[]>([]);
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [allFuncionarios, setAllFuncionarios] = useState<Funcionario[]>([]);
    const [filiais, setFiliais] = useState<Filial[]>([]);

    // UI state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isTabModalOpen, setIsTabModalOpen] = useState(false);

    // Form state
    const [groupForm, setGroupForm] = useState({ nome: '', filial_id: '' });
    const [tabForm, setTabForm] = useState({
        nome: '',
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear()
    });
    const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);
    const [onConfirmAction, setOnConfirmAction] = useState<(() => void) | null>(null);
    const [editingItem, setEditingItem] = useState<{ type: 'group' | 'tab', data: any } | null>(null);
    const [isAddFuncModalOpen, setIsAddFuncModalOpen] = useState(false);
    const [funcSearchTerm, setFuncSearchTerm] = useState('');

    // Drag-to-fill state
    const [dragStart, setDragStart] = useState<{ funcionarioId: string, dia: number } | null>(null);
    const [dragEnd, setDragEnd] = useState<{ funcionarioId: string, dia: number } | null>(null);
    const [dragValue, setDragValue] = useState<string | null>(null);

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            handleDragEnd();
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [dragStart, dragEnd, dragValue, entries]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [groupsRes, filiaisRes, allFuncsRes] = await Promise.all([
                supabase.from('escala_grupos').select('*').order('nome'),
                supabase.from('filiais').select('*').order('nome'),
                supabase.from('funcionarios').select('*, cargo_rel:cargos(*)').eq('ativo', true).order('nome')
            ]);
            setGroups(groupsRes.data || []);
            setFiliais(filiaisRes.data || []);
            setAllFuncionarios(allFuncsRes.data || []);
        } catch (error) {
            console.error('Error fetching initial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchGroupData = async (group: EscalaGrupo) => {
        setLoading(true);
        try {
            const { data: tabsRes } = await supabase.from('escalas').select('*').eq('grupo_id', group.id).order('ano', { ascending: false }).order('mes', { ascending: false });
            setTabs(tabsRes || []);

            if (tabsRes && tabsRes.length > 0) {
                handleSelectTab(tabsRes[0].id);
            }
        } catch (error) {
            console.error('Error fetching group data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchScaleData = async (escalaId: string) => {
        try {
            const [entriesRes, membersRes] = await Promise.all([
                supabase.from('escala_entradas').select('*').eq('escala_id', escalaId),
                supabase.from('escala_funcionarios')
                    .select('funcionario_id, funcionarios(*, cargo_rel:cargos(*))')
                    .eq('escala_id', escalaId)
            ]);
            setEntries(entriesRes.data || []);
            const scaleMembers = (membersRes.data || [])
                .map((m: any) => m.funcionarios)
                .filter(Boolean) as unknown as Funcionario[];
            setFuncionarios(scaleMembers);
        } catch (error) {
            console.error('Error fetching scale data:', error);
        }
    };

    const handleSelectGroup = (group: EscalaGrupo) => {
        setSelectedGroup(group);
        setStep('grid');
        fetchGroupData(group);
    };

    const handleSelectTab = (tabId: string) => {
        setActiveTabId(tabId);
        fetchScaleData(tabId);
    };

    const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);

    const daysInMonth = useMemo(() => {
        if (!activeTab) return [];
        const date = new Date(activeTab.ano, activeTab.mes - 1, 1);
        const days = [];
        while (date.getMonth() === activeTab.mes - 1) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    }, [activeTab]);

    const getWeekday = (date: Date) => {
        return date.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', '');
    };

    const getEntryStyle = (code: string) => {
        const val = code.toUpperCase();
        switch (val) {
            case 'F': return 'bg-red-500/20 text-red-500 border border-red-500/30 rounded-md';
            case 'FD': return 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded-md';
            case 'FR': return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-md';
            case 'FE': return 'bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-md';
            case 'CF': return 'bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-md';
            case 'AT': return 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-md';
            case 'CH': return 'bg-orange-500/20 text-orange-500 border border-orange-500/30 rounded-md';
            case 'T1':
            case 'T2': return 'text-gray-200 bg-transparent border-0';
            default: return 'text-gray-400 bg-transparent border-0';
        }
    };

    const getEntry = (funcionarioId: string, dia: number) => {
        return entries.find(e => e.funcionario_id === funcionarioId && e.dia === dia)?.turno || '';
    };

    const handleCellChange = (funcionarioId: string, dia: number, value: string) => {
        const newEntries = [...entries];
        const index = newEntries.findIndex(e => e.funcionario_id === funcionarioId && e.dia === dia);

        if (index > -1) {
            newEntries[index] = { ...newEntries[index], turno: value };
        } else {
            newEntries.push({
                id: crypto.randomUUID(),
                escala_id: activeTabId!,
                funcionario_id: funcionarioId,
                dia,
                turno: value,
                created_at: new Date().toISOString()
            });
        }
        setEntries(newEntries);
    };

    const handleDragStart = (funcionarioId: string, dia: number, value: string) => {
        if (!permissions?.editar) return;
        setDragStart({ funcionarioId, dia });
        setDragEnd({ funcionarioId, dia });
        setDragValue(value);
    };

    const handleDragEnter = (funcionarioId: string, dia: number) => {
        if (!dragStart || dragStart.funcionarioId !== funcionarioId) return;
        setDragEnd({ funcionarioId, dia });
    };

    const handleDragEnd = () => {
        if (!dragStart || !dragEnd || dragValue === null) {
            setDragStart(null);
            setDragEnd(null);
            setDragValue(null);
            return;
        }

        const startDia = Math.min(dragStart.dia, dragEnd.dia);
        const endDia = Math.max(dragStart.dia, dragEnd.dia);
        const funcionarioId = dragStart.funcionarioId;

        const newEntries = [...entries];
        for (let dia = startDia; dia <= endDia; dia++) {
            const index = newEntries.findIndex(e => e.funcionario_id === funcionarioId && e.dia === dia);
            if (index > -1) {
                newEntries[index] = { ...newEntries[index], turno: dragValue };
            } else {
                newEntries.push({
                    id: crypto.randomUUID(),
                    escala_id: activeTabId!,
                    funcionario_id: funcionarioId,
                    dia,
                    turno: dragValue,
                    created_at: new Date().toISOString()
                });
            }
        }

        setEntries(newEntries);
        setDragStart(null);
        setDragEnd(null);
        setDragValue(null);
    };

    const isCellInSelection = (funcionarioId: string, dia: number) => {
        if (!dragStart || !dragEnd || dragStart.funcionarioId !== funcionarioId) return false;
        const startDia = Math.min(dragStart.dia, dragEnd.dia);
        const endDia = Math.max(dragStart.dia, dragEnd.dia);
        return dia >= startDia && dia <= endDia;
    };

    const handleSave = async () => {
        if (!activeTabId) return;
        setSaving(true);
        try {
            // Simplify: Delete all then insert for the current scale
            // In a production app, we would use upsert or only send changes
            await supabase.from('escala_entradas').delete().eq('escala_id', activeTabId);

            const toInsert = entries
                .filter(e => e.turno && e.turno.trim() !== '')
                .map(({ escala_id, funcionario_id, dia, turno }) => ({
                    escala_id,
                    funcionario_id,
                    dia,
                    turno
                }));

            if (toInsert.length > 0) {
                const { error } = await supabase.from('escala_entradas').insert(toInsert);
                if (error) throw error;
            }
            showToast('Escala salva com sucesso!', 'success');
        } catch (error) {
            console.error('Error saving entries:', error);
            showToast('Erro ao salvar escala.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data, error } = await supabase
                .from('escala_grupos')
                .insert([groupForm])
                .select()
                .single();
            if (error) throw error;
            setGroups([...groups, data]);
            setIsGroupModalOpen(false);
            setGroupForm({ nome: '', filial_id: '' });
        } catch (error) {
            console.error('Error creating group:', error);
        }
    };

    const handleCreateTab = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data, error } = await supabase
                .from('escalas')
                .insert([{ ...tabForm, grupo_id: selectedGroup!.id }])
                .select()
                .single();
            if (error) throw error;
            setTabs([...tabs, data]);
            setIsTabModalOpen(false);
            handleSelectTab(data.id);
        } catch (error) {
            console.error('Error creating tab:', error);
        }
    };

    const handleUpdateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem || editingItem.type !== 'group') return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('escala_grupos')
                .update({ nome: groupForm.nome, filial_id: groupForm.filial_id })
                .eq('id', editingItem.data.id);

            if (error) throw error;
            showToast('Grupo atualizado com sucesso!', 'success');
            setEditingItem(null);
            fetchInitialData();
        } catch (error) {
            console.error('Error updating group:', error);
            showToast('Erro ao atualizar grupo', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteGroup = async (id: string) => {
        setConfirmOptions({
            title: 'Excluir Grupo',
            message: 'Tem certeza que deseja excluir este grupo de escalas? Todas as abas e entradas vinculadas serão perdidas.',
            variant: 'danger',
            confirmLabel: 'Excluir'
        });
        setOnConfirmAction(() => async () => {
            try {
                const { error } = await supabase.from('escala_grupos').delete().eq('id', id);
                if (error) throw error;
                showToast('Grupo excluído com sucesso!', 'success');
                fetchInitialData();
            } catch (error) {
                console.error('Error deleting group:', error);
                showToast('Erro ao excluir grupo', 'error');
            } finally {
                setConfirmOptions(null);
            }
        });
    };

    const handleUpdateTab = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem || editingItem.type !== 'tab') return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('escalas')
                .update({ nome: tabForm.nome, mes: tabForm.mes, ano: tabForm.ano })
                .eq('id', editingItem.data.id);

            if (error) throw error;
            showToast('Aba atualizada com sucesso!', 'success');
            setEditingItem(null);
            if (selectedGroup) fetchGroupData(selectedGroup);
        } catch (error) {
            console.error('Error updating tab:', error);
            showToast('Erro ao atualizar aba', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTab = async (id: string) => {
        setConfirmOptions({
            title: 'Excluir Aba',
            message: 'Tem certeza que deseja excluir esta aba de escala? Todos os dados registrados nela serão perdidos.',
            variant: 'danger',
            confirmLabel: 'Excluir'
        });
        setOnConfirmAction(() => async () => {
            try {
                const { error } = await supabase.from('escalas').delete().eq('id', id);
                if (error) throw error;
                showToast('Aba excluída com sucesso!', 'success');
                if (selectedGroup) fetchGroupData(selectedGroup);
            } catch (error) {
                console.error('Error deleting tab:', error);
                showToast('Erro ao excluir aba', 'error');
            } finally {
                setConfirmOptions(null);
            }
        });
    };

    const handleAddEmployeeToScale = async (funcionarioId: string) => {
        if (!activeTabId) return;
        try {
            const { error } = await supabase.from('escala_funcionarios').insert({
                escala_id: activeTabId,
                funcionario_id: funcionarioId
            });
            if (error) throw error;
            showToast('Funcionário adicionado à escala', 'success');
            fetchScaleData(activeTabId);
        } catch (error: any) {
            if (error.code === '23505') {
                showToast('Funcionário já está nesta escala', 'error');
            } else {
                showToast('Erro ao adicionar funcionário', 'error');
            }
        }
    };

    const handleRemoveEmployeeFromScale = async (funcionarioId: string) => {
        if (!activeTabId) return;
        setConfirmOptions({
            title: 'Remover da Escala',
            message: 'Tem certeza que deseja remover este funcionário desta escala mensal? As marcações dele serão perdidas.',
            variant: 'danger',
            confirmLabel: 'Remover'
        });
        setOnConfirmAction(() => async () => {
            try {
                const { error } = await supabase
                    .from('escala_funcionarios')
                    .delete()
                    .eq('escala_id', activeTabId)
                    .eq('funcionario_id', funcionarioId);
                if (error) throw error;
                showToast('Funcionário removido da escala', 'success');
                fetchScaleData(activeTabId);
            } catch (error) {
                console.error('Error removing employee:', error);
                showToast('Erro ao remover funcionário', 'error');
            } finally {
                setConfirmOptions(null);
            }
        });
    };


    if (loading && step === 'groups') {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {step === 'groups' ? (
                <>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-cyan-400">Escalas</h1>
                        </div>
                        {permissions?.editar && (
                            <button
                                onClick={() => setIsGroupModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 transition-all"
                            >
                                <Plus className="w-5 h-5" />
                                Novo Grupo
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groups.map((group) => (
                            <Card
                                key={group.id}
                                className="p-6 cursor-pointer hover:border-cyan-500/50 transition-all group relative overflow-visible"
                            >
                                <div className="flex items-center gap-4" onClick={() => handleSelectGroup(group)}>
                                    <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <Calendar className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xl font-bold text-gray-200 truncate pr-8">{group.nome}</h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                                            <Building2 className="w-4 h-4" />
                                            {filiais.find(f => f.id === group.filial_id)?.nome}
                                        </div>
                                    </div>
                                </div>

                                {permissions?.editar && (
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setGroupForm({ nome: group.nome, filial_id: group.filial_id });
                                                setEditingItem({ type: 'group', data: group });
                                            }}
                                            className="p-1.5 hover:bg-cyan-500/20 text-cyan-400 rounded transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteGroup(group.id);
                                            }}
                                            className="p-1.5 hover:bg-red-500/20 text-red-500 rounded transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>

                    {groups.length === 0 && (
                        <div className="text-center py-20 bg-[#0F1629]/50 rounded-2xl border border-cyan-500/10">
                            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">Nenhum grupo de escalas encontrado.</p>
                        </div>
                    )}
                </>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setStep('groups')}
                                className="p-2 hover:bg-cyan-500/10 text-cyan-400 rounded-lg transition-colors border border-cyan-500/20"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-cyan-400">{selectedGroup?.nome}</h1>
                                <p className="text-sm text-gray-400">{filiais.find(f => f.id === selectedGroup?.filial_id)?.nome}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {permissions?.editar && (
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-lg shadow-green-500/30 transition-all disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Salvar Escala
                                </button>
                            )}
                            {permissions?.editar && activeTabId && (
                                <button
                                    onClick={() => setIsAddFuncModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/30 transition-all font-bold"
                                >
                                    <Plus className="w-5 h-5" />
                                    Adicionar Funcionário
                                </button>
                            )}
                            {activeTab && (
                                <button
                                    onClick={() => exportEscalaToPdf({
                                        escala: activeTab,
                                        entries,
                                        funcionarios,
                                        days: daysInMonth,
                                        filialNome: filiais.find(f => f.id === selectedGroup?.filial_id)?.nome || '',
                                        grupoNome: selectedGroup?.nome || ''
                                    })}
                                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 transition-all"
                                >
                                    <FileText className="w-5 h-5" />
                                    Exportar PDF
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-2 border-b border-cyan-500/10 pb-px overflow-x-auto scrollbar-hide">
                        {tabs.map((tab) => (
                            <div key={tab.id} className="relative group/tab">
                                <button
                                    onClick={() => handleSelectTab(tab.id)}
                                    className={`px-6 py-3 font-medium transition-all border-b-2 whitespace-nowrap flex items-center gap-3 ${activeTabId === tab.id
                                        ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                                        : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'
                                        }`}
                                >
                                    {tab.nome}
                                    {permissions?.editar && activeTabId === tab.id && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTabForm({ nome: tab.nome, mes: tab.mes, ano: tab.ano });
                                                    setEditingItem({ type: 'tab', data: tab });
                                                }}
                                                className="p-1 hover:bg-cyan-500/20 rounded transition-colors"
                                            >
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteTab(tab.id);
                                                }}
                                                className="p-1 hover:bg-red-500/20 rounded transition-colors"
                                            >
                                                <Trash2 className="w-3 h-3 text-red-500" />
                                            </button>
                                        </div>
                                    )}
                                </button>
                            </div>
                        ))}
                        {permissions?.editar && (
                            <button
                                onClick={() => setIsTabModalOpen(true)}
                                className="px-4 py-3 text-cyan-400 hover:bg-cyan-500/10 transition-colors flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Novo Mês
                            </button>
                        )}
                    </div>

                    {/* Grid */}
                    <Card className={`overflow-hidden border-cyan-500/10 ${dragStart ? 'select-none' : ''}`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[1200px]">
                                <thead>
                                    <tr className="bg-[#151B2D]">
                                        <th className="sticky left-0 z-20 bg-[#151B2D] p-3 border-b border-r border-cyan-500/10 min-w-[200px]">
                                            <div className="flex items-center gap-2 text-cyan-400">
                                                <Users className="w-4 h-4" />
                                                <span className="font-bold">Funcionário / Função</span>
                                            </div>
                                        </th>
                                        {daysInMonth.map((date, i) => {
                                            const weekday = getWeekday(date);
                                            const isSunday = date.getDay() === 0;
                                            return (
                                                <th
                                                    key={i}
                                                    className={`p-1 border-b border-r border-cyan-500/10 text-center min-w-[40px] ${isSunday ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                                                >
                                                    <div className="text-[10px] uppercase">{weekday}</div>
                                                    <div className="text-sm font-bold">{date.getDate()}</div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {funcionarios.map((f) => (
                                        <tr key={f.id} className="hover:bg-cyan-500/5 transition-colors border-b border-cyan-500/5">
                                            <td className="sticky left-0 z-10 bg-[#0F1629] p-3 border-r border-cyan-500/10">
                                                <div className="flex items-center justify-between group/row pr-2">
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-gray-200 text-sm truncate">{f.nome}</div>
                                                        <div className="text-[10px] text-cyan-400/70 truncate uppercase">{f.cargo_rel?.nome || 'Aux. Logística'}</div>
                                                    </div>
                                                    {permissions?.editar && (
                                                        <button
                                                            onClick={() => handleRemoveEmployeeFromScale(f.id)}
                                                            className="p-1 text-red-500/0 group-hover/row:text-red-500 hover:bg-red-500/20 rounded transition-all ml-2 flex-shrink-0"
                                                            title="Remover da escala"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            {daysInMonth.map((date, i) => {
                                                const dia = date.getDate();
                                                const value = getEntry(f.id, dia);
                                                const isInSelection = isCellInSelection(f.id, dia);

                                                return (
                                                    <td
                                                        key={i}
                                                        className={`p-0 border-r border-cyan-500/10 h-10 transition-all ${isInSelection ? 'bg-cyan-500/40 outline outline-2 outline-cyan-500 -outline-offset-2 z-10' : ''}`}
                                                        onMouseEnter={() => handleDragEnter(f.id, dia)}
                                                    >
                                                        <div className="w-full h-full p-1 flex items-center justify-center">
                                                            <input
                                                                type="text"
                                                                value={value}
                                                                readOnly={!permissions?.editar}
                                                                onMouseDown={(e) => {
                                                                    if (e.button === 0) { // Left click
                                                                        handleDragStart(f.id, dia, value);
                                                                    }
                                                                }}
                                                                onChange={(e) => handleCellChange(f.id, dia, e.target.value.toUpperCase())}
                                                                className={`w-full h-full text-center text-sm font-black focus:outline-none focus:ring-1 focus:ring-inset focus:ring-cyan-500 transition-all ${getEntryStyle(value)} ${!permissions?.editar ? 'cursor-not-allowed opacity-70' : 'cursor-cell'}`}
                                                                maxLength={3}
                                                            />
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Legend */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 text-[10px] text-gray-400 bg-[#0F1629]/80 p-4 rounded-xl border border-cyan-500/20 backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 flex items-center justify-center bg-red-500/20 border border-red-500/30 rounded text-red-500 font-bold">F</span>
                            <span>Folga Semanal</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 flex items-center justify-center bg-emerald-500/20 border border-emerald-500/30 rounded text-emerald-500 font-bold">FD</span>
                            <span>Folga Domingo</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 flex items-center justify-center bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 font-bold">FR</span>
                            <span>Férias</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 flex items-center justify-center bg-amber-500/20 border border-amber-500/30 rounded text-amber-500 font-bold">FE</span>
                            <span>Feriado</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 flex items-center justify-center bg-purple-500/20 border border-purple-500/30 rounded text-purple-400 font-bold">CF</span>
                            <span>Compensação</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 flex items-center justify-center bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-500 font-bold">AT</span>
                            <span>Atestado</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 flex items-center justify-center bg-orange-500/20 border border-orange-500/30 rounded text-orange-500 font-bold">CH</span>
                            <span>CH (a1)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 flex items-center justify-center bg-transparent border-0 rounded text-gray-200 font-bold">T1</span>
                            <span>Turnos 1/2</span>
                        </div>
                    </div>
                </div >
            )}

            {/* Group Modal */}
            <Modal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} title="Novo Grupo de Escalas">
                <form onSubmit={handleCreateGroup} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Nome do Grupo</label>
                        <input
                            type="text"
                            placeholder="Ex: Escala Logística, Escala Vendedores"
                            className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500 outline-none"
                            value={groupForm.nome}
                            onChange={(e) => setGroupForm({ ...groupForm, nome: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Filial</label>
                        <select
                            className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500 outline-none"
                            value={groupForm.filial_id}
                            onChange={(e) => setGroupForm({ ...groupForm, filial_id: e.target.value })}
                            required
                        >
                            <option value="">Selecione uma filial</option>
                            {filiais.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setIsGroupModalOpen(false)} className="flex-1 py-2 bg-gray-700 text-white rounded-lg">Cancelar</button>
                        <button type="submit" className="flex-1 py-2 bg-cyan-600 text-white rounded-lg font-bold">Criar Grupo</button>
                    </div>
                </form>
            </Modal>

            {/* Tab Modal */}
            <Modal isOpen={isTabModalOpen} onClose={() => setIsTabModalOpen(false)} title="Adicionar Novo Mês">
                <form onSubmit={handleCreateTab} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Nome da Aba</label>
                        <input
                            type="text"
                            placeholder="Ex: Fevereiro T1, Março"
                            className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500 outline-none"
                            value={tabForm.nome}
                            onChange={(e) => setTabForm({ ...tabForm, nome: e.target.value })}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Mês</label>
                            <select
                                className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500 outline-none"
                                value={tabForm.mes}
                                onChange={(e) => setTabForm({ ...tabForm, mes: Number(e.target.value) })}
                            >
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                        {new Date(2000, i, 1).toLocaleDateString('pt-BR', { month: 'long' })}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Ano</label>
                            <input
                                type="number"
                                className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500 outline-none"
                                value={tabForm.ano}
                                onChange={(e) => setTabForm({ ...tabForm, ano: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setIsTabModalOpen(false)} className="flex-1 py-2 bg-gray-700 text-white rounded-lg">Cancelar</button>
                        <button type="submit" className="flex-1 py-2 bg-cyan-600 text-white rounded-lg font-bold">Criar Aba</button>
                    </div>
                </form>
            </Modal>

            {/* Edit Modals */}
            {
                editingItem?.type === 'group' && (
                    <Modal isOpen={true} onClose={() => setEditingItem(null)} title="Editar Grupo">
                        <form onSubmit={handleUpdateGroup} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Nome del Grupo</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500 outline-none"
                                    value={groupForm.nome}
                                    onChange={(e) => setGroupForm({ ...groupForm, nome: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Filial</label>
                                <select
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500 outline-none"
                                    value={groupForm.filial_id}
                                    onChange={(e) => setGroupForm({ ...groupForm, filial_id: e.target.value })}
                                    required
                                >
                                    {filiais.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setEditingItem(null)} className="flex-1 py-2 bg-gray-700 text-white rounded-lg">Cancelar</button>
                                <button type="submit" disabled={saving} className="flex-1 py-2 bg-cyan-600 text-white rounded-lg font-bold">
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    </Modal>
                )
            }

            {
                editingItem?.type === 'tab' && (
                    <Modal isOpen={true} onClose={() => setEditingItem(null)} title="Editar Aba">
                        <form onSubmit={handleUpdateTab} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Nome da Aba</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500 outline-none"
                                    value={tabForm.nome}
                                    onChange={(e) => setTabForm({ ...tabForm, nome: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Mês</label>
                                    <select
                                        className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500 outline-none"
                                        value={tabForm.mes}
                                        onChange={(e) => setTabForm({ ...tabForm, mes: Number(e.target.value) })}
                                    >
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <option key={i + 1} value={i + 1}>
                                                {new Date(2000, i, 1).toLocaleDateString('pt-BR', { month: 'long' })}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Ano</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500 outline-none"
                                        value={tabForm.ano}
                                        onChange={(e) => setTabForm({ ...tabForm, ano: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setEditingItem(null)} className="flex-1 py-2 bg-gray-700 text-white rounded-lg">Cancelar</button>
                                <button type="submit" disabled={saving} className="flex-1 py-2 bg-cyan-600 text-white rounded-lg font-bold">
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    </Modal>
                )
            }

            {/* Add Employee Modal */}
            <Modal isOpen={isAddFuncModalOpen} onClose={() => setIsAddFuncModalOpen(false)} title="Adicionar Funcionário à Escala">
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar funcionário por nome ou filial..."
                            className="w-full pl-10 pr-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500 outline-none"
                            value={funcSearchTerm}
                            onChange={(e) => setFuncSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {allFuncionarios
                            .filter(f =>
                                !funcionarios.find(curr => curr.id === f.id) &&
                                (f.nome.toLowerCase().includes(funcSearchTerm.toLowerCase()) ||
                                    filiais.find(fil => fil.id === f.filial_id)?.nome.toLowerCase().includes(funcSearchTerm.toLowerCase()))
                            )
                            .map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => {
                                        handleAddEmployeeToScale(f.id);
                                        setIsAddFuncModalOpen(false);
                                        setFuncSearchTerm('');
                                    }}
                                    className="w-full flex items-center justify-between p-3 bg-[#151B2D] hover:bg-cyan-500/10 border border-gray-700 hover:border-cyan-500/30 rounded-xl transition-all group"
                                >
                                    <div className="text-left">
                                        <div className="font-bold text-gray-200 group-hover:text-cyan-400 transition-colors">{f.nome}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                            <Building2 className="w-3 h-3" />
                                            {filiais.find(fil => fil.id === f.filial_id)?.nome}
                                            <span className="text-gray-700">•</span>
                                            <span className="text-cyan-400/60 uppercase text-[10px]">{f.cargo_rel?.nome}</span>
                                        </div>
                                    </div>
                                    <Plus className="w-5 h-5 text-gray-600 group-hover:text-cyan-400 group-hover:scale-110 transition-all" />
                                </button>
                            ))}
                        {allFuncionarios.filter(f => !funcionarios.find(curr => curr.id === f.id)).length === 0 && (
                            <div className="text-center py-8 text-gray-500 italic">
                                Todos os funcionários ativos já estão nesta escala.
                            </div>
                        )}
                    </div>
                    <div className="pt-2">
                        <button
                            onClick={() => setIsAddFuncModalOpen(false)}
                            className="w-full py-2.5 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Confirm Dialog */}
            {
                confirmOptions && (
                    <ConfirmDialog
                        {...confirmOptions}
                        onConfirm={onConfirmAction || (() => { })}
                        onCancel={() => setConfirmOptions(null)}
                    />
                )
            }
        </div >
    );
};
