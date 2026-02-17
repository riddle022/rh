import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Loader2, Search, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import type { Vendedor, Filial, Setor } from '../types';

export const Vendedores = ({ permissions }: { permissions: any }) => {
  const { confirm: confirmAction } = useNotification();
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [filteredSetores, setFilteredSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    filial_id: '',
    setor_id: '',
    ativo: true,
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


  const fetchData = async () => {
    try {
      const [vendedoresRes, filiaisRes, setoresRes] = await Promise.all([
        supabase
          .from('vendedores')
          .select('*, filial:filiais(*), setor:setores(*)')
          .order('created_at', { ascending: false }),
        supabase
          .from('filiais')
          .select('*')
          .order('nome'),
        supabase
          .from('setores')
          .select('*')
          .order('nome')
      ]);

      if (vendedoresRes.error) throw vendedoresRes.error;
      if (filiaisRes.error) throw filiaisRes.error;
      if (setoresRes.error) throw setoresRes.error;

      setVendedores(vendedoresRes.data || []);
      setFiliais(filiaisRes.data || []);
      setSetores(setoresRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingVendedor) {
        const { error } = await supabase
          .from('vendedores')
          .update(formData)
          .eq('id', editingVendedor.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vendedores')
          .insert([formData]);

        if (error) throw error;
      }

      await fetchData();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving vendedor:', error);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Excluir Vendedor',
      message: 'Tem certeza que deseja excluir este vendedor?',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('vendedores')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting vendedor:', error);
    }
  };

  const handleEdit = (vendedor: Vendedor) => {
    setEditingVendedor(vendedor);
    setFormData({
      nome: vendedor.nome,
      email: vendedor.email,
      filial_id: vendedor.filial_id,
      setor_id: vendedor.setor_id,
      ativo: vendedor.ativo,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVendedor(null);
    setFormData({
      nome: '',
      email: '',
      filial_id: '',
      setor_id: '',
      ativo: true,
    });
  };

  const filteredVendedores = vendedores.filter(v =>
    v.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalVendedores = vendedores.length;
  const ativos = vendedores.filter(v => v.ativo).length;
  const inativos = vendedores.filter(v => !v.ativo).length;

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
          <h1 className="text-3xl font-bold text-cyan-400">Vendedores</h1>
        </div>
        {permissions?.editar && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            Novo Vendedor
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-200">{totalVendedores}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/30">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Ativos</p>
              <p className="text-2xl font-bold text-green-400">{ativos}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30">
              <XCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Inativos</p>
              <p className="text-2xl font-bold text-red-400">{inativos}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-[#0F1629] border border-cyan-500/20 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendedores.map((vendedor) => (
          <Card key={vendedor.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-12 h-12 bg-gradient-to-br ${vendedor.ativo ? 'from-cyan-400 to-cyan-600' : 'from-gray-400 to-gray-600'} rounded-lg flex items-center justify-center shadow-lg ${vendedor.ativo ? 'shadow-cyan-500/30' : 'shadow-gray-500/30'}`}>
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-200 truncate">{vendedor.nome}</h3>
                  <p className="text-sm text-gray-400 truncate">{vendedor.email}</p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-semibold ${vendedor.ativo ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {vendedor.ativo ? 'Ativo' : 'Inativo'}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div>
                <p className="text-xs text-gray-400">Filial</p>
                <p className="text-sm text-gray-200">{vendedor.filial?.nome || 'Sem filial'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Setor</p>
                <p className="text-sm text-gray-200">{vendedor.setor?.nome || 'Sem setor'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <p className="text-sm text-gray-200">{vendedor.ativo ? 'Vendedor ativo' : 'Vendedor inativo'}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {permissions?.editar && (
                <button
                  onClick={() => handleEdit(vendedor)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
              )}
              {permissions?.excluir && (
                <button
                  onClick={() => handleDelete(vendedor.id)}
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

      {filteredVendedores.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">
            {searchTerm ? 'Nenhum vendedor encontrado' : 'Nenhum vendedor cadastrado'}
          </p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingVendedor ? 'Editar Vendedor' : 'Novo Vendedor'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome Completo
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
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Filial
            </label>
            <select
              value={formData.filial_id}
              onChange={(e) => setFormData({ ...formData, filial_id: e.target.value, setor_id: '' })}
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

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Setor
            </label>
            <select
              value={formData.setor_id}
              onChange={(e) => setFormData({ ...formData, setor_id: e.target.value })}
              className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              required
              disabled={!formData.filial_id}
            >
              <option value="">Selecione um setor</option>
              {filteredSetores.map((setor) => (
                <option key={setor.id} value={setor.id}>
                  {setor.nome}
                </option>
              ))}
            </select>
          </div>


          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="ativo"
              checked={formData.ativo}
              onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
              className="w-5 h-5 rounded bg-[#151B2D] border-gray-700 text-cyan-500 focus:ring-2 focus:ring-cyan-500"
            />
            <label htmlFor="ativo" className="text-sm font-medium text-gray-300">
              Vendedor Ativo
            </label>
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
              {editingVendedor ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
