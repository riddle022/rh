import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  history: Message[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const deepseekApiKey = Deno.env.get('COMERCIAL_KEY');

    if (!deepseekApiKey) {
      return new Response(
        JSON.stringify({
          error: 'API Key n\u00e3o configurada. Por favor, configure COMERCIAL_KEY nos secrets do Supabase. Consulte CONFIGURAR_DEEPSEEK.md para instru\u00e7\u00f5es.',
          needsConfiguration: true,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { message, history }: ChatRequest = await req.json();

    const dbContext = await getDatabaseContext(supabase);

    const systemPrompt = `Voc\u00ea \u00e9 um assistente IA especializado em an\u00e1lise comercial e contabilidade para uma empresa de varejo.

Voc\u00ea tem acesso TOTAL ao banco de dados da empresa e pode responder qualquer pergunta sobre:
- Vendas (valores, datas, per\u00edodos)
- Vendedores (performance, metas, rankings)
- Filiais (unidades, localiza\u00e7\u00f5es, metas globais)
- Setores (departamentos, metas mensais)
- Usu\u00e1rios e Grupos (permiss\u00f5es, acessos)
- Metas (globais, setoriais, mensais)

# ESQUEMA DO BANCO DE DADOS:

${dbContext.schema}

# DADOS ATUAIS (AMOSTRA):

${dbContext.data}

# REGRAS IMPORTANTES:

- SEMPRE responda de forma CURTA e DIRETA
- V\u00e1 direto ao ponto, SEM introdu\u00e7\u00f5es ou contextos desnecess\u00e1rios
- Use formata\u00e7\u00e3o brasileira para valores (R$) e datas (dd/mm/yyyy)
- Seja espec\u00edfico e cite n\u00fameros quando dispon\u00edvel
- N\u00c3O forne\u00e7a insights, recomenda\u00e7\u00f5es ou an\u00e1lises de performance a menos que seja EXPLICITAMENTE solicitado
- N\u00c3O use emojis
- Se n\u00e3o tiver dados suficientes, diga apenas que n\u00e3o h\u00e1 dados
- Responda APENAS o que foi perguntado, nada mais
- IMPORTANTE: Quando o usu\u00e1rio perguntar por um vendedor espec\u00edfico, procure pelo NOME COMPLETO ou PARCIAL na lista de vendedores

# ESTILO DE RESPOSTA:

- CONCISO e OBJETIVO
- Sem introdu\u00e7\u00f5es ou conclus\u00f5es
- Apenas dados e n\u00fameros quando aplic\u00e1vel
- Sem an\u00e1lises n\u00e3o solicitadas
- Sem recomenda\u00e7\u00f5es n\u00e3o solicitadas
- Use bullets apenas se necess\u00e1rio para clareza

EXEMPLOS:

Pergunta: "Qual foi o total de vendas do ELIABE?"
Resposta correta: "ELIABE DANIEL SILVA SANTANA: R$ 20.752,00 em 2 vendas."
Resposta ERRADA: "Ol\u00e1! Vejo que voc\u00ea quer saber sobre o vendedor ELIABE... [longa explica\u00e7\u00e3o]"

Pergunta: "Quantos vendedores ativos?"
Resposta correta: "3 vendedores ativos."
Resposta ERRADA: "Atualmente temos 3 vendedores ativos. Isso representa... [an\u00e1lise n\u00e3o solicitada]"`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ];

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${error}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        usage: data.usage,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

async function getDatabaseContext(supabase: any) {
  try {
    const [vendasRes, vendedoresRes, filiaisRes, setoresRes] = await Promise.all([
      supabase.from('vendas').select('*, vendedor:vendedores(nome, id)').order('data_venda', { ascending: false }).limit(100),
      supabase.from('vendedores').select('*, filial:filiais(nome), setor:setores(nome)'),
      supabase.from('filiais').select('*'),
      supabase.from('setores').select('*, filial:filiais(nome)'),
    ]);

    const schema = `
## TABELA: filiais
- id (uuid): Identificador \u00fanico
- nome (text): Nome da filial
- endereco (text): Endere\u00e7o
- meta_global (numeric): Meta global da filial
- created_at, updated_at (timestamptz)

## TABELA: setores
- id (uuid): Identificador \u00fanico
- nome (text): Nome do setor/departamento
- filial_id (uuid): FK para filiais
- meta_mensal (numeric): Meta mensal do setor
- mes (integer 1-12): M\u00eas da meta
- ano (integer): Ano da meta
- created_at, updated_at (timestamptz)

## TABELA: vendedores
- id (uuid): Identificador \u00fanico
- nome (text): Nome do vendedor
- email (text): Email \u00fanico
- filial_id (uuid): FK para filiais
- setor_id (uuid): FK para setores
- ativo (boolean): Status ativo/inativo
- created_at, updated_at (timestamptz)

## TABELA: vendas
- id (uuid): Identificador \u00fanico
- vendedor_id (uuid): FK para vendedores
- valor (numeric): Valor da venda (>= 0)
- data_venda (date): Data da venda
- mes (integer): M\u00eas extra\u00eddo automaticamente
- ano (integer): Ano extra\u00eddo automaticamente
- created_at, updated_at (timestamptz)

## TABELA: metas_setor
- id (uuid): Identificador \u00fanico
- filial_id (uuid): FK para filiais
- setor_id (uuid): FK para setores
- mes (integer 1-12): M\u00eas
- ano (integer): Ano
- meta_mensal (numeric): Valor da meta

## TABELA: grupos
- id (uuid): Identificador \u00fanico
- nome (text): Nome do grupo
- permissoes (jsonb): Permiss\u00f5es do grupo
- filiais (uuid[]): Array de filiais permitidas
- created_at, updated_at (timestamptz)

## TABELA: usuarios
- id (uuid): FK para auth.users
- nome (text): Nome do usu\u00e1rio
- email (text): Email \u00fanico
- grupo_id (uuid): FK para grupos
- filial_id (uuid): FK para filiais
- setor_id (uuid): FK para setores
- ativo (boolean): Status ativo/inativo
- created_at, updated_at (timestamptz)
`;

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    };

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('pt-BR');
    };

    const vendas = vendasRes.data || [];
    const totalVendas = vendas.reduce((sum: number, v: any) => sum + Number(v.valor), 0);
    const avgVenda = vendas.length > 0 ? totalVendas / vendas.length : 0;
    const vendedores = vendedoresRes.data || [];
    const filiais = filiaisRes.data || [];
    const setores = setoresRes.data || [];

    const vendasPorVendedor = new Map();
    vendas.forEach((venda: any) => {
      const vendedorId = venda.vendedor_id;
      const vendedorNome = venda.vendedor?.nome || 'Desconhecido';

      if (!vendasPorVendedor.has(vendedorId)) {
        vendasPorVendedor.set(vendedorId, {
          id: vendedorId,
          nome: vendedorNome,
          total: 0,
          quantidade: 0,
        });
      }

      const stats = vendasPorVendedor.get(vendedorId);
      stats.total += Number(venda.valor);
      stats.quantidade += 1;
    });

    const topVendedores = Array.from(vendasPorVendedor.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);

    const data = `
### ESTAT\u00cdSTICAS GERAIS:

**Total de Vendas (\u00faltimas 100 registros):** ${formatCurrency(totalVendas)}
**Ticket M\u00e9dio:** ${formatCurrency(avgVenda)}
**Quantidade de Vendas:** ${vendas.length}
**Vendedores Ativos:** ${vendedores.filter((v: any) => v.ativo).length}
**Total de Vendedores:** ${vendedores.length}
**Total de Filiais:** ${filiais.length}
**Total de Setores:** ${setores.length}

### TOP 15 VENDEDORES (por valor nas \u00faltimas 100 vendas):
${topVendedores.map((v: any, index: number) =>
  `${index + 1}. **${v.nome}**: ${formatCurrency(v.total)} (${v.quantidade} vendas, ticket: ${formatCurrency(v.total / v.quantidade)})`
).join('\n')}

### LISTA COMPLETA DE VENDEDORES:
${vendedores.map((v: any) =>
  `- **${v.nome}** (ID: ${v.id.substring(0, 8)}...) - ${v.filial?.nome || 'Sem filial'} / ${v.setor?.nome || 'Sem setor'} - Status: ${v.ativo ? '\u2705 ATIVO' : '\u274c INATIVO'}`
).join('\n')}

### AMOSTRA DE VENDAS RECENTES (\u00faltimas 15):
${vendas.slice(0, 15).map((v: any) =>
  `- ${formatDate(v.data_venda)}: ${formatCurrency(v.valor)} - **${v.vendedor?.nome || 'Sem vendedor'}**`
).join('\n')}

### FILIAIS:
${filiais.map((f: any) =>
  `- **${f.nome}**: Meta Global ${formatCurrency(f.meta_global || 0)} - ${f.endereco}`
).join('\n')}

### SETORES:
${setores.map((s: any) =>
  `- **${s.nome}** (${s.filial?.nome || 'Sem filial'}): Meta ${s.mes}/${s.ano} = ${formatCurrency(s.meta_mensal)}`
).join('\n')}
`;

    return { schema, data };
  } catch (error) {
    console.error('Error getting database context:', error);
    return {
      schema: 'Error loading schema',
      data: 'Error loading data',
    };
  }
}