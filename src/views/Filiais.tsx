import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import type { Filial } from '../types';

export const Filiais = ({ permissions }: { permissions: any }) => {
  const { showToast, confirm: confirmAction } = useNotification();
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFilial, setEditingFilial] = useState<Filial | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    meta_global: 0,
  });

  useEffect(() => {
    fetchFiliais();
  }, []);

  const fetchFiliais = async () => {
    try {
      const { data, error } = await supabase
        .from('filiais')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      setFiliais(data || []);
    } catch (error) {
      console.error('Error fetching filiais:', error);
      showToast('Erro ao carregar filiais.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingFilial) {
        const { error } = await supabase
          .from('filiais')
          .update(formData)
          .eq('id', editingFilial.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('filiais')
          .insert([formData]);

        if (error) throw error;
      }

      await fetchFiliais();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving filial:', error);
      showToast('Erro ao salvar filial.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Excluir Filial',
      message: 'Tem certeza que deseja excluir esta filial?',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('filiais')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchFiliais();
    } catch (error) {
      console.error('Error deleting filial:', error);
      showToast('Erro ao excluir filial.', 'error');
    }
  };

  const handleEdit = (filial: Filial) => {
    setEditingFilial(filial);
    setFormData({
      nome: filial.nome,
      endereco: filial.endereco,
      meta_global: filial.meta_global,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingFilial(null);
    setFormData({
      nome: '',
      endereco: '',
      meta_global: 0,
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
          <h1 className="text-3xl font-bold text-cyan-400">Filiais</h1>
        </div>
        {permissions?.editar && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            Nova Filial
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filiais.map((filial) => (
          <Card key={filial.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-200">{filial.nome}</h3>
                  <p className="text-sm text-gray-400">{filial.endereco}</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-1">Meta Global</p>
              <p className="text-2xl font-bold text-cyan-400">
                R$ {Number(filial.meta_global || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="flex gap-2">
              {permissions?.editar && (
                <button
                  onClick={() => handleEdit(filial)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
              )}
              {permissions?.excluir && (
                <button
                  onClick={() => handleDelete(filial.id)}
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

      {filiais.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Nenhuma filial cadastrada</p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingFilial ? 'Editar Filial' : 'Nova Filial'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome da Filial
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Endereço
            </label>
            <input
              type="text"
              value={formData.endereco}
              onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Meta Global (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.meta_global}
              onChange={(e) => setFormData({ ...formData, meta_global: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              required
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
              {editingFilial ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
