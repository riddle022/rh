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
  ChevronLeft,
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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar = ({ currentView, onViewChange, isCollapsed = false, onToggleCollapse }: SidebarProps) => {
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
    return permissions[id]?.ver === true;
  };

  const MenuItem = ({ item, isActive, onClick, isCollapsed: itemCollapsed }: any) => {
    const Icon = item.icon;
    return (
      <button
        onClick={onClick}
        title={itemCollapsed ? item.label : undefined}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
          ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 text-cyan-400 shadow-lg shadow-cyan-500/20 border border-cyan-500/30'
          : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10'
          } ${itemCollapsed ? 'justify-center px-2' : ''}`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!itemCollapsed && <span className="font-medium truncate">{item.label}</span>}
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
      <div className={`h-full flex flex-col bg-gradient-to-b from-[#0A0E27] via-[#0F1629] to-[#151B2D] border-r border-cyan-500/10 transition-all duration-300 relative ${isCollapsed ? 'w-20' : 'w-72'}`}>
        <div className={`p-6 border-b border-cyan-500/10 flex items-center ${isCollapsed ? 'flex-col gap-4 px-4' : 'justify-between'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/50 flex-shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            {!isCollapsed && (
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-600 text-transparent bg-clip-text leading-tight">
                  RH Inteligente
                </h2>
                <p className="text-xs text-gray-400 whitespace-nowrap">Gestão & Performance</p>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className={`hidden lg:flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${isCollapsed
              ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
              : 'text-gray-500 hover:text-cyan-400 hover:bg-white/5'
              }`}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredMenuItems.map((item) => (
            <MenuItem
              key={item.id}
              item={item}
              isActive={currentView === item.id}
              isCollapsed={isCollapsed}
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
                onClick={() => !isCollapsed && setIsEmpresaOpen(!isEmpresaOpen)}
                className={`w-full flex items-center justify-between px-4 py-2 text-gray-300 hover:text-cyan-400 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? 'Gerenciador Empresa' : undefined}
              >
                {isCollapsed ? <Building2 className="w-5 h-5" /> : (
                  <>
                    <span className="font-semibold text-xs text-gray-500 uppercase tracking-wider">Gerenciador Empresa</span>
                    {isEmpresaOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </>
                )}
              </button>
              {(!isCollapsed && isEmpresaOpen) && (
                <div className="mt-1 space-y-1 pl-2">
                  {filteredEmpresaItems.map((item) => (
                    <MenuItem
                      key={item.id}
                      item={item}
                      isActive={currentView === item.id}
                      isCollapsed={isCollapsed}
                      onClick={() => {
                        onViewChange(item.id);
                        setIsOpen(false);
                      }}
                    />
                  ))}
                </div>
              )}
              {(isCollapsed) && (
                <div className="space-y-1 mt-2">
                  {filteredEmpresaItems.map((item) => (
                    <MenuItem
                      key={item.id}
                      item={item}
                      isActive={currentView === item.id}
                      isCollapsed={isCollapsed}
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

          {/* Gerenciador de Vendas - Oculto temporariamente
          {filteredVendasItems.length > 0 && (
            <div className="py-2">
              <button
                onClick={() => !isCollapsed && setIsVendasOpen(!isVendasOpen)}
                className={`w-full flex items-center justify-between px-4 py-2 text-gray-300 hover:text-cyan-400 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? 'Gerenciador de Vendas' : undefined}
              >
                {isCollapsed ? <LayoutDashboard className="w-5 h-5" /> : (
                  <>
                    <span className="font-semibold text-xs text-gray-500 uppercase tracking-wider">Vendas</span>
                    {isVendasOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </>
                )}
              </button>
              {(!isCollapsed && isVendasOpen) && (
                <div className="mt-1 space-y-1 pl-2">
                  {filteredVendasItems.map((item) => (
                    <MenuItem
                      key={item.id}
                      item={item}
                      isActive={currentView === item.id}
                      isCollapsed={isCollapsed}
                      onClick={() => {
                        onViewChange(item.id);
                        setIsOpen(false);
                      }}
                    />
                  ))}
                </div>
              )}
              {isCollapsed && (
                <div className="space-y-1 mt-2">
                  {filteredVendasItems.map((item) => (
                    <MenuItem
                      key={item.id}
                      item={item}
                      isActive={currentView === item.id}
                      isCollapsed={isCollapsed}
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
          */}

          {/* Financeiro */}
          {filteredFinanceiroItems.length > 0 && (
            <div className="py-2">
              <button
                onClick={() => !isCollapsed && setIsFinanceiroOpen(!isFinanceiroOpen)}
                className={`w-full flex items-center justify-between px-4 py-2 text-gray-300 hover:text-cyan-400 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? 'Financeiro' : undefined}
              >
                {isCollapsed ? <DollarSign className="w-5 h-5" /> : (
                  <>
                    <span className="font-semibold text-xs text-gray-500 uppercase tracking-wider">Financeiro</span>
                    {isFinanceiroOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </>
                )}
              </button>
              {(!isCollapsed && isFinanceiroOpen) && (
                <div className="mt-1 space-y-1 pl-2">
                  {filteredFinanceiroItems.map((item) => (
                    <MenuItem
                      key={item.id}
                      item={item}
                      isActive={currentView === item.id}
                      isCollapsed={isCollapsed}
                      onClick={() => {
                        onViewChange(item.id);
                        setIsOpen(false);
                      }}
                    />
                  ))}
                </div>
              )}
              {isCollapsed && (
                <div className="space-y-1 mt-2">
                  {filteredFinanceiroItems.map((item) => (
                    <MenuItem
                      key={item.id}
                      item={item}
                      isActive={currentView === item.id}
                      isCollapsed={isCollapsed}
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
                onClick={() => !isCollapsed && setIsIAOpen(!isIAOpen)}
                className={`w-full flex items-center justify-between px-4 py-2 text-gray-300 hover:text-cyan-400 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? 'RH Inteligente' : undefined}
              >
                {isCollapsed ? <Bot className="w-5 h-5" /> : (
                  <>
                    <span className="font-semibold text-xs text-gray-500 uppercase tracking-wider">Inteligência</span>
                    {isIAOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </>
                )}
              </button>
              {(!isCollapsed && isIAOpen) && (
                <div className="mt-1 space-y-1 pl-2">
                  {filteredIAItems.map((item) => (
                    <MenuItem
                      key={item.id}
                      item={item}
                      isActive={currentView === item.id}
                      isCollapsed={isCollapsed}
                      onClick={() => {
                        onViewChange(item.id);
                        setIsOpen(false);
                      }}
                    />
                  ))}
                </div>
              )}
              {isCollapsed && (
                <div className="space-y-1 mt-2">
                  {filteredIAItems.map((item) => (
                    <MenuItem
                      key={item.id}
                      item={item}
                      isActive={currentView === item.id}
                      isCollapsed={isCollapsed}
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

        <div className={`p-4 border-t border-cyan-500/10 ${isCollapsed ? 'px-2' : ''}`}>
          <button
            onClick={handleSignOut}
            title={isCollapsed ? 'Sair' : undefined}
            className={`w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 ${isCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium">Sair</span>}
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

      <aside className={`hidden lg:block h-screen sticky top-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'}`}>
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
