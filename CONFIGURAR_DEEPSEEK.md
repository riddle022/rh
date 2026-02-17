# Configurar DeepSeek API Key

Para que el Asistente IA funcione, necesitas configurar la API key de DeepSeek en Supabase.

## Pasos:

### 1. Obtener API Key de DeepSeek

1. Ve a https://platform.deepseek.com/
2. Crea una cuenta o inicia sesión
3. Ve a "API Keys"
4. Crea una nueva API key
5. Copia la key (empieza con `sk-`)

### 2. Configurar en Supabase

#### Opción A: Usando el Dashboard de Supabase

1. Ve a tu proyecto en https://supabase.com/dashboard
2. Ve a "Project Settings" > "Edge Functions" > "Secrets"
3. Agrega un nuevo secreto:
   - **Name:** `COMERCIAL_KEY`
   - **Value:** Tu API key de DeepSeek (sk-...)
4. Click en "Add Secret"

#### Opción B: Usando Supabase CLI

```bash
# Si tienes Supabase CLI instalado
supabase secrets set COMERCIAL_KEY=sk-your-deepseek-api-key
```

### 3. Verificar

Una vez configurado, el Asistente IA debería funcionar correctamente.

## Notas Importantes:

- La API key se guarda de forma segura en Supabase
- Nunca compartas tu API key públicamente
- La key solo es accesible desde Edge Functions (servidor)
- No se expone en el cliente

## Costo de DeepSeek:

DeepSeek es muy económico:
- Input: ~$0.14 por millón de tokens
- Output: ~$0.28 por millón de tokens
- Mucho más barato que GPT-4 o Claude

## Soporte:

Si tienes problemas, verifica:
1. Que la API key sea válida
2. Que el nombre del secreto sea exactamente `COMERCIAL_KEY`
3. Que tengas créditos en tu cuenta de DeepSeek
4. Los logs de Edge Function en Supabase Dashboard
