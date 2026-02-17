import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import type { Usuario, Grupo, Filial } from '../types';

export const Usuarios = ({ permissions }: { permissions: any }) => {
  const { showToast, confirm: confirmAction } = useNotification();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    grupo_id: '',
    filial_id: '',
    ativo: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usuariosRes, gruposRes, filiaisRes] = await Promise.all([
        supabase
          .from('usuarios')
          .select('*, grupo:grupos(*), filial:filiais(*)')
          .order('created_at', { ascending: false }),
        supabase
          .from('grupos')
          .select('*')
          .order('nome'),
        supabase
          .from('filiais')
          .select('*')
          .order('nome')
      ]);

      if (usuariosRes.error) throw usuariosRes.error;
      if (gruposRes.error) throw gruposRes.error;
      if (filiaisRes.error) throw filiaisRes.error;

      setUsuarios(usuariosRes.data || []);
      setGrupos(gruposRes.data || []);
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
      if (editingUsuario) {
        const { error } = await supabase
          .from('usuarios')
          .update({
            nome: formData.nome,
            email: formData.email,
            grupo_id: formData.grupo_id || null,
            filial_id: formData.filial_id || null,
            ativo: formData.ativo,
          })
          .eq('id', editingUsuario.id);

        if (error) throw error;
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: usuarioError } = await supabase
            .from('usuarios')
            .insert([{
              id: authData.user.id,
              nome: formData.nome,
              email: formData.email,
              grupo_id: formData.grupo_id || null,
              filial_id: formData.filial_id || null,
              ativo: formData.ativo,
            }]);

          if (usuarioError) throw usuarioError;
        }
      }

      await fetchData();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving usuario:', error);
      showToast('Erro ao salvar usuário. Verifique os dados e tente novamente.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Excluir Usuário',
      message: 'Tem certeza que desea excluir este usuário?',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting usuario:', error);
    }
  };

  const handleEdit = (usuario: Usuario) => {
    setEditingUsuario(usuario);
    setFormData({
      nome: usuario.nome,
      email: usuario.email,
      password: '',
      grupo_id: usuario.grupo_id || '',
      filial_id: usuario.filial_id || '',
      ativo: usuario.ativo,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUsuario(null);
    setFormData({
      nome: '',
      email: '',
      password: '',
      grupo_id: '',
      filial_id: '',
      ativo: true,
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
          <h1 className="text-3xl font-bold text-cyan-400">Usuários</h1>
          <p className="text-gray-400 mt-1">Gerencie os usuários do sistema</p>
        </div>
        {permissions?.editar && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            Novo Usuário
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {usuarios.map((usuario) => (
          <Card key={usuario.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-12 h-12 bg-gradient-to-br ${usuario.ativo ? 'from-cyan-400 to-cyan-600' : 'from-gray-400 to-gray-600'} rounded-lg flex items-center justify-center shadow-lg ${usuario.ativo ? 'shadow-cyan-500/30' : 'shadow-gray-500/30'}`}>
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-200 truncate">{usuario.nome}</h3>
                  <p className="text-sm text-gray-400 truncate">{usuario.email}</p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-semibold ${usuario.ativo ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {usuario.ativo ? 'Ativo' : 'Inativo'}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div>
                <p className="text-xs text-gray-400">Grupo</p>
                <p className="text-sm text-gray-200">{usuario.grupo?.nome || 'Sem grupo'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Filial</p>
                <p className="text-sm text-gray-200">{usuario.filial?.nome || 'Sem filial'}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {permissions?.editar && (
                <button
                  onClick={() => handleEdit(usuario)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
              )}
              {permissions?.excluir && (
                <button
                  onClick={() => handleDelete(usuario.id)}
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

      {usuarios.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Nenhum usuário cadastrado</p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}
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
              disabled={!!editingUsuario}
            />
          </div>

          {!editingUsuario && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Senha
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                required
                minLength={6}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Grupo
            </label>
            <select
              value={formData.grupo_id}
              onChange={(e) => setFormData({ ...formData, grupo_id: e.target.value })}
              className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="">Selecione um grupo</option>
              {grupos.map((grupo) => (
                <option key={grupo.id} value={grupo.id}>
                  {grupo.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Filial
            </label>
            <select
              value={formData.filial_id}
              onChange={(e) => setFormData({ ...formData, filial_id: e.target.value })}
              className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="">Selecione uma filial</option>
              {filiais.map((filial) => (
                <option key={filial.id} value={filial.id}>
                  {filial.nome}
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
              Usuário Ativo
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
              {editingUsuario ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>
    </div >
  );
};
