import { useState, useEffect } from 'react';
import {
    Plus, Search, Filter, Users, Loader2, FileText,
    MapPin, Briefcase, Mail, Phone, Tag,
    ChevronRight, Upload, Bot, History, MessageSquare,
    Trash2, Edit2, ExternalLink, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import type { Candidato, Cargo } from '../types';

export const BancoTalentos = ({ permissions }: { permissions: any }) => {
    const { showToast, confirm: confirmAction } = useNotification();
    const [candidatos, setCandidatos] = useState<Candidato[]>([]);
    const [cargos, setCargos] = useState<Cargo[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [selectedCandidato, setSelectedCandidato] = useState<Candidato | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');
    const [profileTab, setProfileTab] = useState<'geral' | 'entrevistas' | 'documentos'>('geral');
    const [extractedData, setExtractedData] = useState<any>(null);

    // Form States
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        telefone: '',
        cidade: '',
        vaga_interesse: '',
        status: 'disponivel' as any,
        fonte: '',
        escolaridade: '',
        tags: [] as string[],
        observacoes: '',
        resumo_ia: '',
        novoTag: ''
    });

    useEffect(() => {
        fetchCandidatos();
    }, []);

    const fetchCandidatos = async () => {
        try {
            const [candidatosRes, cargosRes] = await Promise.all([
                supabase
                    .from('candidatos')
                    .select('*, entrevistas:candidato_entrevistas(*), anexos:candidato_anexos(*)')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('cargos')
                    .select('*')
                    .order('nome')
            ]);

            if (candidatosRes.error) throw candidatosRes.error;
            if (cargosRes.error) throw cargosRes.error;

            setCandidatos(candidatosRes.data || []);
            setCargos(cargosRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            showToast('Erro ao carregar dados', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        // Implement semantic search here or just local filtering for now
        fetchCandidatos();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                nome: formData.nome,
                email: formData.email || null,
                telefone: formData.telefone || null,
                cidade: formData.cidade || null,
                vaga_interesse: formData.vaga_interesse || null,
                status: formData.status,
                fonte: formData.fonte || null,
                escolaridade: formData.escolaridade || null,
                tags: formData.tags,
                observacoes: formData.observacoes || null,
                resumo_ia: formData.resumo_ia || null,
                dados_estruturados: extractedData || selectedCandidato?.dados_estruturados || {}
            };

            if (selectedCandidato && !isModalOpen) {
                // This shouldn't happen based on the logic below, but just in case
            } else if (selectedCandidato) {
                const { error } = await supabase
                    .from('candidatos')
                    .update(payload)
                    .eq('id', selectedCandidato.id);
                if (error) throw error;
                showToast('Candidato atualizado com sucesso!', 'success');
            } else {
                const { error } = await supabase
                    .from('candidatos')
                    .insert([payload]);
                if (error) throw error;
                showToast('Candidato cadastrado com sucesso!', 'success');
            }

            handleCloseModal();
            fetchCandidatos();
        } catch (error) {
            console.error('Error saving candidato:', error);
            showToast('Erro ao salvar candidato', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirmAction({
            title: 'Excluir Candidato',
            message: 'Tem certeza que deseja remover este candidato do banco de talentos? Esta ação não pode ser desfeita.',
            variant: 'danger'
        });

        if (confirmed) {
            try {
                const { error } = await supabase
                    .from('candidatos')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
                showToast('Candidato removido', 'success');
                fetchCandidatos();
            } catch (error) {
                console.error('Error deleting candidato:', error);
                showToast('Erro ao excluir candidato', 'error');
            }
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        setActiveTab('manual');

        try {
            const formDataToUpload = new FormData();
            formDataToUpload.append('file', file);

            const { data, error } = await supabase.functions.invoke('analisar-curriculo', {
                body: formDataToUpload,
            });

            if (error) throw error;

            if (data) {
                setExtractedData(data);
                setFormData(prev => ({
                    ...prev,
                    nome: data.nome || prev.nome,
                    email: data.email || prev.email,
                    telefone: data.telefone || prev.telefone,
                    cidade: data.cidade || prev.cidade,
                    escolaridade: data.escolaridade || prev.escolaridade,
                    tags: data.tags || prev.tags,
                    resumo_ia: data.resumo_ia || prev.resumo_ia,
                    observacoes: prev.observacoes // Leave it for the recruiter
                }));
                showToast('Currículo analisado com éxito pela IA!', 'success');
            }
        } catch (error: any) {
            console.error('Error analyzing file:', error);
            showToast('Erro ao analisar currículo: ' + (error.message || 'Falha na comunicação com a IA'), 'error');
        } finally {
            setIsAnalyzing(false);
            // Reset input
            if (e.target) e.target.value = '';
        }
    };

    const handleOpenModal = (candidato: Candidato | null = null) => {
        if (candidato) {
            setSelectedCandidato(candidato);
            setFormData({
                nome: candidato.nome,
                email: candidato.email || '',
                telefone: candidato.telefone || '',
                cidade: candidato.cidade || '',
                vaga_interesse: candidato.vaga_interesse || '',
                status: candidato.status,
                fonte: candidato.fonte || '',
                escolaridade: candidato.escolaridade || '',
                tags: candidato.tags || [],
                observacoes: candidato.observacoes || '',
                resumo_ia: candidato.resumo_ia || '',
                novoTag: ''
            });
            setActiveTab('manual');
        } else {
            setSelectedCandidato(null);
            setFormData({
                nome: '',
                email: '',
                telefone: '',
                cidade: '',
                vaga_interesse: '',
                status: 'disponivel',
                fonte: '',
                escolaridade: '',
                tags: [],
                observacoes: '',
                resumo_ia: '',
                novoTag: ''
            });
            setActiveTab('upload');
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedCandidato(null);
        setIsAnalyzing(false);
        setExtractedData(null);
    };

    const handleAddTag = () => {
        if (formData.novoTag.trim() && !formData.tags.includes(formData.novoTag.trim())) {
            setFormData({
                ...formData,
                tags: [...formData.tags, formData.novoTag.trim()],
                novoTag: ''
            });
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setFormData({
            ...formData,
            tags: formData.tags.filter(t => t !== tagToRemove)
        });
    };

    const filteredCandidatos = candidatos.filter(c => {
        const matchesSearch = c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.vaga_interesse?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === '' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-cyan-400 flex items-center gap-3">
                        <Users className="w-8 h-8" />
                        Banco de Talentos
                    </h1>
                </div>
                {permissions?.editar && (
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 transition-all transform hover:scale-105 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Novo Talento
                    </button>
                )}
            </div>

            <Card className="p-4 bg-[#0F1629]/50 border-cyan-500/10">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Busca inteligente (nome, vaga, habilidades ou linguagem natural...)"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full pl-12 pr-4 py-3 bg-[#0A0E27] border border-cyan-500/20 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
                        />
                    </div>
                    <div className="flex gap-4">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-3 bg-[#0A0E27] border border-cyan-500/20 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500/50 outline-none"
                        >
                            <option value="">Todos os Status</option>
                            <option value="disponivel">Disponível</option>
                            <option value="em_processo">Em Processo</option>
                            <option value="contratado">Contratado</option>
                            <option value="arquivado">Arquivado</option>
                        </select>
                        <button
                            onClick={handleSearch}
                            className="px-6 py-3 bg-[#151B2D] border border-cyan-500/30 text-cyan-400 rounded-xl hover:bg-cyan-500/10 transition-all font-semibold flex items-center gap-2"
                        >
                            <Filter className="w-4 h-4" />
                            Filtrar
                        </button>
                        <button
                            className="px-6 py-3 bg-cyan-500/10 text-cyan-400 rounded-xl hover:bg-cyan-500/20 transition-all font-semibold flex items-center gap-2 border border-cyan-500/30"
                            title="Busca Semântica por IA"
                        >
                            <Bot className="w-5 h-5 text-cyan-400 animate-pulse" />
                            IA
                        </button>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCandidatos.map((c) => (
                    <Card
                        key={c.id}
                        className="group p-6 hover:shadow-2xl hover:shadow-cyan-500/10 transition-all border-cyan-500/5 hover:border-cyan-500/20 cursor-pointer"
                        onClick={() => {
                            setSelectedCandidato(c);
                            setIsProfileOpen(true);
                            setProfileTab('geral');
                        }}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-cyan-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <Users className="w-7 h-7 text-white" />
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${c.status === 'disponivel' ? 'bg-green-500/20 text-green-400' :
                                c.status === 'em_processo' ? 'bg-blue-500/20 text-blue-400' :
                                    c.status === 'contratado' ? 'bg-purple-500/20 text-purple-400' :
                                        'bg-gray-500/20 text-gray-400'
                                }`}>
                                {c.status.replace('_', ' ')}
                            </div>
                        </div>

                        <div className="space-y-1 mb-4">
                            <h3 className="text-xl font-bold text-gray-100 group-hover:text-cyan-400 transition-colors truncate">
                                {c.nome}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Briefcase className="w-4 h-4 text-cyan-500" />
                                <span>{c.vaga_interesse || 'Não especificada'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <MapPin className="w-4 h-4 text-cyan-500" />
                                <span>{c.cidade || 'Local não informado'}</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                            {c.tags?.slice(0, 3).map((tag, i) => (
                                <span key={i} className="px-2 py-0.5 bg-[#151B2D] border border-cyan-500/20 rounded-md text-[10px] text-cyan-300 uppercase font-semibold">
                                    {tag}
                                </span>
                            ))}
                            {c.tags?.length > 3 && (
                                <span className="text-[10px] text-gray-500 font-bold">+{c.tags.length - 3}</span>
                            )}
                        </div>

                        <div className="pt-4 border-t border-cyan-500/10 flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                                <History className="w-3 h-3" />
                                <span>Atualizado: {new Date(c.updated_at).toLocaleDateString()}</span>
                            </div>
                            <button className="text-cyan-400 hover:underline flex items-center gap-1">
                                Perfil <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                    </Card>
                ))}
            </div>

            {filteredCandidatos.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-20 bg-[#0F1629]/50 rounded-2xl border border-dashed border-cyan-500/20">
                    <Users className="w-16 h-16 text-gray-700 mb-4" />
                    <p className="text-gray-400 text-lg">Nenhum talento encontrado com os filtros atuais.</p>
                </div>
            )}

            {/* Modal de Cadastro/Edição */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={selectedCandidato ? "Editar Talento" : "Novo Talento"}
                maxWidth="max-w-4xl"
                hideHeader
            >
                {/* Cabeçalho Minimalista */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/10 bg-[#0F1629] sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold text-cyan-400">
                            {selectedCandidato ? "Editar Talento" : "Novo Talento"}
                        </h2>
                        {!selectedCandidato && (
                            <div className="flex bg-[#0A0E27] rounded-lg p-1 border border-gray-700">
                                <button
                                    onClick={() => setActiveTab('upload')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'upload' ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                >
                                    Via Currículo
                                </button>
                                <button
                                    onClick={() => setActiveTab('manual')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'manual' ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                >
                                    Manual
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleCloseModal}
                        className="p-2 hover:bg-cyan-500/10 rounded-lg transition-colors text-gray-400 hover:text-cyan-400"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'upload' && !selectedCandidato && (
                        <div className="space-y-6">
                            <div
                                className="border-2 border-dashed border-cyan-500/30 rounded-2xl p-12 flex flex-col items-center justify-center bg-cyan-500/5 hover:bg-cyan-500/10 transition-all cursor-pointer relative"
                                onClick={() => document.getElementById('cv-upload')?.click()}
                            >
                                {isAnalyzing ? (
                                    <div className="text-center space-y-4">
                                        <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto" />
                                        <p className="text-lg font-bold text-cyan-400">Analisando Currículo com IA...</p>
                                        <p className="text-sm text-gray-400">Extraindo dados e estruturando o perfil...</p>
                                    </div>
                                ) : (
                                    <>
                                        <input
                                            type="file"
                                            id="cv-upload"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                            accept=".pdf,.docx,.doc"
                                        />
                                        <div className="w-20 h-20 bg-cyan-500/20 rounded-full flex items-center justify-center mb-4">
                                            <Upload className="w-10 h-10 text-cyan-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-200">Arraste seu currículo aqui</h3>
                                        <p className="text-gray-400 mb-6">Suporta PDF, DOCX ou DOC (Max 5MB)</p>
                                        <button className="px-6 py-2 bg-cyan-500 text-white font-bold rounded-lg shadow-lg shadow-cyan-500/30">
                                            Selecionar Arquivo
                                        </button>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                                <Bot className="w-10 h-10 text-cyan-400" />
                                <p className="text-sm text-gray-300">
                                    <span className="font-bold text-cyan-400">Dica da IA:</span> Nossa inteligência extrai automaticamente nome, contato, competências e última experiência, poupando seu tempo!
                                </p>
                            </div>
                        </div>
                    )}

                    {(activeTab === 'manual' || selectedCandidato) && (
                        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-2 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-cyan-400/80 uppercase tracking-wider">Dados Pessoais</h4>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1">Nome Completo</label>
                                        <input
                                            type="text"
                                            value={formData.nome}
                                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-[#0A0E27] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500/50 outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1">Email</label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-[#0A0E27] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500/50 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1">Telefone</label>
                                            <input
                                                type="text"
                                                value={formData.telefone}
                                                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-[#0A0E27] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500/50 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-cyan-400/80 uppercase tracking-wider">Perfil Profissional</h4>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1">Vaga de Interesse</label>
                                        <select
                                            value={formData.vaga_interesse}
                                            onChange={(e) => setFormData({ ...formData, vaga_interesse: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-[#0A0E27] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500/50 outline-none"
                                        >
                                            <option value="">Selecione um cargo...</option>
                                            {cargos.map(cargo => (
                                                <option key={cargo.id} value={cargo.nome}>
                                                    {cargo.nome}
                                                </option>
                                            ))}
                                            <option value="Outro">Outro / Não Listado</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1">Status</label>
                                            <select
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                                className="w-full px-4 py-2.5 bg-[#0A0E27] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500/50 outline-none"
                                            >
                                                <option value="disponivel">Disponível</option>
                                                <option value="em_processo">Em Processo</option>
                                                <option value="contratado">Contratado</option>
                                                <option value="arquivado">Arquivado</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1">Cidade</label>
                                            <input
                                                type="text"
                                                value={formData.cidade}
                                                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-[#0A0E27] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500/50 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1">Escolaridade / Formação (Um por linha)</label>
                                <textarea
                                    value={formData.escolaridade}
                                    onChange={(e) => setFormData({ ...formData, escolaridade: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-[#0A0E27] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500/50 outline-none h-24 resize-none custom-scrollbar"
                                    placeholder="• Graduação em Logística&#10;• Pós-graduação em Gestão"
                                />
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-cyan-400/80 uppercase tracking-wider">Habilidades & Competências</h4>
                                <div className="flex flex-wrap gap-2 mb-2 min-h-[40px] p-3 bg-[#0A0E27] border border-gray-700 rounded-xl">
                                    {formData.tags.map(tag => (
                                        <span key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-xs text-cyan-400 font-bold group">
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTag(tag)}
                                                className="hover:text-red-400 transition-colors"
                                            >
                                                <Plus className="w-3 h-3 rotate-45" />
                                            </button>
                                        </span>
                                    ))}
                                    {formData.tags.length === 0 && <span className="text-gray-500 text-xs italic">Nenhuma tag adicionada...</span>}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formData.novoTag}
                                        onChange={(e) => setFormData({ ...formData, novoTag: e.target.value })}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                        placeholder="Adicione uma competência (ex: Vendas, Liderança, React...)"
                                        className="flex-1 px-4 py-2.5 bg-[#0A0E27] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500/50 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddTag}
                                        className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-all"
                                    >
                                        Adicionar
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1">Observações da Entrevista / Resumo</label>
                                <textarea
                                    value={formData.observacoes}
                                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#0A0E27] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500/50 outline-none h-32 resize-none custom-scrollbar"
                                    placeholder="Registre aqui detalhes importantes sobre o candidato..."
                                />
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-gray-700">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-3 px-6 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 transition-all"
                                >
                                    {selectedCandidato ? "Salvar Alterações" : "Cadastrar Talento"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </Modal>

            {/* Modal Perfil 360° */}
            <Modal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                title={`Perfil 360°: ${selectedCandidato?.nome}`}
                maxWidth="max-w-5xl"
            >
                {selectedCandidato && (
                    <div className="flex flex-col h-[75vh]">
                        <div className="flex flex-col lg:flex-row gap-8 mb-8">
                            <div className="w-32 h-32 bg-gradient-to-br from-cyan-400 to-cyan-700 rounded-3xl flex items-center justify-center shadow-2xl flex-shrink-0">
                                <Users className="w-16 h-16 text-white" />
                            </div>
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-3xl font-bold text-gray-100">{selectedCandidato.nome}</h2>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setIsProfileOpen(false);
                                                handleOpenModal(selectedCandidato);
                                            }}
                                            className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg hover:bg-cyan-500/20 border border-cyan-500/20"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsProfileOpen(false);
                                                handleDelete(selectedCandidato.id);
                                            }}
                                            className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 border border-red-500/20"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-6 text-sm">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Mail className="w-4 h-4 text-cyan-500 font-bold" />
                                        <span>{selectedCandidato.email || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Phone className="w-4 h-4 text-cyan-500" />
                                        <span>{selectedCandidato.telefone || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <MapPin className="w-4 h-4 text-cyan-500" />
                                        <span>{selectedCandidato.cidade || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Briefcase className="w-4 h-4 text-cyan-500" />
                                        <span>{selectedCandidato.vaga_interesse || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Tag className="w-4 h-4 text-cyan-500" />
                                        <span>Fonte: {selectedCandidato.fonte || 'Direto'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Bot className="w-4 h-4 text-cyan-500" />
                                        <span className="text-cyan-400 font-bold uppercase text-[10px]">Analisado por IA</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex border-b border-gray-700 mb-6">
                            <button
                                onClick={() => setProfileTab('geral')}
                                className={`px-6 py-3 font-bold transition-all border-b-2 ${profileTab === 'geral' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                            >
                                <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Geral</span>
                            </button>
                            <button
                                onClick={() => setProfileTab('entrevistas')}
                                className={`px-6 py-3 font-bold transition-all border-b-2 ${profileTab === 'entrevistas' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                            >
                                <span className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Entrevistas</span>
                            </button>
                            <button
                                onClick={() => setProfileTab('documentos')}
                                className={`px-6 py-3 font-bold transition-all border-b-2 ${profileTab === 'documentos' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                            >
                                <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Documentos</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {profileTab === 'geral' && (
                                <div className="space-y-8 pb-6">
                                    <section>
                                        <h4 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
                                            <Briefcase className="w-5 h-5 text-cyan-400" />
                                            Experiência Profissional
                                        </h4>
                                        <div className="p-6 bg-[#0A0E27] border border-cyan-500/10 rounded-2xl text-gray-300 leading-relaxed whitespace-pre-wrap shadow-inner">
                                            {selectedCandidato.dados_estruturados?.experiencia || 'Nenhuma experiência detalhada registrada.'}
                                        </div>
                                    </section>

                                    <section>
                                        <h4 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
                                            <History className="w-5 h-5 text-cyan-400" />
                                            Resumo & Observações
                                        </h4>
                                        <div className="p-6 bg-[#0A0E27] border border-cyan-500/10 rounded-2xl text-gray-300 leading-relaxed whitespace-pre-wrap shadow-inner">
                                            {selectedCandidato.observacoes || 'Nenhuma observação registrada.'}
                                        </div>
                                    </section>

                                    <section>
                                        <h4 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
                                            <Tag className="w-5 h-5 text-cyan-400" />
                                            Competências & Skills
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedCandidato.tags?.map(tag => (
                                                <span key={tag} className="px-4 py-1.5 bg-gradient-to-r from-cyan-500/10 to-cyan-600/10 border border-cyan-500/30 rounded-xl text-sm text-cyan-400 font-bold shadow-sm">
                                                    {tag}
                                                </span>
                                            ))}
                                            {selectedCandidato.tags?.length === 0 && <p className="text-gray-500 italic">Nenhuma skill listada.</p>}
                                        </div>
                                    </section>

                                    <section className="bg-cyan-500/5 p-6 rounded-2xl border border-cyan-500/10">
                                        <h4 className="text-lg font-bold text-cyan-400 mb-3 flex items-center gap-2">
                                            <Bot className="w-6 h-6" />
                                            Análise Inteligente
                                        </h4>
                                        <p className="text-sm text-gray-400 leading-relaxed">
                                            {selectedCandidato.resumo_ia || "Este perfil foi importado via cadastro manual. Para obter uma análise de IA completa, anexe o currículo do candidato no cadastro e execute o analisador inteligente."}
                                        </p>
                                    </section>
                                </div>
                            )}

                            {profileTab === 'entrevistas' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-lg font-bold text-gray-200">Histórico de Processos</h4>
                                        <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-all font-bold text-sm">
                                            <Plus className="w-4 h-4" /> Nova Anotação
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {selectedCandidato.entrevistas?.map((ent, i) => (
                                            <div key={i} className="p-5 bg-[#0A0E27] border border-cyan-500/10 rounded-2xl hover:border-cyan-500/30 transition-all shadow-md">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-sm font-bold text-cyan-400">Entrevista Técnica</span>
                                                    <span className="text-xs text-gray-500 font-semibold">{new Date(ent.data_entrevista).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-sm text-gray-300 mb-4">{ent.notas}</p>
                                                <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                                                    <span className="text-xs text-gray-500 italic">Entrevistador: {ent.recrutador_id ? 'Lucas Pereira' : 'Sistema'}</span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ent.resultado === 'Aprovado' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                                        {ent.resultado || 'Pendente'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        {(!selectedCandidato.entrevistas || selectedCandidato.entrevistas.length === 0) && (
                                            <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-[#0F1629]/30 rounded-2xl border border-dashed border-gray-800">
                                                <MessageSquare className="w-12 h-12 mb-3" />
                                                <p>Nenhuma entrevista registrada para este candidato.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {profileTab === 'documentos' && (
                                <div className="space-y-4">
                                    <h4 className="text-lg font-bold text-gray-200 mb-4">Arquivos & Anexos</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-[#0A0E27] border border-cyan-500/10 rounded-2xl flex items-center justify-between group hover:border-cyan-500/30 transition-all shadow-md">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-red-500/10 text-red-400 rounded-xl group-hover:bg-red-500/20 transition-colors">
                                                    <FileText className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-bold text-gray-200">Curriculo_Vendedor.pdf</h5>
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Currículo Original</p>
                                                </div>
                                            </div>
                                            <button className="p-2 text-gray-400 hover:text-cyan-400 transition-colors">
                                                <ExternalLink className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-8 border-2 border-dashed border-gray-700 rounded-2xl flex flex-col items-center justify-center bg-gray-800/20 hover:bg-gray-800/30 transition-all cursor-pointer">
                                        <Plus className="w-10 h-10 text-gray-600 mb-2" />
                                        <p className="text-gray-500 font-semibold">Adicionar Anexo</p>
                                        <p className="text-[10px] text-gray-600 uppercase mt-1">PDF, PNG, JPG até 10MB</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
