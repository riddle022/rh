import { useState } from 'react';
import {
    Plus,
    Search,
    Clock,
    Tag,
    MoreVertical,
    Users,
    MessageSquare,
    BookOpen,
    FileText
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';

type TaskStatus = 'Pendente' | 'Em Andamento' | 'Concluída';
type TaskPriority = 'Alta' | 'Média' | 'Baixa';
type TaskType = 'Entrevista' | 'Feedback' | 'Treinamento' | 'Documentação' | 'Geral';

interface Task {
    id: string;
    titulo: string;
    descricao: string;
    status: TaskStatus;
    prioridade: TaskPriority;
    tipo: TaskType;
    data_vencimento: string;
    funcionario_relacionado?: string;
}

const INITIAL_TASKS: Task[] = [
    {
        id: '1',
        titulo: 'Entrevista de Candidato - Desenvolvedor Fullstack',
        descricao: 'Segunda etapa técnica com o candidato João Silva.',
        status: 'Pendente',
        prioridade: 'Alta',
        tipo: 'Entrevista',
        data_vencimento: '2024-05-20',
    },
    {
        id: '2',
        titulo: 'Feedback Trimestral - Equipe Logística',
        descricao: 'Reunião de alinhamento e avaliação de desempenho.',
        status: 'Em Andamento',
        prioridade: 'Média',
        tipo: 'Feedback',
        data_vencimento: '2024-05-22',
    },
    {
        id: '3',
        titulo: 'Treinamento sobre Novos Procedimentos',
        descricao: 'Workshop para todos os funcionários sobre segurança e proteção de dados.',
        status: 'Concluída',
        prioridade: 'Baixa',
        tipo: 'Treinamento',
        data_vencimento: '2024-05-15',
    },
];

export const GestaoTarefas = ({ permissions }: { permissions: any }) => {
    const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [formData, setFormData] = useState<Partial<Task>>({
        titulo: '',
        descricao: '',
        status: 'Pendente',
        prioridade: 'Média',
        tipo: 'Geral',
        data_vencimento: new Date().toISOString().split('T')[0],
    });

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

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        const newTask: Task = {
            id: Math.random().toString(36).substr(2, 9),
            titulo: formData.titulo || '',
            descricao: formData.descricao || '',
            status: formData.status as TaskStatus,
            prioridade: formData.prioridade as TaskPriority,
            tipo: formData.tipo as TaskType,
            data_vencimento: formData.data_vencimento || new Date().toISOString().split('T')[0],
        };
        setTasks([...tasks, newTask]);
        setIsModalOpen(false);
        resetForm();
    };

    const resetForm = () => {
        setFormData({
            titulo: '',
            descricao: '',
            status: 'Pendente',
            prioridade: 'Média',
            tipo: 'Geral',
            data_vencimento: new Date().toISOString().split('T')[0],
        });
    };

    const filteredTasks = tasks.filter(t =>
        t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.descricao.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                        <button onClick={() => { setIsModalOpen(true); setFormData({ ...formData, status }); }} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
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
                                <button className="text-gray-600 hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </div>

                            <h4 className="text-sm font-bold text-gray-200 mb-2 leading-tight group-hover:text-cyan-400 transition-colors">
                                {task.titulo}
                            </h4>

                            <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                                {task.descricao}
                            </p>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                                <div className="flex items-center gap-2 text-cyan-400/60 font-semibold text-[10px] uppercase">
                                    {getTypeIcon(task.tipo)}
                                    <span>{task.tipo}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-500 text-[10px] font-medium">
                                    <Clock className="w-3 h-3" />
                                    {new Date(task.data_vencimento).toLocaleDateString('pt-BR')}
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

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-cyan-400">Gestão de Tarefas</h1>
                    <p className="text-gray-400 mt-1">Organize fluxos, entrevistas e acompanhamentos de RH</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar tarefas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-[#0F1629]/50 border border-cyan-500/10 rounded-xl text-sm text-gray-200 focus:ring-2 focus:ring-cyan-500 w-64"
                        />
                    </div>
                    {permissions?.editar && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 transition-all"
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
                onClose={() => { setIsModalOpen(false); resetForm(); }}
                title="Cadastrar Nova Tarefa"
            >
                <form onSubmit={handleAddTask} className="space-y-4 pt-2">
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
                            value={formData.descricao}
                            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                            placeholder="Detalhes sobre a tarefa..."
                            className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500 transition-all resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Estado Inicial</label>
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
                    </div>

                    <div className="flex gap-3 pt-6">
                        <button
                            type="button"
                            onClick={() => { setIsModalOpen(false); resetForm(); }}
                            className="flex-1 px-4 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all font-semibold"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white rounded-xl shadow-lg shadow-cyan-500/30 transition-all font-bold"
                        >
                            Criar Tarefa
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
