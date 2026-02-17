import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import type { Departamento } from '../types';

export const Departamentos = ({ permissions }: { permissions: any }) => {
    const { showToast, confirm: confirmAction } = useNotification();
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<Departamento | null>(null);
    const [formData, setFormData] = useState({
        nome: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const deptsRes = await supabase
                .from('departamentos')
                .select('*')
                .order('nome');

            if (deptsRes.error) throw deptsRes.error;
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
            if (editingDept) {
                const { error } = await supabase
                    .from('departamentos')
                    .update(formData)
                    .eq('id', editingDept.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('departamentos')
                    .insert([formData]);
                if (error) throw error;
            }
            await fetchData();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving departamento:', error);
            showToast('Erro ao salvar departamento.', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirmAction({
            title: 'Excluir Departamento',
            message: 'Tem certeza que deseja excluir este departamento?',
            variant: 'danger'
        });
        if (!confirmed) return;
        try {
            const { error } = await supabase
                .from('departamentos')
                .delete()
                .eq('id', id);
            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error deleting departamento:', error);
            showToast('Não é possível excluir departamentos que possuem cargos ou funcionários vinculados.', 'warning');
        }
    };

    const handleEdit = (dept: Departamento) => {
        setEditingDept(dept);
        setFormData({
            nome: dept.nome,
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingDept(null);
        setFormData({
            nome: '',
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
                    <h1 className="text-3xl font-bold text-cyan-400">Departamentos</h1>
                </div>
                {permissions?.editar && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 transition-all duration-200"
                    >
                        <Plus className="w-5 h-5" />
                        Novo Departamento
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departamentos.map((dept) => (
                    <Card key={dept.id} className="p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30">
                                    <Building2 className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-200">{dept.nome}</h3>
                                    <p className="text-sm text-gray-500 uppercase font-semibold">
                                        Departamento Global
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                            {permissions?.editar && (
                                <button
                                    onClick={() => handleEdit(dept)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Editar
                                </button>
                            )}
                            {permissions?.excluir && (
                                <button
                                    onClick={() => handleDelete(dept.id)}
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

            {departamentos.length === 0 && (
                <div className="text-center py-12">
                    <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Nenhum departamento cadastrado</p>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingDept ? 'Editar Departamento' : 'Novo Departamento'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Nome do Departamento
                        </label>
                        <input
                            type="text"
                            value={formData.nome}
                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                            className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            required
                            placeholder="Ex: Administrativo"
                        />
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
                            {editingDept ? 'Atualizar' : 'Criar'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
