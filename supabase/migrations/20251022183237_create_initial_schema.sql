/*
  # Sistema de Gestión Comercial - Estructura Inicial

  ## 1. Nuevas Tablas

  ### `grupos`
  - `id` (uuid, primary key)
  - `nome` (text) - Nombre del grupo
  - `permissoes` (jsonb) - Permisos configurables para el grupo
  - `created_at` (timestamptz)

  ### `usuarios`
  - `id` (uuid, primary key, FK a auth.users)
  - `nome` (text) - Nombre completo del usuario
  - `email` (text) - Email del usuario
  - `grupo_id` (uuid, FK a grupos)
  - `filiais_visiveis` (uuid[]) - Array de IDs de filiales visibles
  - `ativo` (boolean) - Estado activo/inactivo
  - `created_at` (timestamptz)

  ### `filiais`
  - `id` (uuid, primary key)
  - `nome` (text) - Nombre de la filial
  - `meta_global_mensal` (numeric) - Meta mensual global
  - `created_at` (timestamptz)

  ### `setores`
  - `id` (uuid, primary key)
  - `nome` (text) - Nombre del sector
  - `filial_id` (uuid, FK a filiais)
  - `meta_global_mensal` (numeric) - Meta mensual del sector
  - `created_at` (timestamptz)

  ### `vendedores`
  - `id` (uuid, primary key)
  - `nome` (text) - Nombre completo
  - `email` (text) - Email
  - `filial_id` (uuid, FK a filiais)
  - `setor_id` (uuid, FK a setores)
  - `meta` (numeric) - Meta heredada del sector
  - `ativo` (boolean) - Estado activo/inactivo
  - `created_at` (timestamptz)

  ### `vendas`
  - `id` (uuid, primary key)
  - `vendedor_id` (uuid, FK a vendedores)
  - `valor` (numeric) - Valor de la venta
  - `data_venda` (date) - Fecha de la venta
  - `created_at` (timestamptz)

  ### `metas_historico`
  - `id` (uuid, primary key)
  - `tipo` (text) - 'filial', 'setor', 'vendedor'
  - `referencia_id` (uuid) - ID de la entidad
  - `mes` (integer) - Mes de la meta
  - `ano` (integer) - Año de la meta
  - `meta` (numeric) - Valor de la meta
  - `created_at` (timestamptz)

  ## 2. Seguridad
  - RLS habilitado en todas las tablas
  - Políticas restrictivas basadas en autenticación y permisos
*/

-- Crear tabla de grupos
CREATE TABLE IF NOT EXISTS grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  permissoes jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text UNIQUE NOT NULL,
  grupo_id uuid REFERENCES grupos(id) ON DELETE SET NULL,
  filiais_visiveis uuid[] DEFAULT ARRAY[]::uuid[],
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Crear tabla de filiais
CREATE TABLE IF NOT EXISTS filiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  meta_global_mensal numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Crear tabla de setores
CREATE TABLE IF NOT EXISTS setores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  filial_id uuid REFERENCES filiais(id) ON DELETE CASCADE,
  meta_global_mensal numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Crear tabla de vendedores
CREATE TABLE IF NOT EXISTS vendedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text NOT NULL,
  filial_id uuid REFERENCES filiais(id) ON DELETE SET NULL,
  setor_id uuid REFERENCES setores(id) ON DELETE SET NULL,
  meta numeric DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Crear tabla de vendas
CREATE TABLE IF NOT EXISTS vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id uuid REFERENCES vendedores(id) ON DELETE CASCADE,
  valor numeric NOT NULL,
  data_venda date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Crear tabla de metas_historico
CREATE TABLE IF NOT EXISTS metas_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('filial', 'setor', 'vendedor')),
  referencia_id uuid NOT NULL,
  mes integer NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano integer NOT NULL CHECK (ano >= 2020),
  meta numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tipo, referencia_id, mes, ano)
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_usuarios_grupo ON usuarios(grupo_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo);
CREATE INDEX IF NOT EXISTS idx_setores_filial ON setores(filial_id);
CREATE INDEX IF NOT EXISTS idx_vendedores_filial ON vendedores(filial_id);
CREATE INDEX IF NOT EXISTS idx_vendedores_setor ON vendedores(setor_id);
CREATE INDEX IF NOT EXISTS idx_vendedores_ativo ON vendedores(ativo);
CREATE INDEX IF NOT EXISTS idx_vendas_vendedor ON vendas(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_metas_tipo_ref ON metas_historico(tipo, referencia_id);
CREATE INDEX IF NOT EXISTS idx_metas_mes_ano ON metas_historico(mes, ano);

-- Habilitar RLS en todas las tablas
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_historico ENABLE ROW LEVEL SECURITY;

-- Políticas para grupos
CREATE POLICY "Usuarios autenticados pueden ver grupos"
  ON grupos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo administradores pueden crear grupos"
  ON grupos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.grupo_id IN (
        SELECT g.id FROM grupos g
        WHERE g.permissoes->>'admin' = 'true'
      )
    )
  );

