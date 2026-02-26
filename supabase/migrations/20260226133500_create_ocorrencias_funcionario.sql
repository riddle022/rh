-- Create ocorrencias_funcionario table
CREATE TABLE IF NOT EXISTS public.ocorrencias_funcionario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    data_ocorrencia DATE NOT NULL DEFAULT CURRENT_DATE,
    descricao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ocorrencias_funcionario ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified, assuming authenticated access for now as per other tables)
CREATE POLICY "Enable all for authenticated users" ON public.ocorrencias_funcionario
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Migrate existing data
INSERT INTO public.ocorrencias_funcionario (funcionario_id, tipo, data_ocorrencia, descricao)
SELECT id, 'Histórico Migrado', CURRENT_DATE, ocorrencias
FROM public.funcionarios
WHERE ocorrencias IS NOT NULL AND ocorrencias <> '';

-- Drop old column
-- ALTER TABLE public.funcionarios DROP COLUMN ocorrencias;
-- Wait, I'll keep it for a bit just in case, or drop it if the user is ok.
-- The plan said "Remover a coluna ocorrencias (após migrar os dados existentes)".
-- I'll drop it to be clean as per the plan.
ALTER TABLE public.funcionarios DROP COLUMN IF EXISTS ocorrencias;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ocorrencias_funcionario_updated_at
    BEFORE UPDATE ON public.ocorrencias_funcionario
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
