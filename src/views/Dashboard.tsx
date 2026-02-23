import { useState, useEffect } from 'react';
import {
  Users,
  Award,
  Calendar,
  CheckCircle,
  Loader2,
  Filter,
  PieChart,
  BarChart3,
  Target,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import type { Funcionario, Filial, Setor, EscalaEntrada, FilialMetaMensal } from '../types';

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
  const [filialMetas, setFilialMetas] = useState<FilialMetaMensal[]>([]);
  const [selectedFilial, setSelectedFilial] = useState<string>('all');
  const [goalsMonth, setGoalsMonth] = useState<number>(new Date().getMonth() + 1);
  const [goalsYear, setGoalsYear] = useState<number>(new Date().getFullYear());
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

  const fetchGoalsData = async (month: number, year: number) => {
    try {
      const { data, error } = await supabase
        .from('filial_metas_mensais')
        .select('*')
        .eq('mes', month)
        .eq('ano', year);

      if (error) throw error;
      setFilialMetas(data || []);
    } catch (error) {
      console.error('Error fetching goals data:', error);
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchGoalsData(goalsMonth, goalsYear);
    }
  }, [goalsMonth, goalsYear, loading]);

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

      {/* Goals Chart - Meta vs Faturado */}
      <Card className="p-6 bg-[#0F1629]/50 border-cyan-500/10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-200">Desempenho de Metas por Filial</h2>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {/* Period Filter */}
            <div className="flex items-center gap-2 bg-[#151B2D] border border-cyan-500/10 rounded-lg px-3 py-1.5 transition-all hover:border-cyan-500/30">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <div className="flex items-center gap-2">
                <select
                  value={goalsMonth}
                  onChange={(e) => setGoalsMonth(Number(e.target.value))}
                  className="bg-transparent text-xs text-gray-300 focus:outline-none cursor-pointer appearance-none pr-1"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1} className="bg-[#0F1629]">
                      {new Date(2000, i).toLocaleDateString('pt-BR', { month: 'long' })}
                    </option>
                  ))}
                </select>
                <span className="text-gray-600 font-bold">/</span>
                <select
                  value={goalsYear}
                  onChange={(e) => setGoalsYear(Number(e.target.value))}
                  className="bg-transparent text-xs text-gray-300 focus:outline-none cursor-pointer appearance-none"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y} className="bg-[#0F1629]">{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-500/30" />
                <span className="text-gray-400">Meta</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-gray-400">Faturado</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filiais.map(filial => {
            const meta = filialMetas.find(m => m.filial_id === filial.id);
            if (!meta) return null;

            const percent = meta.meta > 0 ? (meta.faturado / meta.meta) * 100 : 0;
            const isAchieved = percent >= 100;

            return (
              <div key={filial.id} className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-cyan-500/20 transition-all group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-200 group-hover:text-cyan-400 transition-colors uppercase">{filial.nome}</span>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black ${isAchieved ? 'text-green-400' : 'text-cyan-400'}`}>
                      {percent.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Meta Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
                      <span>Meta: R$ {meta.meta.toLocaleString('pt-BR')}</span>
                      <span>100%</span>
                    </div>
                    <div className="relative h-4 bg-gray-800/50 rounded-lg overflow-hidden border border-white/5">
                      {/* Faturado Progress Overlay */}
                      <div
                        className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-out z-10 ${isAchieved ? 'bg-gradient-to-r from-green-600 to-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-gradient-to-r from-cyan-600 to-cyan-400'}`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      >
                        <div className="absolute inset-0 bg-white/10 animate-pulse" />
                      </div>

                      {/* 100% Indicator line if achieved */}
                      <div className="absolute right-0 top-0 bottom-0 w-px bg-white/10 z-20" />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <div className="flex items-center gap-1.5 p-1 px-2 bg-white/5 rounded-md border border-white/5">
                      <TrendingUp className={`w-3 h-3 ${isAchieved ? 'text-green-400' : 'text-cyan-400'}`} />
                      <span className="text-gray-400">Total Faturado:</span>
                      <span className={isAchieved ? 'text-green-400' : 'text-gray-200'}>R$ {meta.faturado.toLocaleString('pt-BR')}</span>
                    </div>
                    {isAchieved && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-400 rounded-full border border-green-500/20 animate-bounce">
                        <CheckCircle className="w-3 h-3" />
                        Meta Batida!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          }).filter(Boolean)}

          {filialMetas.length === 0 && (
            <div className="col-span-2 text-center py-12 text-gray-500 italic bg-white/5 rounded-2xl border border-dashed border-white/10">
              Nenhuma meta definida para o mês atual.
            </div>
          )}
        </div>
      </Card>

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
              <div className="ml-auto flex flex-col items-end gap-1">
                <div className="w-8 h-8 rounded-lg bg-yellow-400/20 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-yellow-400" />
                </div>
                <span className="text-[10px] font-bold text-yellow-500/80 bg-yellow-500/5 px-1.5 py-0.5 rounded border border-yellow-500/10 whitespace-nowrap">
                  {f.data_nascimento ? new Date(f.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''}
                </span>
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
