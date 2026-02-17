import { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCog,
  Network,
  FileText,
  Upload,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Bot,
  Calendar,
  Briefcase,
  DollarSign
} from 'lucide-react';
import { signOut } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export const Sidebar = ({ currentView, onViewChange }: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEmpresaOpen, setIsEmpresaOpen] = useState(true);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tarefas', label: 'Gestão de Tarefas', icon: FileText },
    { id: 'escala', label: 'Escala', icon: Calendar },
  ];

  const empresaItems = [
    { id: 'funcionarios', label: 'Funcionários', icon: Users },
    { id: 'cargos', label: 'Cargos', icon: Briefcase },
    { id: 'departamentos', label: 'Departamentos', icon: Building2 },
    { id: 'filiais', label: 'Filiais', icon: Building2 },
    { id: 'grupos', label: 'Grupos', icon: UserCog },
    { id: 'usuarios', label: 'Usuários', icon: Users },
  ];

  const vendasItems = [
    { id: 'vendedores', label: 'Vendedores', icon: Users },
    { id: 'setores', label: 'Setores', icon: Network },
    { id: 'carregar-vendas', label: 'Carregar Vendas', icon: Upload },
    { id: 'metas', label: 'Metas', icon: LayoutDashboard },
    { id: 'comissoes', label: 'Comissões', icon: FileText },
  ];

  const financeiroItems = [
    { id: 'vale-mercadoria', label: 'Vale Mercadoria', icon: FileText },
    { id: 'lancamentos', label: 'Lançamentos', icon: DollarSign },
  ];

  const iaItems = [
    { id: 'analise-curriculos', label: 'Analisador de CV', icon: Bot },
    { id: 'banco-talentos', label: 'Banco de Talentos', icon: Users },
    { id: 'assistente-ia', label: 'Assistente IA', icon: Bot },
  ];

  const { permissions } = useAuth();

  const canView = (id: string) => {
    if (!permissions) return false;
    if (permissions.admin === true) return true;

    // Normalize id if needed (e.g. carregar-vendas vs carregar_vendas)
    // Actually the structural IDs match what I defined in Grupos.tsx MENU_STRUCTURE
    return permissions[id]?.ver === true;
  };

  const MenuItem = ({ item, isActive, onClick }: any) => {
    const Icon = item.icon;
    return (
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
          ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 text-cyan-400 shadow-lg shadow-cyan-500/20 border border-cyan-500/30'
          : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10'
          }`}
      >
        <Icon className="w-5 h-5" />
        <span className="font-medium">{item.label}</span>
      </button>
    );
  };

  const SidebarContent = () => {
    const [isVendasOpen, setIsVendasOpen] = useState(false);
    const [isFinanceiroOpen, setIsFinanceiroOpen] = useState(false);
    const [isIAOpen, setIsIAOpen] = useState(false);

    const filteredMenuItems = menuItems.filter(item => canView(item.id));
    const filteredEmpresaItems = empresaItems.filter(item => canView(item.id));
    const filteredVendasItems = vendasItems.filter(item => canView(item.id));
    const filteredFinanceiroItems = financeiroItems.filter(item => canView(item.id));
    const filteredIAItems = iaItems.filter(item => canView(item.id));

    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-[#0A0E27] via-[#0F1629] to-[#151B2D] border-r border-cyan-500/10">
        <div className="p-6 border-b border-cyan-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/50">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-600 text-transparent bg-clip-text">
                RH Inteligente
              </h2>
              <p className="text-xs text-gray-400">Gestão & Performance</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => (
            <MenuItem
              key={item.id}
              item={item}
              isActive={currentView === item.id}
              onClick={() => {
                onViewChange(item.id);
                setIsOpen(false);
              }}
            />
          ))}

          {/* Gerenciador Empresa */}
          {filteredEmpresaItems.length > 0 && (
            <div className="py-2">
              <button
                onClick={() => setIsEmpresaOpen(!isEmpresaOpen)}
                className="w-full flex items-center justify-between px-4 py-2 text-gray-300 hover:text-cyan-400 transition-colors"
              >
                <span className="font-semibold">Gerenciador Empresa</span>
                {isEmpresaOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {isEmpresaOpen && (
                <div className="mt-1 space-y-1 pl-2">
                  {filteredEmpresaItems.map((item) => (
                    <MenuItem
                      key={item.id}
                      item={item}
                      isActive={currentView === item.id}
                      onClick={() => {
                        onViewChange(item.id);
                        setIsOpen(false);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Gerenciador de Vendas */}
          {filteredVendasItems.length > 0 && (
            <div className="py-2">
              <button
                onClick={() => setIsVendasOpen(!isVendasOpen)}
                className="w-full flex items-center justify-between px-4 py-2 text-gray-300 hover:text-cyan-400 transition-colors"
              >
                <span className="font-semibold">Gerenciador de Vendas</span>
                {isVendasOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {isVendasOpen && (
                <div className="mt-1 space-y-1 pl-2">
                  {filteredVendasItems.map((item) => (
                    <MenuItem
                      key={item.id}
                      item={item}
                      isActive={currentView === item.id}
                      onClick={() => {
                        onViewChange(item.id);
                        setIsOpen(false);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Financeiro */}
          {filteredFinanceiroItems.length > 0 && (
            <div className="py-2">
              <button
                onClick={() => setIsFinanceiroOpen(!isFinanceiroOpen)}
                className="w-full flex items-center justify-between px-4 py-2 text-gray-300 hover:text-cyan-400 transition-colors"
              >
                <span className="font-semibold">Financeiro</span>
                {isFinanceiroOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {isFinanceiroOpen && (
                <div className="mt-1 space-y-1 pl-2">
                  {filteredFinanceiroItems.map((item) => (
                    <MenuItem
                      key={item.id}
                      item={item}
                      isActive={currentView === item.id}
                      onClick={() => {
                        onViewChange(item.id);
                        setIsOpen(false);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* RH Inteligente */}
          {filteredIAItems.length > 0 && (
            <div className="py-2">
              <button
                onClick={() => setIsIAOpen(!isIAOpen)}
                className="w-full flex items-center justify-between px-4 py-2 text-gray-300 hover:text-cyan-400 transition-colors"
              >
                <span className="font-semibold">RH Inteligente</span>
                {isIAOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {isIAOpen && (
                <div className="mt-1 space-y-1 pl-2">
                  {filteredIAItems.map((item) => (
                    <MenuItem
                      key={item.id}
                      item={item}
                      isActive={currentView === item.id}
                      onClick={() => {
                        onViewChange(item.id);
                        setIsOpen(false);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-cyan-500/10">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#0F1629] border border-cyan-500/30 rounded-lg text-cyan-400 shadow-lg shadow-cyan-500/20"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <aside className="hidden lg:block w-72 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
};
