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

  const fetchGoalsData = async (year: number) => {
    try {
      const { data, error } = await supabase
        .from('filial_metas_mensais')
        .select('*')
        .eq('ano', year);

      if (error) throw error;
      setFilialMetas(data || []);
    } catch (error) {
      console.error('Error fetching goals data:', error);
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchGoalsData(goalsYear);
    }
  }, [goalsYear, loading]);

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

      {/* Goals Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20">
            <Target className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-100 tracking-tight">Desempenho de Metas Anual</h2>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Acompanhamento por Unidade • {goalsYear}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="hidden sm:flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest bg-black/20 p-2 px-4 rounded-full border border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-cyan-500/30 border border-cyan-500/50" />
              <span className="text-gray-400">Objetivo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-green-600 to-green-400" />
              <span className="text-gray-400">Faturamento</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#151B2D] border border-cyan-500/10 rounded-xl px-4 py-2 transition-all hover:border-cyan-500/30">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <select
              value={goalsYear}
              onChange={(e) => setGoalsYear(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-gray-200 focus:outline-none cursor-pointer appearance-none"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y} className="bg-[#0F1629]">{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {filiais.map(filial => {
          const filialData = filialMetas.filter(m => m.filial_id === filial.id);

          // Calculate max value for this specific chart to keep scale relative to unit performance
          const maxVal = Math.max(...Array.from({ length: 12 }, (_, m) => {
            const d = filialData.filter(meta => meta.mes === m + 1);
            return Math.max(d.reduce((a, b) => a + b.meta, 0), d.reduce((a, b) => a + b.faturado, 0));
          })) || 1;

          return (
            <Card key={filial.id} className="p-5 bg-[#0F1629]/50 border-cyan-500/10 overflow-hidden flex flex-col group">
              <div className="flex items-center justify-between mb-6">
                <div className="flex flex-col">
                  <span className="text-sm font-black text-cyan-400 uppercase tracking-tighter group-hover:text-cyan-300 transition-colors">
                    {filial.nome}
                  </span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    Performance Mensal
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 opacity-40 group-hover:opacity-100 transition-all">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                </div>
              </div>

              <div className="h-[250px] relative mt-2">
                {/* Horizontal Grid Lines */}
                <div className="absolute inset-x-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none opacity-20">
                  {[0, 1, 2, 3].map((_, i) => (
                    <div key={i} className="w-full border-t border-white/5" />
                  ))}
                </div>

                <div className="h-full flex items-end justify-between gap-1 pb-8 relative z-10">
                  {Array.from({ length: 12 }, (_, i) => {
                    const mes = i + 1;
                    const mesMetaObj = filialData.find(m => m.mes === mes);
                    const totalMeta = mesMetaObj?.meta || 0;
                    const totalFaturado = mesMetaObj?.faturado || 0;

                    const metaHeight = (totalMeta / maxVal) * 100;
                    const faturadoHeight = (totalFaturado / maxVal) * 100;
                    const isAchieved = totalFaturado >= totalMeta && totalMeta > 0;
                    const monthName = new Date(2000, i).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').charAt(0);

                    return (
                      <div key={i} className="flex-1 flex flex-col items-center group/bar relative h-full">
                        {/* Compact Tooltip */}
                        <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-[#1A2235] border border-cyan-500/30 p-2 rounded-lg shadow-2xl opacity-0 group-hover/bar:opacity-100 transition-all pointer-events-none z-50 whitespace-nowrap backdrop-blur-xl scale-90">
                          <p className="text-[9px] font-black text-cyan-400 uppercase mb-1 border-b border-white/5 pb-1">
                            {new Date(2000, i).toLocaleDateString('pt-BR', { month: 'long' })}
                          </p>
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[8px] text-gray-500 font-bold">META</span>
                              <span className="text-[9px] text-gray-200 font-bold">R$ {totalMeta.toLocaleString('pt-BR')}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[8px] text-gray-500 font-bold">FAT.</span>
                              <span className={`text-[9px] font-black ${isAchieved ? 'text-green-400' : 'text-cyan-400'}`}>R$ {totalFaturado.toLocaleString('pt-BR')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="relative w-full h-full flex items-end justify-center gap-0.5 px-0.5">
                          {/* Meta Bar */}
                          <div
                            className="w-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-t-[2px] transition-all duration-700"
                            style={{ height: `${metaHeight}%` }}
                          />

                          {/* Faturado Bar */}
                          <div
                            className={`w-1.5 rounded-t-[2px] transition-all duration-1000 delay-100 shadow-sm ${isAchieved ? 'bg-gradient-to-t from-green-600 to-green-400' : 'bg-gradient-to-t from-cyan-600 to-cyan-400'}`}
                            style={{ height: `${faturadoHeight}%` }}
                          />

                          {isAchieved && (
                            <div className="absolute -bottom-0.5 inset-x-1 h-0.5 bg-green-500/30 blur-[2px] rounded-full" />
                          )}
                        </div>

                        <span className="absolute -bottom-6 text-[8px] font-black text-gray-600 uppercase group-hover/bar:text-cyan-400 transition-colors">
                          {monthName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {filialData.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-20">
                  <Target className="w-8 h-8 mb-2" />
                  <span className="text-[10px] font-bold uppercase">Sem metas</span>
                </div>
              )}
            </Card>
          );
        })}
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
