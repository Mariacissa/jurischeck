# Funções de servidor ainda necessárias

Implemente e teste funções server-side para:
- `analyze-document`: receber arquivo autenticado, extrair referências, consultar fontes oficiais, guardar URL, data/hora, trecho de evidência e método de busca.
- `create-checkout`: criar sessão de pagamento no gateway escolhido.
- `payment-webhook`: validar assinatura do webhook e atualizar assinatura no banco.
- `expire-trial`: aplicar regra de 7 dias no servidor.

Não coloque chaves secretas de IA, gateway ou credenciais de tribunais no frontend. Não classifique “não encontrado” como “falso” sem evidência suficiente. Registre limites e falhas de busca.
