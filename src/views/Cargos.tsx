import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Briefcase, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import type { Cargo, Departamento } from '../types';

export const Cargos = ({ permissions }: { permissions: any }) => {
    const { showToast, confirm: confirmAction } = useNotification();
    const [cargos, setCargos] = useState<Cargo[]>([]);
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCargo, setEditingCargo] = useState<Cargo | null>(null);
    const [formData, setFormData] = useState({
        nome: '',
        departamento_id: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [cargosRes, deptsRes] = await Promise.all([
                supabase
                    .from('cargos')
                    .select('*, departamento:departamentos(*)')
                    .order('nome'),
                supabase
                    .from('departamentos')
                    .select('*')
                    .order('nome')
            ]);

            if (cargosRes.error) throw cargosRes.error;
            if (deptsRes.error) throw deptsRes.error;

            setCargos(cargosRes.data || []);
            setDepartamentos(deptsRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCargo) {
                const { error } = await supabase
                    .from('cargos')
                    .update(formData)
                    .eq('id', editingCargo.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('cargos')
                    .insert([formData]);
                if (error) throw error;
            }
            await fetchData();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving cargo:', error);
            showToast('Erro ao salvar cargo.', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirmAction({
            title: 'Excluir Cargo',
            message: 'Tem certeza que deseja excluir este cargo?',
            variant: 'danger'
        });
        if (!confirmed) return;
        try {
            const { error } = await supabase
                .from('cargos')
                .delete()
                .eq('id', id);
            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error deleting cargo:', error);
            showToast('Não é possível excluir cargos que possuem funcionários vinculados.', 'warning');
        }
    };

    const handleEdit = (cargo: Cargo) => {
        setEditingCargo(cargo);
        setFormData({
            nome: cargo.nome,
            departamento_id: cargo.departamento_id,
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCargo(null);
        setFormData({
            nome: '',
            departamento_id: '',
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
                    <h1 className="text-3xl font-bold text-cyan-400">Cargos</h1>
                    <p className="text-gray-400 mt-1">Gerencie as funções específicas (Consultor, Logística, etc.)</p>
                </div>
                {permissions?.editar && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 transition-all duration-200"
                    >
                        <Plus className="w-5 h-5" />
                        Novo Cargo
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cargos.map((cargo) => (
                    <Card key={cargo.id} className="p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30">
                                    <Briefcase className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-200">{cargo.nome}</h3>
                                    <p className="text-sm text-gray-400">
                                        {cargo.departamento?.nome || 'Sem departamento'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                            {permissions?.editar && (
                                <button
                                    onClick={() => handleEdit(cargo)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Editar
                                </button>
                            )}
                            {permissions?.excluir && (
                                <button
                                    onClick={() => handleDelete(cargo.id)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Excluir
                                </button>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            {cargos.length === 0 && (
                <div className="text-center py-12">
                    <Briefcase className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Nenhum cargo cadastrado</p>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingCargo ? 'Editar Cargo' : 'Novo Cargo'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Nome do Cargo
                        </label>
                        <input
                            type="text"
                            value={formData.nome}
                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                            className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            required
                            placeholder="Ex: Consultor de Vendas"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Departamento
                        </label>
                        <select
                            value={formData.departamento_id}
                            onChange={(e) => setFormData({ ...formData, departamento_id: e.target.value })}
                            className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            required
                        >
                            <option value="">Selecione um departamento</option>
                            {departamentos.map((dept) => (
                                <option key={dept.id} value={dept.id}>
                                    {dept.nome}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white rounded-lg shadow-lg shadow-cyan-500/30 transition-all"
                        >
                            {editingCargo ? 'Atualizar' : 'Criar'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
