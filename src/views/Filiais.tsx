import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building2, Loader2, Target, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import type { Filial, FilialMetaMensal } from '../types';

export const Filiais = ({ permissions }: { permissions: any }) => {
  const { showToast, confirm: confirmAction } = useNotification();
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFilial, setEditingFilial] = useState<Filial | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
  });

  const [isMetasModalOpen, setIsMetasModalOpen] = useState(false);
  const [selectedFilialForMetas, setSelectedFilialForMetas] = useState<Filial | null>(null);
  const [metasMensais, setMetasMensais] = useState<FilialMetaMensal[]>([]);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [metaFormData, setMetaFormData] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    meta: 0,
    faturado: 0
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
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingFilial(null);
    setFormData({
      nome: '',
      endereco: '',
    });
  };

  const fetchMetasMensais = async (filialId: string) => {
    try {
      const { data, error } = await supabase
        .from('filial_metas_mensais')
        .select('*')
        .eq('filial_id', filialId)
        .order('ano', { ascending: false })
        .order('mes', { ascending: false });

      if (error) throw error;
      setMetasMensais(data || []);
    } catch (error) {
      console.error('Error fetching metas mensais:', error);
      showToast('Erro ao carregar metas mensais.', 'error');
    }
  };

  const handleMetasMensais = (filial: Filial) => {
    setSelectedFilialForMetas(filial);
    fetchMetasMensais(filial.id);
    setIsMetasModalOpen(true);
  };

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFilialForMetas) return;

    setIsSavingMeta(true);
    try {
      const { error } = await supabase
        .from('filial_metas_mensais')
        .upsert({
          filial_id: selectedFilialForMetas.id,
          ...metaFormData
        }, { onConflict: 'filial_id, mes, ano' });

      if (error) throw error;

      showToast('Meta salva com sucesso!', 'success');
      fetchMetasMensais(selectedFilialForMetas.id);
      setMetaFormData({
        ...metaFormData,
        meta: 0,
        faturado: 0
      });
    } catch (error) {
      console.error('Error saving meta mensal:', error);
      showToast('Erro ao salvar meta mensal.', 'error');
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleDeleteMeta = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Excluir Meta',
      message: 'Tem certeza que deseja excluir esta meta mensal?',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('filial_metas_mensais')
        .delete()
        .eq('id', id);

      if (error) throw error;
      if (selectedFilialForMetas) fetchMetasMensais(selectedFilialForMetas.id);
      showToast('Meta excluída com éxito.', 'success');
    } catch (error) {
      console.error('Error deleting meta mensal:', error);
      showToast('Erro ao excluir meta mensal.', 'error');
    }
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


            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                {permissions?.editar && (
                  <button
                    onClick={() => handleEdit(filial)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors border border-cyan-500/20"
                  >
                    <Edit2 className="w-4 h-4" />
                    Editar
                  </button>
                )}
                {permissions?.excluir && (
                  <button
                    onClick={() => handleDelete(filial.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>
                )}
              </div>
              <button
                onClick={() => handleMetasMensais(filial)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 transition-all font-bold shadow-lg shadow-cyan-500/20"
              >
                <Target className="w-4 h-4" />
                Metas Mensais
              </button>
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

      {/* Modal de Metas Mensais */}
      <Modal
        isOpen={isMetasModalOpen}
        onClose={() => setIsMetasModalOpen(false)}
        title={`Metas Mensais: ${selectedFilialForMetas?.nome}`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-6">
          <form onSubmit={handleSaveMeta} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#0A0E27] p-4 rounded-xl border border-cyan-500/10">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mês</label>
              <select
                value={metaFormData.mes}
                onChange={(e) => setMetaFormData({ ...metaFormData, mes: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2024, i).toLocaleString('pt-BR', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ano</label>
              <input
                type="number"
                value={metaFormData.ano}
                onChange={(e) => setMetaFormData({ ...metaFormData, ano: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Meta (R$)</label>
              <input
                type="number"
                step="0.01"
                value={metaFormData.meta}
                onChange={(e) => setMetaFormData({ ...metaFormData, meta: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isSavingMeta}
                className="w-full py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold rounded-lg shadow-lg shadow-cyan-500/30 transition-all disabled:opacity-50"
              >
                {isSavingMeta ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Definir Meta'}
              </button>
            </div>
          </form>

          <div className="overflow-hidden bg-[#0A0E27] border border-cyan-500/10 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-cyan-500/10 bg-cyan-500/5">
                  <th className="px-6 py-4 text-xs font-bold text-cyan-400 uppercase tracking-wider">Período</th>
                  <th className="px-6 py-4 text-xs font-bold text-cyan-400 uppercase tracking-wider">Meta Propuesta</th>
                  <th className="px-6 py-4 text-xs font-bold text-cyan-400 uppercase tracking-wider">Valor Facturado</th>
                  <th className="px-6 py-4 text-xs font-bold text-cyan-400 uppercase tracking-wider">Desempenho</th>
                  <th className="px-6 py-4 text-xs font-bold text-cyan-400 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/5">
                {metasMensais.map((meta) => {
                  const percent = meta.meta > 0 ? (meta.faturado / meta.meta) * 100 : 0;
                  const isAchieved = percent >= 100;

                  return (
                    <tr key={meta.id} className="hover:bg-cyan-500/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-cyan-400" />
                          <span className="font-bold text-gray-200">
                            {new Date(meta.ano, meta.mes - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-300 font-semibold">
                        R$ {meta.meta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={meta.faturado}
                          onBlur={async (e) => {
                            const newValue = parseFloat(e.target.value) || 0;
                            if (newValue !== meta.faturado) {
                              const { error } = await supabase
                                .from('filial_metas_mensais')
                                .update({ faturado: newValue })
                                .eq('id', meta.id);
                              if (!error) {
                                showToast('Faturamento atualizado!', 'success');
                                fetchMetasMensais(meta.filial_id);
                              }
                            }
                          }}
                          className="w-32 px-2 py-1 bg-[#151B2D] border border-gray-700 rounded text-gray-200 outline-none focus:ring-1 focus:ring-cyan-500/50"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className={isAchieved ? 'text-green-400' : 'text-cyan-400'}>
                              {percent.toFixed(1)}%
                            </span>
                            {isAchieved && <span className="text-green-400 uppercase">Meta Batida!</span>}
                          </div>
                          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${isAchieved ? 'bg-green-500' : 'bg-cyan-500'}`}
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteMeta(meta.id)}
                          className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {metasMensais.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                      Nenhuma meta mensal cadastrada para esta filial.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
};