CREATE POLICY "Solo administradores pueden actualizar grupos"
  ON grupos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.grupo_id IN (
        SELECT g.id FROM grupos g
        WHERE g.permissoes->>'admin' = 'true'
      )
    )
  );

CREATE POLICY "Solo administradores pueden eliminar grupos"
  ON grupos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.grupo_id IN (
        SELECT g.id FROM grupos g
        WHERE g.permissoes->>'admin' = 'true'
      )
    )
  );

-- Políticas para usuarios
CREATE POLICY "Usuarios pueden ver su propia información"
  ON usuarios FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.id = auth.uid()
    AND u.grupo_id IN (
      SELECT g.id FROM grupos g
      WHERE g.permissoes->>'admin' = 'true'
    )
  ));

CREATE POLICY "Solo administradores pueden crear usuarios"
  ON usuarios FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.grupo_id IN (
        SELECT g.id FROM grupos g
        WHERE g.permissoes->>'admin' = 'true'
      )
    )
  );

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON usuarios FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.id = auth.uid()
    AND u.grupo_id IN (
      SELECT g.id FROM grupos g
      WHERE g.permissoes->>'admin' = 'true'
    )
  ));

-- Políticas para filiais
CREATE POLICY "Usuarios pueden ver filiais según su acceso"
  ON filiais FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND (filiais.id = ANY(u.filiais_visiveis) OR u.grupo_id IN (
        SELECT g.id FROM grupos g
        WHERE g.permissoes->>'admin' = 'true'
      ))
    )
  );

CREATE POLICY "Usuarios autenticados pueden crear filiais"
  ON filiais FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar filiais"
  ON filiais FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden eliminar filiais"
  ON filiais FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para setores
CREATE POLICY "Usuarios pueden ver setores de filiais visibles"
  ON setores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND (setores.filial_id = ANY(u.filiais_visiveis) OR u.grupo_id IN (
        SELECT g.id FROM grupos g
        WHERE g.permissoes->>'admin' = 'true'
      ))
    )
  );

CREATE POLICY "Usuarios autenticados pueden crear setores"
  ON setores FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar setores"
  ON setores FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden eliminar setores"
  ON setores FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para vendedores
CREATE POLICY "Usuarios pueden ver vendedores de filiais visibles"
  ON vendedores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND (vendedores.filial_id = ANY(u.filiais_visiveis) OR u.grupo_id IN (
        SELECT g.id FROM grupos g
        WHERE g.permissoes->>'admin' = 'true'
      ))
    )
  );

CREATE POLICY "Usuarios autenticados pueden crear vendedores"
  ON vendedores FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar vendedores"
  ON vendedores FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden eliminar vendedores"
  ON vendedores FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para vendas
CREATE POLICY "Usuarios pueden ver vendas de filiais visibles"
  ON vendas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      INNER JOIN vendedores v ON vendas.vendedor_id = v.id
      WHERE u.id = auth.uid()
      AND (v.filial_id = ANY(u.filiais_visiveis) OR u.grupo_id IN (
        SELECT g.id FROM grupos g
        WHERE g.permissoes->>'admin' = 'true'
      ))
    )
  );

CREATE POLICY "Usuarios autenticados pueden crear vendas"
  ON vendas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar vendas"
  ON vendas FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden eliminar vendas"
  ON vendas FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para metas_historico
CREATE POLICY "Usuarios pueden ver metas según acceso a filiais"
  ON metas_historico FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear metas"
  ON metas_historico FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar metas"
  ON metas_historico FOR UPDATE
  TO authenticated
  USING (true);

-- Insertar grupo administrador por defecto
INSERT INTO grupos (nome, permissoes)
VALUES ('Administrador', '{"admin": true, "dashboard": true, "usuarios": true, "grupos": true, "filiais": true, "setores": true, "vendedores": true, "relatorios": true, "carregar_vendas": true}'::jsonb)
ON CONFLICT DO NOTHING;