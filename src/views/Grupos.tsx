import { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  UserCog,
  Loader2,
  ChevronDown,
  ChevronRight,
  Shield,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import type { Grupo } from '../types';

const MENU_STRUCTURE = [
  {
    id: 'geral',
    label: 'Geral',
    items: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'tarefas', label: 'Gestão de Tarefas' },
      { id: 'escala', label: 'Escalas' },
    ]
  },
  {
    id: 'empresa',
    label: 'Gerenciador Empresa',
    items: [
      { id: 'funcionarios', label: 'Funcionários' },
      { id: 'cargos', label: 'Cargos' },
      { id: 'departamentos', label: 'Departamentos' },
      { id: 'filiais', label: 'Filiais' },
      { id: 'grupos', label: 'Grupos' },
      { id: 'usuarios', label: 'Usuários' },
    ]
  },
  {
    id: 'vendas',
    label: 'Gerenciador de Vendas',
    items: [
      { id: 'vendedores', label: 'Vendedores' },
      { id: 'setores', label: 'Setores' },
      { id: 'carregar-vendas', label: 'Carregar Vendas' },
      { id: 'metas', label: 'Metas' },
      { id: 'comissoes', label: 'Comissões' },
    ]
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    items: [
      { id: 'vale-mercadoria', label: 'Vale Mercadoria' },
      { id: 'horas-extras', label: 'Horas Extras' },
    ]
  },
  {
    id: 'ia',
    label: 'RH Inteligente (IA)',
    items: [
      { id: 'analise-curriculos', label: 'Analisador de CV' },
      { id: 'banco-talentos', label: 'Banco de Talentos' },
      { id: 'assistente-ia', label: 'Assistente IA' },
    ]
  }
];

const DEFAULT_PERMISSIONS = () => {
  const perms: Record<string, any> = { admin: false, dashboard: { ver: true, editar: false, excluir: false } };
  MENU_STRUCTURE.forEach(cat => {
    cat.items.forEach(item => {
      perms[item.id] = { ver: false, editar: false, excluir: false };
    });
  });
  return perms;
};

