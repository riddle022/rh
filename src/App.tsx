import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { Filiais } from './views/Filiais';
import { Setores } from './views/Setores';
import { Vendedores } from './views/Vendedores';
import { Grupos } from './views/Grupos';
import { Usuarios } from './views/Usuarios';
import { CarregarVendas } from './views/CarregarVendas';
import { Relatorios } from './views/Relatorios';
import { AssistenteIA } from './views/AssistenteIA';
import { Funcionarios } from './views/Funcionarios';
import { Departamentos } from './views/Departamentos';
import { Cargos } from './views/Cargos';
import { ValeMercadoria } from './views/ValeMercadoria';
import { GestaoTarefas } from './views/GestaoTarefas';
import { Escalas } from './views/Escalas';
import { Lancamentos } from './views/Lancamentos';
import { BancoTalentos } from './views/BancoTalentos';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, loading, permissions } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderView = () => {
    const viewPerms = permissions?.[currentView] || (permissions?.admin ? { ver: true, editar: true, excluir: true } : { ver: false, editar: false, excluir: false });

    switch (currentView) {
      case 'dashboard':
        return <Dashboard permissions={viewPerms} />;
      case 'filiais':
        return <Filiais permissions={viewPerms} />;
      case 'setores':
        return <Setores permissions={viewPerms} />;
      case 'vendedores':
        return <Vendedores permissions={viewPerms} />;
      case 'grupos':
        return <Grupos permissions={viewPerms} />;
      case 'usuarios':
        return <Usuarios permissions={viewPerms} />;
      case 'departamentos':
        return <Departamentos permissions={viewPerms} />;
      case 'cargos':
        return <Cargos permissions={viewPerms} />;
      case 'funcionarios':
        return <Funcionarios onViewChange={setCurrentView} permissions={viewPerms} />;
      case 'metas':
        return <div className="text-white p-8">Visualização de Metas (Em breve)</div>;
      case 'comissoes':
        return <div className="text-white p-8">Visualização de Comissões (Em breve)</div>;
      case 'vale-mercadoria':
        return <ValeMercadoria permissions={viewPerms} />;
      case 'lancamentos':
        return <Lancamentos permissions={viewPerms} />;
      case 'analise-curriculos':
        return <div className="text-white p-8">Analisador de Currículos (Em breve)</div>;
      case 'banco-talentos':
        return <BancoTalentos permissions={viewPerms} />;
      case 'tarefas':
        return <GestaoTarefas permissions={viewPerms} />;
      case 'escala':
        return <Escalas permissions={viewPerms} />;
      case 'carregar-vendas':
        return <CarregarVendas permissions={viewPerms} />;
      case 'relatorios':
        return <Relatorios permissions={viewPerms} />;
      case 'assistente-ia':
        return <AssistenteIA permissions={viewPerms} />;
      default:
        return <Dashboard permissions={viewPerms} />;
    }
  };

  return (
    <Layout currentView={currentView} onViewChange={setCurrentView}>
      {renderView()}
    </Layout>
  );
}

import { NotificationProvider } from './context/NotificationContext';

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;
