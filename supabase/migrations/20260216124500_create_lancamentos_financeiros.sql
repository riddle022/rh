-- Create lancamentos_financeiros table
CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('Comissao', 'Bonificacao', 'Horas extras')),
  funcionario_id uuid REFERENCES funcionarios(id) ON DELETE CASCADE,
  mes integer NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano integer NOT NULL CHECK (ano >= 2020),
  valor numeric NOT NULL DEFAULT 0,
  descricao text,
  data_lancamento date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_lancamentos_funcionario ON lancamentos_financeiros(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo ON lancamentos_financeiros(tipo);
CREATE INDEX IF NOT EXISTS idx_lancamentos_periodo ON lancamentos_financeiros(mes, ano);

-- Enable RLS
ALTER TABLE lancamentos_financeiros ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Usuarios autenticados pueden ver lancamentos"
  ON lancamentos_financeiros FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear lancamentos"
  ON lancamentos_financeiros FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar lancamentos"
  ON lancamentos_financeiros FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden eliminar lancamentos"
  ON lancamentos_financeiros FOR DELETE
  TO authenticated
  USING (true);
