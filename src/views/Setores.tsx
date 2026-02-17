import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Network, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import type { Setor, Filial } from '../types';

export const Setores = ({ permissions }: { permissions: any }) => {
  const { showToast, confirm: confirmAction } = useNotification();
  const [setores, setSetores] = useState<Setor[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSetor, setEditingSetor] = useState<Setor | null>(null);
  const currentDate = new Date();
  const [formData, setFormData] = useState({
    nome: '',
    filial_id: '',
    tipo: 'vendas' as 'vendas',
    meta_mensal: 0,
    mes: currentDate.getMonth() + 1,
    ano: currentDate.getFullYear(),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [setoresRes, filiaisRes] = await Promise.all([
        supabase
          .from('setores')
          .select('*, filial:filiais(*)')
          .order('created_at', { ascending: false }),
        supabase
          .from('filiais')
          .select('*')
          .order('nome')
      ]);

      if (setoresRes.error) throw setoresRes.error;
      if (filiaisRes.error) throw filiaisRes.error;

      setSetores(setoresRes.data || []);
      setFiliais(filiaisRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingSetor) {
        const { error } = await supabase
          .from('setores')
          .update(formData)
          .eq('id', editingSetor.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('setores')
          .insert([formData]);

        if (error) throw error;
      }

      await fetchData();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving setor:', error);
      showToast('Erro ao salvar setor.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Excluir Setor',
      message: 'Tem certeza que deseja excluir este setor?',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('setores')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting setor:', error);
    }
  };

  const handleEdit = (setor: Setor) => {
    setEditingSetor(setor);
    setFormData({
      nome: setor.nome,
      filial_id: setor.filial_id,
      tipo: 'vendas',
      meta_mensal: setor.meta_mensal,
      mes: setor.mes,
      ano: setor.ano,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSetor(null);
    const currentDate = new Date();
    setFormData({
      nome: '',
      filial_id: '',
      tipo: 'vendas',
      meta_mensal: 0,
      mes: currentDate.getMonth() + 1,
      ano: currentDate.getFullYear(),
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
          <h1 className="text-3xl font-bold text-cyan-400">Setores</h1>
        </div>
        {permissions?.editar && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            Novo Setor
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {setores.map((setor) => (
          <Card key={setor.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Network className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-200">{setor.nome}</h3>
                  <p className="text-sm text-gray-400">
                    {setor.filial?.nome || 'Sem filial'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-500/20 text-green-400">
                  Vendas
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Meta Mensal</p>
                <p className="text-2xl font-bold text-cyan-400">
                  R$ {Number(setor.meta_mensal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">
                  Período: {setor.mes}/{setor.ano}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {permissions?.editar && (
                <button
                  onClick={() => handleEdit(setor)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
              )}
              {permissions?.excluir && (
                <button
                  onClick={() => handleDelete(setor.id)}
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

      {setores.length === 0 && (
        <div className="text-center py-12">
          <Network className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Nenhum setor cadastrado</p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingSetor ? 'Editar Setor' : 'Novo Setor'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome do Setor
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
              Tipo de Setor
            </label>
            <input
              type="text"
              value="Vendas (Comercial)"
              className="w-full px-4 py-3 bg-[#151B2D]/50 border border-gray-700 rounded-lg text-gray-400 focus:outline-none cursor-not-allowed"
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Filial
            </label>
            <select
              value={formData.filial_id}
              onChange={(e) => setFormData({ ...formData, filial_id: e.target.value })}
              className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              required
            >
              <option value="">Selecione uma filial</option>
              {filiais.map((filial) => (
                <option key={filial.id} value={filial.id}>
                  {filial.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mês
              </label>
              <select
                value={formData.mes}
                onChange={(e) => setFormData({ ...formData, mes: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                required
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ano
              </label>
              <input
                type="number"
                value={formData.ano}
                onChange={(e) => setFormData({ ...formData, ano: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Meta Mensal (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.meta_mensal}
              onChange={(e) => setFormData({ ...formData, meta_mensal: parseFloat(e.target.value) || 0 })}
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
              {editingSetor ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
