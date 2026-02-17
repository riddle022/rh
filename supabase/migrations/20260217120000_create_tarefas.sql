-- Create tarefas table
CREATE TABLE IF NOT EXISTS tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  status text NOT NULL CHECK (status IN ('Pendente', 'Em Andamento', 'Concluída')) DEFAULT 'Pendente',
  prioridade text NOT NULL CHECK (prioridade IN ('Alta', 'Média', 'Baixa')) DEFAULT 'Média',
  tipo text NOT NULL CHECK (tipo IN ('Entrevista', 'Feedback', 'Treinamento', 'Documentação', 'Geral')) DEFAULT 'Geral',
  data_vencimento date NOT NULL DEFAULT CURRENT_DATE,
  funcionario_id uuid REFERENCES funcionarios(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(status);
CREATE INDEX IF NOT EXISTS idx_tarefas_funcionario ON tarefas(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_vencimento ON tarefas(data_vencimento);

-- Enable RLS
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Usuarios autenticados pueden ver tareas"
  ON tarefas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear tareas"
  ON tarefas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar tareas"
  ON tarefas FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden eliminar tareas"
  ON tarefas FOR DELETE
  TO authenticated
  USING (true);