export const Grupos = ({ permissions }: { permissions: any }) => {
  const { confirm: confirmAction } = useNotification();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState<Grupo | null>(null);

  // Use permissions to control view/edit access if needed
  const canEdit = permissions?.editar || permissions?.admin;
  const canDelete = permissions?.excluir || permissions?.admin;
  const [formData, setFormData] = useState({
    nome: '',
    permissoes: DEFAULT_PERMISSIONS(),
  });
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({ empresa: true });

  useEffect(() => {
    fetchGrupos();
  }, []);

  const fetchGrupos = async () => {
    try {
      const { data, error } = await supabase
        .from('grupos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGrupos(data || []);
    } catch (error) {
      console.error('Error fetching grupos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingGrupo) {
        const { error } = await supabase
          .from('grupos')
          .update(formData)
          .eq('id', editingGrupo.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('grupos')
          .insert([formData]);

        if (error) throw error;
      }

      await fetchGrupos();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving grupo:', error);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Excluir Grupo',
      message: 'Tem certeza que deseja excluir este grupo? Usuários vinculados poderão perder acesso.',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('grupos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchGrupos();
    } catch (error) {
      console.error('Error deleting grupo:', error);
    }
  };

  const handleEdit = (grupo: Grupo) => {
    setEditingGrupo(grupo);
    setFormData({
      nome: grupo.nome,
      permissoes: grupo.permissoes,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingGrupo(null);
    setFormData({
      nome: '',
      permissoes: DEFAULT_PERMISSIONS(),
    });
  };

  const handlePermissionChange = (moduleKey: string, action: 'ver' | 'editar' | 'excluir', value: boolean) => {
    const currentModule = formData.permissoes[moduleKey] || { ver: false, editar: false, excluir: false };

    // Logic: if you can't see, you can't edit or delete
    let newModule = { ...currentModule, [action]: value };
    if (action === 'ver' && !value) {
      newModule = { ver: false, editar: false, excluir: false };
    }
    if ((action === 'editar' || action === 'excluir') && value) {
      newModule.ver = true;
    }

    setFormData({
      ...formData,
      permissoes: {
        ...formData.permissoes,
        [moduleKey]: newModule,
      },
    });
  };

  const toggleCategory = (catId: string) => {
    setExpandedCats(prev => ({ ...prev, [catId]: !prev[catId] }));
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
          <h1 className="text-3xl font-bold text-cyan-400">Grupos</h1>
        </div>
        {canEdit && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            Novo Grupo
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {grupos.map((grupo) => (
          <Card key={grupo.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <UserCog className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-200">{grupo.nome}</h3>
                  <p className="text-sm text-gray-400">
                    {Object.values(grupo.permissoes).filter(Boolean).length} permissões
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4 space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              <div className="flex flex-wrap gap-1">
                {Object.entries(grupo.permissoes).map(([key, value]: [string, any]) => {
                  if (key === 'admin' && value === true) return (
                    <span key={key} className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] rounded uppercase font-bold border border-red-500/20">Admin Geral</span>
                  );
                  if (typeof value === 'object' && value.ver) {
                    return (
                      <div key={key} className="flex flex-col p-1.5 bg-cyan-500/5 rounded border border-cyan-500/10 min-w-[80px]">
                        <span className="text-[10px] text-gray-400 uppercase font-medium truncate mb-1 border-b border-cyan-500/10 pb-1">{key.replace('-', ' ')}</span>
                        <div className="flex gap-1.5">
                          <Shield className={`w-3 h-3 ${value.ver ? 'text-green-500' : 'text-gray-600'}`} />
                          <ShieldCheck className={`w-3 h-3 ${value.editar ? 'text-amber-500' : 'text-gray-600'}`} />
                          <ShieldAlert className={`w-3 h-3 ${value.excluir ? 'text-red-500' : 'text-gray-600'}`} />
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>

            <div className="flex gap-2">
              {canEdit && (
                <button
                  onClick={() => handleEdit(grupo)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => handleDelete(grupo.id)}
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

      {grupos.length === 0 && (
        <div className="text-center py-12">
          <UserCog className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Nenhum grupo cadastrado</p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingGrupo ? 'Editar Grupo' : 'Novo Grupo'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome do Grupo
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              required
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-700 pb-2">
              <label className="text-sm font-bold text-cyan-400 uppercase">
                Acesso aos Módulos
              </label>
              <div className="flex gap-4 text-[10px] text-gray-500 uppercase font-bold">
                <span className="w-8 text-center">Ver</span>
                <span className="w-8 text-center">Edit</span>
                <span className="w-8 text-center">Excl</span>
              </div>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {/* Admin Toggle */}
              <div className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                  <div>
                    <span className="text-sm font-bold text-red-400 uppercase">Administrador do Sistema</span>
                    <p className="text-[10px] text-red-400/60">Acesso total e irrestrito a todas as funções</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.permissoes.admin || false}
                  onChange={(e) => setFormData({
                    ...formData,
                    permissoes: { ...formData.permissoes, admin: e.target.checked }
                  })}
                  className="w-5 h-5 rounded border-gray-700 text-red-500 focus:ring-red-500"
                />
              </div>

              {MENU_STRUCTURE.map(cat => (
                <div key={cat.id} className="space-y-2">
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className="w-full flex items-center justify-between p-2 bg-cyan-500/5 hover:bg-cyan-500/10 rounded-lg transition-colors group"
                  >
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">{cat.label}</span>
                    {expandedCats[cat.id] ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                  </button>

                  {expandedCats[cat.id] && (
                    <div className="space-y-1 pl-1">
                      {cat.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/5 transition-all">
                          <span className="text-sm text-gray-300">{item.label}</span>
                          <div className="flex gap-4">
                            <input
                              type="checkbox"
                              checked={formData.permissoes[item.id]?.ver || false}
                              onChange={(e) => handlePermissionChange(item.id, 'ver', e.target.checked)}
                              className="w-5 h-5 rounded bg-[#0F1629] border-gray-700 text-cyan-500 focus:ring-cyan-500"
                            />
                            <input
                              type="checkbox"
                              checked={formData.permissoes[item.id]?.editar || false}
                              onChange={(e) => handlePermissionChange(item.id, 'editar', e.target.checked)}
                              className="w-5 h-5 rounded bg-[#0F1629] border-gray-700 text-amber-500 focus:ring-amber-500"
                            />
                            <input
                              type="checkbox"
                              checked={formData.permissoes[item.id]?.excluir || false}
                              onChange={(e) => handlePermissionChange(item.id, 'excluir', e.target.checked)}
                              className="w-5 h-5 rounded bg-[#0F1629] border-gray-700 text-red-500 focus:ring-red-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
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
              {editingGrupo ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
