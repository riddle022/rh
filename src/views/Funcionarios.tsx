import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Loader2, Search, Calendar, DollarSign, Clock, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import type { Funcionario, Filial, Setor, Departamento, Cargo } from '../types';

export const Funcionarios = ({ onViewChange, permissions }: { onViewChange: (view: string) => void, permissions: any }) => {
    const { showToast, confirm: confirmAction } = useNotification();
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [filiais, setFiliais] = useState<Filial[]>([]);
    const [setores, setSetores] = useState<Setor[]>([]);
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [cargos, setCargos] = useState<Cargo[]>([]);
    const [filteredSetores, setFilteredSetores] = useState<Setor[]>([]);
    const [filteredCargos, setFilteredCargos] = useState<Cargo[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'geral' | 'financeiro' | 'ocorrencias'>('geral');

    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        filial_id: '',
        setor_id: '',
        departamento_id: '',
        cargo_id: '',
        salario_base: 0,
        data_admissao: new Date().toISOString().split('T')[0],
        data_desvinculamento: '',
        regime_contratacao: 'CLT' as 'CLT' | 'PJ' | 'Estágio',
        sexo: '',
        documento: '',
        cpf: '',
        pix: '',
        data_nascimento: '',
        celular: '',
        contato_emergencia_nome: '',
        contato_emergencia_parentesco: '',
        contato_emergencia_telefone: '',
        plano_saude: false,
        ativo: true,
        horas_extras_registro: '',
        ocorrencias: '',
        ferias_inicio: '',
        ferias_fim: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (formData.filial_id) {
            const filtered = setores.filter(s => s.filial_id === formData.filial_id && s.tipo === 'vendas');
            setFilteredSetores(filtered);
        } else {
            setFilteredSetores([]);
        }
    }, [formData.filial_id, setores]);

    useEffect(() => {
        if (formData.departamento_id) {
            const filtered = cargos.filter(c => c.departamento_id === formData.departamento_id);
            setFilteredCargos(filtered);
        } else {
            setFilteredCargos([]);
        }
    }, [formData.departamento_id, cargos]);

    const fetchData = async () => {
        try {
            const [funcionariosRes, filiaisRes, setoresRes, deptsRes, cargosRes] = await Promise.all([
                supabase
                    .from('funcionarios')
                    .select('*, filial:filiais(*), setor:setores(*), departamento:departamentos(*), cargo_rel:cargos(*)')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('filiais')
                    .select('*')
                    .order('nome'),
                supabase
                    .from('setores')
                    .select('*')
                    .order('nome'),
                supabase
                    .from('departamentos')
                    .select('*')
                    .order('nome'),
                supabase
                    .from('cargos')
                    .select('*')
                    .order('nome')
            ]);

            if (funcionariosRes.error && funcionariosRes.error.code !== 'PGRST116') {
                console.warn('Funcionarios table might not exist yet, using mock data for UI demo');
                // If table doesn't exist, we'll keep empty or use initial state for UI design
            }

            setFuncionarios(funcionariosRes.data || []);
            setFiliais(filiaisRes.data || []);
            setSetores(setoresRes.data || []);
            setDepartamentos(deptsRes.data || []);
            setCargos(cargosRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const sanitizePayload = (data: typeof formData) => {
        // Create a copy and remove any potential legacy fields that might leak in
        const { ...basePayload } = data;
        const payload: any = { ...basePayload };

        // Explicitly remove fields that are not in the DB
        delete payload.cargo;
        delete payload.vale_mercadoria_valor;
        delete payload.vale_mercadoria_parcelas;
        delete payload.vale_mercadoria_status;

        // Fields that must be null if empty
        const uuidFields = ['setor_id', 'departamento_id', 'cargo_id'] as const;
        uuidFields.forEach(field => {
            if (!payload[field]) {
                payload[field] = null;
            }
        });

        // Other optional strings
        const optionalStrings = ['email', 'data_desvinculamento', 'sexo', 'documento', 'cpf', 'pix', 'data_nascimento', 'celular', 'contato_emergencia_nome', 'contato_emergencia_parentesco', 'contato_emergencia_telefone', 'horas_extras_registro', 'ocorrencias', 'ferias_inicio', 'ferias_fim'] as const;
        optionalStrings.forEach(field => {
            if (!payload[field]) {
                payload[field] = null;
            }
        });

        return payload;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = sanitizePayload(formData);

            if (editingFuncionario) {
                const { error } = await supabase
                    .from('funcionarios')
                    .update(payload)
                    .eq('id', editingFuncionario.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('funcionarios')
                    .insert([payload]);
                if (error) throw error;
            }
            await fetchData();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving funcionario:', error);
            showToast('Erro ao salvar funcionário. Verifique os dados e tente novamente.', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirmAction({
            title: 'Excluir Funcionário',
            message: 'Tem certeza que deseja excluir este funcionário? Todos os dados vinculados serão mantidos ou removidos conforme a política do sistema.',
            variant: 'danger'
        });
        if (!confirmed) return;
        try {
            const { error } = await supabase
                .from('funcionarios')
                .delete()
                .eq('id', id);
            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error deleting funcionario:', error);
        }
    };

    const handleEdit = (f: Funcionario) => {
        setEditingFuncionario(f);
        setFormData({
            nome: f.nome,
            email: f.email || '',
            filial_id: f.filial_id,
            setor_id: f.setor_id || '',
            departamento_id: f.departamento_id || '',
            cargo_id: f.cargo_id || '',
            salario_base: f.salario_base,
            data_admissao: f.data_admissao,
            data_desvinculamento: f.data_desvinculamento || '',
            regime_contratacao: f.regime_contratacao as 'CLT' | 'PJ' | 'Estágio',
            sexo: f.sexo || '',
            documento: f.documento || '',
            cpf: f.cpf || '',
            pix: f.pix || '',
            data_nascimento: f.data_nascimento || '',
            celular: f.celular || '',
            contato_emergencia_nome: f.contato_emergencia_nome || '',
            contato_emergencia_parentesco: f.contato_emergencia_parentesco || '',
            contato_emergencia_telefone: f.contato_emergencia_telefone || '',
            plano_saude: f.plano_saude || false,
            ativo: f.ativo,
            horas_extras_registro: f.horas_extras_registro || '',
            ocorrencias: f.ocorrencias || '',
            ferias_inicio: f.ferias_inicio || '',
            ferias_fim: f.ferias_fim || '',
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingFuncionario(null);
        setActiveTab('geral');
        setFormData({
            nome: '',
            email: '',
            filial_id: '',
            setor_id: '',
            departamento_id: '',
            cargo_id: '',
            salario_base: 0,
            data_admissao: new Date().toISOString().split('T')[0],
            data_desvinculamento: '',
            regime_contratacao: 'CLT' as 'CLT' | 'PJ' | 'Estágio',
            sexo: '',
            documento: '',
            cpf: '',
            pix: '',
            data_nascimento: '',
            celular: '',
            contato_emergencia_nome: '',
            contato_emergencia_parentesco: '',
            contato_emergencia_telefone: '',
            plano_saude: false,
            ativo: true,
            horas_extras_registro: '',
            ocorrencias: '',
            ferias_inicio: '',
            ferias_fim: '',
        });
    };

    const filteredFuncionarios = funcionarios.filter(f =>
        f.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    <h1 className="text-3xl font-bold text-cyan-400">Funcionários</h1>
                    <p className="text-gray-400 mt-1">Gestão completa de pessoal e ficha técnica</p>
                </div>
                {permissions?.editar && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Novo Funcionário
                    </button>
                )}
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Buscar por nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-[#0F1629] border border-cyan-500/20 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFuncionarios.map((f) => (
                    <Card key={f.id} className="p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg">
                                    <Users className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-200">{f.nome}</h3>
                                    <p className="text-sm text-cyan-400/80">{f.cargo_rel?.nome || 'Sem cargo'}</p>
                                </div>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-semibold ${f.ativo ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {f.ativo ? 'Ativo' : 'Inativo'}
                            </div>
                        </div>

                        <div className="space-y-2 mb-6">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Calendar className="w-4 h-4" />
                                <span>Admissão: {new Date(f.data_admissao).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <DollarSign className="w-4 h-4" />
                                <span>Salário: {f.salario_base.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <button
                                onClick={() => onViewChange('escala')}
                                className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors py-1"
                            >
                                <Clock className="w-4 h-4" />
                                <span className="underline">Ver escala completa</span>
                            </button>
                        </div>

                        <div className="flex gap-2">
                            {permissions?.editar && (
                                <button
                                    onClick={() => handleEdit(f)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors border border-cyan-500/20"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Ficha Técnica
                                </button>
                            )}
                            {permissions?.excluir && (
                                <button
                                    onClick={() => handleDelete(f.id)}
                                    className="flex items-center justify-center p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                    title="Excluir"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingFuncionario ? `Ficha Técnica: ${editingFuncionario.nome}` : 'Novo Funcionário'}
            >
                <div className="flex border-b border-gray-700 mb-6">
                    <button
                        onClick={() => setActiveTab('geral')}
                        className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'geral' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                    >
                        Dados Gerais
                    </button>
                    <button
                        onClick={() => setActiveTab('financeiro')}
                        className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'financeiro' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                    >
                        Vales & Extras
                    </button>
                    <button
                        onClick={() => setActiveTab('ocorrencias')}
                        className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'ocorrencias' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                    >
                        Histórico & Férias
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {activeTab === 'geral' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Regime</label>
                                <select
                                    value={formData.regime_contratacao}
                                    onChange={(e) => setFormData({ ...formData, regime_contratacao: e.target.value as any })}
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500"
                                >
                                    <option value="CLT">CLT</option>
                                    <option value="PJ">PJ</option>
                                    <option value="Estágio">Estágio</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Filial</label>
                                <select
                                    value={formData.filial_id}
                                    onChange={(e) => setFormData({ ...formData, filial_id: e.target.value, setor_id: '' })}
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500"
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {filiais.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Setor (Vendas)</label>
                                <select
                                    value={formData.setor_id}
                                    onChange={(e) => setFormData({ ...formData, setor_id: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500"
                                    disabled={!formData.filial_id}
                                >
                                    <option value="">Nenhum (Operacional)</option>
                                    {filteredSetores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Departamento (Operacional)</label>
                                <select
                                    value={formData.departamento_id}
                                    onChange={(e) => setFormData({ ...formData, departamento_id: e.target.value, cargo_id: '' })}
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500"
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Cargo</label>
                                <select
                                    value={formData.cargo_id}
                                    onChange={(e) => {
                                        setFormData({ ...formData, cargo_id: e.target.value });
                                    }}
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500"
                                    required
                                    disabled={!formData.departamento_id}
                                >
                                    <option value="">Selecione...</option>
                                    {filteredCargos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Sexo</label>
                                <select
                                    value={formData.sexo}
                                    onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500"
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Feminino">Feminino</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Documento (RG)</label>
                                <input
                                    type="text"
                                    value={formData.documento}
                                    onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">CPF</label>
                                <input
                                    type="text"
                                    value={formData.cpf}
                                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500"
                                    placeholder="000.000.000-00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Chave PIX</label>
                                <input
                                    type="text"
                                    value={formData.pix}
                                    onChange={(e) => setFormData({ ...formData, pix: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Data de Nascimento</label>
                                <input
                                    type="date"
                                    value={formData.data_nascimento}
                                    onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Celular</label>
                                <input
                                    type="text"
                                    value={formData.celular}
                                    onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>

                            <div className="col-span-full border-t border-gray-700 pt-4 mt-2">
                                <h4 className="text-cyan-400 font-semibold mb-3">Contato de Emergência</h4>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Nome do Contato</label>
                                <input
                                    type="text"
                                    value={formData.contato_emergencia_nome}
                                    onChange={(e) => setFormData({ ...formData, contato_emergencia_nome: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Parentesco</label>
                                <input
                                    type="text"
                                    value={formData.contato_emergencia_parentesco}
                                    onChange={(e) => setFormData({ ...formData, contato_emergencia_parentesco: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500"
                                    placeholder="Ex: Pai, Mãe, Cônjuge"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Telefone do Contato</label>
                                <input
                                    type="text"
                                    value={formData.contato_emergencia_telefone}
                                    onChange={(e) => setFormData({ ...formData, contato_emergencia_telefone: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>

                            <div className="col-span-full border-t border-gray-700 pt-4 mt-2">
                                <h4 className="text-cyan-400 font-semibold mb-3">Saúde e Benefícios</h4>
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="plano_saude"
                                    checked={formData.plano_saude}
                                    onChange={(e) => setFormData({ ...formData, plano_saude: e.target.checked })}
                                    className="w-5 h-5 rounded border-gray-700 text-cyan-500"
                                />
                                <label htmlFor="plano_saude" className="text-sm font-medium text-gray-300">Possui Plano de Saúde?</label>
                            </div>

                            <div className="col-span-full border-t border-gray-700 pt-4 mt-2">
                                <h4 className="text-cyan-400 font-semibold mb-3">Datas e Desvinculamento</h4>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Data de Admissão</label>
                                <input
                                    type="date"
                                    value={formData.data_admissao}
                                    onChange={(e) => setFormData({ ...formData, data_admissao: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Data de Desvinculamento</label>
                                <input
                                    type="date"
                                    value={formData.data_desvinculamento}
                                    onChange={(e) => setFormData({ ...formData, data_desvinculamento: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="ativo"
                                    checked={formData.ativo}
                                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                                    className="w-5 h-5 rounded border-gray-700 text-cyan-500"
                                />
                                <label htmlFor="ativo" className="text-sm font-medium text-gray-300">Funcionário Ativo</label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'financeiro' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-cyan-500/5 rounded-lg border border-cyan-500/10">
                                <h4 className="text-cyan-400 font-semibold mb-1 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" /> Vales & Financeiro
                                </h4>
                                <p className="text-gray-400 text-sm">
                                    Para gerenciar os Vales Mercadoria deste funcionário, utilize a tela específica de
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleCloseModal();
                                            onViewChange('vale-mercadoria');
                                        }}
                                        className="text-cyan-400 hover:text-cyan-300 underline ml-1"
                                    >
                                        Gestão de Vales
                                    </button>.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Registro de Horas Extras
                                </label>
                                <textarea
                                    value={formData.horas_extras_registro}
                                    onChange={(e) => setFormData({ ...formData, horas_extras_registro: e.target.value })}
                                    placeholder="Descreva o controle de horas extras acumuladas ou pagas..."
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500 h-32 resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Salário Base (R$)</label>
                                <input
                                    type="number"
                                    value={formData.salario_base}
                                    onChange={(e) => setFormData({ ...formData, salario_base: Number(e.target.value) })}
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'ocorrencias' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-yellow-500/5 rounded-lg border border-yellow-500/10">
                                <h4 className="text-yellow-400 font-semibold mb-3 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> Controle de Férias
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Início das Férias</label>
                                        <input
                                            type="date"
                                            value={formData.ferias_inicio}
                                            onChange={(e) => setFormData({ ...formData, ferias_inicio: e.target.value })}
                                            className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-yellow-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Fim das Férias</label>
                                        <input
                                            type="date"
                                            value={formData.ferias_fim}
                                            onChange={(e) => setFormData({ ...formData, ferias_fim: e.target.value })}
                                            className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-yellow-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Histórico de Ocorrências
                                </label>
                                <textarea
                                    value={formData.ocorrencias}
                                    onChange={(e) => setFormData({ ...formData, ocorrencias: e.target.value })}
                                    placeholder="Advertências, suspensões, elogios, etc..."
                                    className="w-full px-4 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500 h-40 resize-none"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-6 border-t border-gray-700">
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white rounded-lg shadow-lg shadow-cyan-500/30 font-semibold"
                        >
                            {editingFuncionario ? 'Salvar Alterações' : 'Cadastrar Funcionário'}
                        </button>
                    </div>
                </form>
            </Modal>

            {filteredFuncionarios.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-20 bg-[#0F1629]/50 rounded-2xl border border-cyan-500/10">
                    <Users className="w-16 h-16 text-gray-600 mb-4" />
                    <p className="text-gray-400 text-lg">Nenhum funcionário encontrado.</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="mt-4 text-cyan-400 hover:text-cyan-300 font-medium underline"
                    >
                        Clique aqui para cadastrar o primeiro fucionário
                    </button>
                </div>
            )}
        </div>
    );
};
