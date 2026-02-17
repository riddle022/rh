import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Clock,
    Tag,
    Users,
    MessageSquare,
    BookOpen,
    FileText,
    Trash2,
    Edit2,
    Loader2,
    Calendar
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import type { Task, TaskStatus, TaskPriority, TaskType } from '../types';

export const GestaoTarefas = ({ permissions }: { permissions: any }) => {
    const { showToast, confirm: confirmAction } = useNotification();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [funcionarios, setFuncionarios] = useState<{ id: string, nome: string }[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const [formData, setFormData] = useState<Partial<Task>>({
        titulo: '',
        descricao: '',
        status: 'Pendente',
        prioridade: 'Média',
        tipo: 'Geral',
        data_vencimento: new Date().toLocaleDateString('en-CA'),
        funcionario_id: null,
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [tasksRes, funcionariosRes] = await Promise.all([
                supabase
                    .from('tarefas')
                    .select('*, funcionario:funcionarios(id, nome)')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('funcionarios')
                    .select('id, nome')
                    .order('nome')
            ]);

            if (tasksRes.error) throw tasksRes.error;
            if (funcionariosRes.error) throw funcionariosRes.error;

            setTasks(tasksRes.data || []);
            setFuncionarios(funcionariosRes.data || []);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            showToast('Erro ao carregar tarefas', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getPriorityColor = (priority: TaskPriority) => {
        switch (priority) {
            case 'Alta': return 'text-red-400 bg-red-400/10 border-red-400/20';
            case 'Média': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            case 'Baixa': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
        }
    };

    const getTypeIcon = (type: TaskType) => {
        switch (type) {
            case 'Entrevista': return <Users className="w-4 h-4" />;
            case 'Feedback': return <MessageSquare className="w-4 h-4" />;
            case 'Treinamento': return <BookOpen className="w-4 h-4" />;
            case 'Documentação': return <FileText className="w-4 h-4" />;
            default: return <Tag className="w-4 h-4" />;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                titulo: formData.titulo,
                descricao: formData.descricao || null,
                status: formData.status,
                prioridade: formData.prioridade,
                tipo: formData.tipo,
                data_vencimento: formData.data_vencimento,
                funcionario_id: formData.funcionario_id || null,
            };

            if (editingTask) {
                const { error } = await supabase
                    .from('tarefas')
                    .update(payload)
                    .eq('id', editingTask.id);
                if (error) throw error;
                showToast('Tarefa atualizada com sucesso', 'success');
            } else {
                const { error } = await supabase
                    .from('tarefas')
                    .insert([payload]);
                if (error) throw error;
                showToast('Tarefa criada con sucesso', 'success');
            }

            await fetchData();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving task:', error);
            showToast('Erro ao salvar tarefa', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirmAction({
            title: 'Excluir Tarefa',
            message: 'Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.',
            variant: 'danger'
        });

        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('tarefas')
                .delete()
                .eq('id', id);
            if (error) throw error;
            showToast('Tarefa excluída com sucesso', 'success');
            await fetchData();
        } catch (error) {
            console.error('Error deleting task:', error);
            showToast('Erro ao excluir tarefa', 'error');
        }
    };

    const handleEdit = (task: Task) => {
        setEditingTask(task);
        setFormData({
            titulo: task.titulo,
            descricao: task.descricao || '',
            status: task.status,
            prioridade: task.prioridade,
            tipo: task.tipo,
            data_vencimento: task.data_vencimento,
            funcionario_id: task.funcionario_id,
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTask(null);
        resetForm();
    };

    const resetForm = () => {
        setFormData({
            titulo: '',
            descricao: '',
            status: 'Pendente',
            prioridade: 'Média',
            tipo: 'Geral',
            data_vencimento: new Date().toLocaleDateString('en-CA'),
            funcionario_id: null,
        });
    };

    const filteredTasks = tasks.filter(t => {
        const matchesSearch = t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.descricao && t.descricao.toLowerCase().includes(searchTerm.toLowerCase()));

        const taskDate = t.data_vencimento;
        const matchesStart = !startDate || taskDate >= startDate;
        const matchesEnd = !endDate || taskDate <= endDate;

        return matchesSearch && matchesStart && matchesEnd;
    });

    const StatusColumn = ({ status, title, color }: { status: TaskStatus, title: string, color: string }) => {
        const columnTasks = filteredTasks.filter(t => t.status === status);

        return (
            <div className="flex-1 min-w-[300px] flex flex-col h-full bg-[#0F1629]/30 rounded-2xl border border-cyan-500/5 overflow-hidden">
                <div className={`p-4 border-b border-cyan-500/10 flex items-center justify-between bg-gradient-to-r ${color} to-transparent`}>
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-200 uppercase tracking-wider text-sm">{title}</h3>
                        <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs font-bold text-white/70">
                            {columnTasks.length}
                        </span>
                    </div>
                    {permissions?.editar && (
                        <button
                            onClick={() => {
                                setFormData({ ...formData, status });
                                setIsModalOpen(true);
                            }}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4 text-gray-400" />
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {columnTasks.map(task => (
                        <Card key={task.id} className="p-4 bg-[#151B2D] border-cyan-500/10 hover:border-cyan-500/30 transition-all cursor-pointer group hover:translate-y-[-2px] hover:shadow-lg hover:shadow-cyan-500/5">
                            <div className="flex items-start justify-between mb-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getPriorityColor(task.prioridade)}`}>
                                    {task.prioridade}
                                </span>
                                <div className="flex gap-1">
                                    {permissions?.editar && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEdit(task);
                                            }}
                                            className="text-cyan-400 hover:text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-cyan-500/10 rounded-lg"
                                            title="Editar tarefa"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    {permissions?.excluir && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(task.id);
                                            }}
                                            className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/10 rounded-lg"
                                            title="Excluir tarefa"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <h4 className="text-sm font-bold text-gray-200 mb-2 leading-tight group-hover:text-cyan-400 transition-colors">
                                {task.titulo}
                            </h4>

                            {task.descricao && (
                                <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                                    {task.descricao}
                                </p>
                            )}

                            {task.funcionario && (
                                <div className="flex items-center gap-2 mb-4 text-[10px] text-cyan-400/80 font-medium bg-cyan-400/5 p-1.5 rounded-lg border border-cyan-400/10">
                                    <Users className="w-3 h-3" />
                                    <span>{task.funcionario.nome}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                                <div className="flex items-center gap-2 text-cyan-400/60 font-semibold text-[10px] uppercase">
                                    {getTypeIcon(task.tipo)}
                                    <span>{task.tipo}</span>
                                </div>
                                <div className={`flex items-center gap-1.5 text-[10px] font-medium ${new Date(task.data_vencimento) < new Date() && task.status !== 'Concluída'
                                    ? 'text-red-400'
                                    : 'text-gray-500'
                                    }`}>
                                    <Clock className="w-3 h-3" />
                                    {task.data_vencimento.split('-').reverse().join('/')}
                                </div>
                            </div>
                        </Card>
                    ))}
                    {columnTasks.length === 0 && (
                        <div className="h-24 border-2 border-dashed border-gray-800 rounded-xl flex items-center justify-center text-gray-600 text-xs italic">
                            Nenhuma tarefa aqui
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-cyan-400">Gestão de Tarefas</h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar tarefas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-[#0F1629]/50 border border-cyan-500/10 rounded-xl text-sm text-gray-200 focus:ring-2 focus:ring-cyan-500 w-full md:w-64"
                        />
                    </div>

                    <div className="flex items-center gap-2 bg-[#0F1629]/50 border border-cyan-500/10 rounded-xl px-3 py-1">
                        <Calendar className="w-4 h-4 text-cyan-500" />
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent text-xs text-gray-300 focus:outline-none"
                                title="Data inicial"
                            />
                            <span className="text-gray-600 font-bold">à</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent text-xs text-gray-300 focus:outline-none"
                                title="Data final"
                            />
                            {(startDate || endDate) && (
                                <button
                                    onClick={() => { setStartDate(''); setEndDate(''); }}
                                    className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase ml-1"
                                >
                                    Limpar
                                </button>
                            )}
                        </div>
                    </div>

                    {permissions?.editar && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 transition-all font-bold"
                        >
                            <Plus className="w-5 h-5" />
                            Nova Tarefa
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
                <StatusColumn
                    status="Pendente"
                    title="Pendentes"
                    color="from-red-500/10"
                />
                <StatusColumn
                    status="Em Andamento"
                    title="Em Andamento"
                    color="from-yellow-500/10"
                />
                <StatusColumn
                    status="Concluída"
                    title="Concluídas"
                    color="from-green-500/10"
                />
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingTask ? "Editar Tarefa" : "Cadastrar Nova Tarefa"}
            >
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Título da Tarefa</label>
                        <input
                            type="text"
                            required
                            value={formData.titulo}
                            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                            placeholder="Ex: Entrevista técnica..."
                            className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Descrição</label>
                        <textarea
                            rows={3}
                            value={formData.descricao || ''}
                            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                            placeholder="Detalhes sobre a tarefa..."
                            className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500 transition-all resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Funcionário Relacionado</label>
                            <select
                                value={formData.funcionario_id || ''}
                                onChange={(e) => setFormData({ ...formData, funcionario_id: e.target.value || null })}
                                className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500 transition-all"
                            >
                                <option value="">Nenhum</option>
                                {funcionarios.map(f => (
                                    <option key={f.id} value={f.id}>{f.nome}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tipo</label>
                            <select
                                value={formData.tipo}
                                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TaskType })}
                                className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500 transition-all"
                            >
                                <option value="Geral">Geral</option>
                                <option value="Entrevista">Entrevista</option>
                                <option value="Feedback">Feedback</option>
                                <option value="Treinamento">Treinamento</option>
                                <option value="Documentação">Documentação</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Prioridade</label>
                            <select
                                value={formData.prioridade}
                                onChange={(e) => setFormData({ ...formData, prioridade: e.target.value as TaskPriority })}
                                className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500 transition-all"
                            >
                                <option value="Baixa">Baixa</option>
                                <option value="Média">Média</option>
                                <option value="Alta">Alta</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Vencimento</label>
                            <input
                                type="date"
                                required
                                value={formData.data_vencimento}
                                onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                                className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500 transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Status</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                            className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500 transition-all"
                        >
                            <option value="Pendente">Pendente</option>
                            <option value="Em Andamento">Em Andamento</option>
                            <option value="Concluída">Concluída</option>
                        </select>
                    </div>

                    <div className="flex gap-3 pt-6">
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            className="flex-1 px-4 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all font-semibold"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white rounded-xl shadow-lg shadow-cyan-500/30 transition-all font-bold"
                        >
                            {editingTask ? "Salvar Alterações" : "Criar Tarefa"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
