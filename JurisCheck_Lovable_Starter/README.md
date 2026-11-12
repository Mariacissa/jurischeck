# JurisCheck — starter para Lovable

Aplicação React + Vite em português, preparada para evoluir como SaaS de conferência assistida de peças jurídicas.

## Importar na Lovable
1. Descompacte este ZIP.
2. Envie o projeto para um repositório GitHub.
3. Na Lovable, importe/conecte o repositório.
4. Configure as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em Secrets/Environment Variables.
5. Execute o SQL de `supabase/schema.sql` no SQL Editor do seu projeto Supabase.

## O que já está no starter
- Interface responsiva com painel, upload de PDF/DOCX, histórico demonstrativo e planos.
- Extração de texto no navegador para PDF e DOCX.
- Relatório de demonstração com status claramente identificado como simulação.
- Cliente Supabase opcional, pronto para autenticação e persistência.
- Modelo inicial de banco com RLS e tabela de revisões.

## Importante — antes de vender
A análise jurídica real **não está implementada neste starter**. A tela de demonstração não consulta STF/STJ nem valida precedentes. Não use resultados simulados para orientar processos ou clientes. A etapa seguinte exige integrar uma função de servidor que consulte fontes oficiais, preserve evidências e diferencie “não localizado” de “inexistente”. Nunca exponha chaves de IA no navegador.

Também não há cobrança ativa. Os preços aparecem como configuração comercial; checkout, renovação, cancelamento e webhooks precisam ser integrados e testados (por exemplo, Stripe ou outro gateway disponível no Brasil). O prazo de 7 dias deve ser controlado no servidor, não apenas no front-end.

## Segurança e conformidade
- Configure políticas RLS e buckets privados antes de armazenar peças reais.
- Não envie documentos sigilosos para serviços de terceiros sem base legal, transparência e controles adequados.
- Defina retenção, exclusão, logs, backups, termos de uso e política de privacidade conforme LGPD.
- Faça revisão de segurança e testes jurídicos com profissionais antes do lançamento.

## Scripts
`npm install` · `npm run dev` · `npm run build`
