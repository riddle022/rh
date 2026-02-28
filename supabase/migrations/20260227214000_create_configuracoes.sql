-- Create configuracoes table
CREATE TABLE IF NOT EXISTS public.configuracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chave TEXT UNIQUE NOT NULL,
    valor JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable all for authenticated users" ON public.configuracoes
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Insert default vacation threshold if not exists
INSERT INTO public.configuracoes (chave, valor)
VALUES ('vacation_alert_threshold', '3'::jsonb)
ON CONFLICT (chave) DO NOTHING;

-- Trigger for updated_at
CREATE TRIGGER update_configuracoes_updated_at
    BEFORE UPDATE ON public.configuracoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
