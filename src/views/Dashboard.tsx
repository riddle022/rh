import { useState, useEffect } from 'react';
import {
  Users,
  Award,
  Calendar,
  CheckCircle,
  Loader2,
  Filter,
  PieChart,
  BarChart3
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import type { Funcionario, Filial, Setor, EscalaEntrada } from '../types';

interface DashboardStats {
  totalAtivos: number;
  presentesHoje: number;
  aniversariantesMes: number;
}

export const Dashboard = ({ permissions: _permissions }: { permissions: any }) => {
  const [loading, setLoading] = useState(true);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [escalaEntries, setEscalaEntries] = useState<EscalaEntrada[]>([]);
  const [selectedFilial, setSelectedFilial] = useState<string>('all');
  const [stats, setStats] = useState<DashboardStats>({
    totalAtivos: 0,
    presentesHoje: 0,
    aniversariantesMes: 0,
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      const currentDay = today.getDate();

      const [filiaisRes, setoresRes, funcionariosRes, escalasRes] = await Promise.all([
        supabase.from('filiais').select('*').order('nome'),
        supabase.from('setores').select('*').order('nome'),
        supabase.from('funcionarios').select('*, filial:filiais(*), setor:setores(*)').eq('ativo', true),
        supabase.from('escalas').select('id').eq('mes', currentMonth).eq('ano', currentYear)
      ]);

      const scaleIds = (escalasRes.data || []).map(s => s.id);

      let entries: EscalaEntrada[] = [];
      if (scaleIds.length > 0) {
        const { data } = await supabase
          .from('escala_entradas')
          .select('*')
          .in('escala_id', scaleIds)
          .eq('dia', currentDay);
        entries = data || [];
      }

      setFiliais(filiaisRes.data || []);
      setSetores(setoresRes.data || []);
      setFuncionarios(funcionariosRes.data || []);
      setEscalaEntries(entries);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFuncionarios = selectedFilial === 'all'
    ? funcionarios
    : funcionarios.filter(f => f.filial_id === selectedFilial);

  useEffect(() => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;

    const ativos = filteredFuncionarios.length;

    // Presencia real basada en la escala de hoy
    // Códigos que NO representan presencia: F (Folga), FD (Folga Domingo), FR (Férias), FE (Feriado), AT (Atestado), CF (Compensación)
    const ausencias = ['F', 'FD', 'FR', 'FE', 'AT', 'CF'];

    const presentes = filteredFuncionarios.filter(f => {
      const entry = escalaEntries.find(e => e.funcionario_id === f.id);
      if (!entry || !entry.turno) return false;
      return !ausencias.includes(entry.turno.toUpperCase());
    }).length;

    const aniversariantes = filteredFuncionarios.filter(f => {
      if (!f.data_nascimento) return false;
      const birthDate = new Date(f.data_nascimento);
      return (birthDate.getMonth() + 1) === currentMonth;
    }).length;

    setStats({
      totalAtivos: ativos,
      presentesHoje: presentes,
      aniversariantesMes: aniversariantes,
    });
  }, [filteredFuncionarios]);

  // Data for Charts
  const funcionariosPorSetor = setores
    .map(s => ({
      nome: s.nome,
      count: filteredFuncionarios.filter(f => f.setor_id === s.id).length
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count);

  const funcionariosPorFilial = filiais
    .map(f => ({
      nome: f.nome,
      count: funcionarios.filter(func => func.filial_id === f.id).length
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400">Dashboard RH</h1>
        </div>

        <div className="flex items-center gap-3 bg-[#0F1629]/80 p-2 rounded-xl border border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
          <Filter className="w-4 h-4 text-cyan-400 ml-2" />
          <select
            value={selectedFilial}
            onChange={(e) => setSelectedFilial(e.target.value)}
            className="bg-transparent text-gray-200 text-sm font-bold focus:outline-none pr-8 cursor-pointer appearance-none"
          >
            <option value="all" className="bg-[#0F1629]">Todas as Filiais</option>
            {filiais.map(f => (
              <option key={f.id} value={f.id} className="bg-[#0F1629]">{f.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-cyan-500/10 to-transparent border-cyan-500/10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-cyan-500/20 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <Users className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium">Funcionários Ativos</p>
              <p className="text-3xl font-bold text-gray-100">{stats.totalAtivos}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-500/10 to-transparent border-green-500/10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-500/20 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/10">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium">Presentes Hoje</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-gray-100">{stats.presentesHoje}</p>
                <span className="text-xs text-green-400 font-bold">
                  {stats.totalAtivos > 0 ? Math.round((stats.presentesHoje / stats.totalAtivos) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/10">
              <Calendar className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium">Aniversariantes do Mês</p>
              <p className="text-3xl font-bold text-gray-100">{stats.aniversariantesMes}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution by Sector */}
        <Card className="p-6 bg-[#0F1629]/50 border-cyan-500/10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                <PieChart className="w-4 h-4 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-200">Distribuição por Setor</h2>
            </div>
          </div>
          <div className="space-y-4">
            {funcionariosPorSetor.length > 0 ? (
              funcionariosPorSetor.slice(0, 6).map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-medium">{item.nome}</span>
                    <span className="text-cyan-400 font-bold">{item.count}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 rounded-full transition-all duration-1000"
                      style={{ width: `${filteredFuncionarios.length > 0 ? (item.count / filteredFuncionarios.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500 italic">Dados insuficientes</div>
            )}
          </div>
        </Card>

        {/* Distribution by Branch */}
        <Card className="p-6 bg-[#0F1629]/50 border-cyan-500/10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-purple-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-200">Colaboradores por Filial</h2>
            </div>
          </div>
          <div className="space-y-4">
            {funcionariosPorFilial.length > 0 ? (
              funcionariosPorFilial.slice(0, 6).map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-medium">{item.nome}</span>
                    <span className="text-purple-400 font-bold">{item.count}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-300 rounded-full transition-all duration-1000"
                      style={{ width: `${funcionarios.length > 0 ? (item.count / funcionarios.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500 italic">Dados insuficientes</div>
            )}
          </div>
        </Card>
      </div>

      {/* Birthday List (Bonus for Premium feel) */}
      <Card className="p-6 bg-[#0F1629]/50 border-cyan-500/10">
        <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-400" />
          Destaques & Aniversariantes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFuncionarios.filter(f => {
            if (!f.data_nascimento) return false;
            const birthDay = new Date(f.data_nascimento).getMonth();
            return birthDay === new Date().getMonth();
          }).slice(0, 3).map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-cyan-500/5 rounded-xl border border-cyan-500/10">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white font-bold">
                {f.nome.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-200">{f.nome}</p>
                <p className="text-[10px] text-cyan-400 font-bold uppercase">{f.setor?.nome}</p>
              </div>
              <div className="ml-auto">
                <div className="w-8 h-8 rounded-lg bg-yellow-400/20 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-yellow-400" />
                </div>
              </div>
            </div>
          ))}
          {stats.aniversariantesMes === 0 && (
            <p className="text-gray-500 text-sm italic col-span-3 text-center py-4">Nenhum aniversariante encontrado neste mês.</p>
          )}
        </div>
      </Card>
    </div>
  );
};
