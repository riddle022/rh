export interface Filial {
  id: string;
  nome: string;
  endereco: string;
  meta_global: number;
  created_at: string;
  updated_at: string;
}

export interface Setor {
  id: string;
  nome: string;
  filial_id: string;
  tipo: 'vendas' | 'operacional';
  meta_mensal: number;
  mes: number;
  ano: number;
  created_at: string;
  updated_at: string;
  filial?: Filial;
}

export interface Departamento {
  id: string;
  nome: string;
  created_at: string;
  updated_at: string;
}

export interface Cargo {
  id: string;
  nome: string;
  departamento_id: string;
  created_at: string;
  updated_at: string;
  departamento?: Departamento;
}

export interface Vendedor {
  id: string;
  nome: string;
  email: string;
  filial_id: string;
  setor_id: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  filial?: Filial;
  setor?: Setor;
}

export interface Venda {
  id: string;
  vendedor_id: string;
  valor: number;
  data_venda: string;
  mes: number;
  ano: number;
  created_at: string;
  updated_at: string;
  vendedor?: Vendedor;
}

export interface Grupo {
  id: string;
  nome: string;
  permissoes: Record<string, any>;
  filiais: string[];
  created_at: string;
  updated_at: string;
}

export interface Funcionario {
  id: string;
  nome: string;
  email: string | null;
  filial_id: string;
  setor_id: string | null;
  departamento_id: string | null;
  cargo_id: string | null;
  salario_base: number;
  data_admissao: string;
  data_desvinculamento: string | null;
  regime_contratacao: 'CLT' | 'PJ' | 'Estágio';
  sexo: string | null;
  documento: string | null;
  cpf: string | null;
  pix: string | null;
  data_nascimento: string | null;
  celular: string | null;
  contato_emergencia_nome: string | null;
  contato_emergencia_parentesco: string | null;
  contato_emergencia_telefone: string | null;
  plano_saude: boolean;
  horas_extras_registro: string | null;
  ocorrencias: string | null;
  ferias_inicio: string | null;
  ferias_fim: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  filial?: Filial;
  setor?: Setor;
  departamento?: Departamento;
  cargo_rel?: Cargo;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  grupo_id: string | null;
  filial_id: string | null;
  setor_id: string | null;
  departamento_id: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  grupo?: Grupo;
  filial?: Filial;
  setor?: Setor;
  departamento?: Departamento;
}

export interface ValeMercadoriaData {
  id: string;
  funcionario_id: string;
  valor_total: number;
  parcelas_total: number;
  status: 'ativo' | 'quitado' | 'cancelado';
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  funcionario?: Funcionario;
  parcelas?: ValeMercadoriaParcela[];
}

export interface ValeMercadoriaParcela {
  id: string;
  vale_id: string;
  num_parcela: number;
  valor: number;
  data_vencimento: string;
  pago: boolean;
  data_pagamento: string | null;
  created_at: string;
}

export interface EscalaGrupo {
  id: string;
  nome: string;
  filial_id: string;
  created_at: string;
  updated_at: string;
}

export interface Escala {
  id: string;
  grupo_id: string;
  nome: string;
  mes: number;
  ano: number;
  created_at: string;
  updated_at: string;
}

export interface EscalaEntrada {
  id: string;
  escala_id: string;
  funcionario_id: string;
  dia: number;
  turno: string | null;
  created_at: string;
}

export interface LancamentoFinanceiro {
  id: string;
  tipo: 'Comissao' | 'Bonificacao' | 'Horas extras';
  funcionario_id: string;
  mes: number;
  ano: number;
  valor: number;
  descricao: string | null;
  data_lancamento: string;
  created_at: string;
  funcionario?: Funcionario;
}
