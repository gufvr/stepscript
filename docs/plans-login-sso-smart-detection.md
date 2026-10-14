# StepScript: Login, SSO e detecção inteligente

Este documento define duas evoluções independentes para a automação assistida do StepScript. A implementação deve preservar gravação, reprodução, schemas, storage, geradores e fluxos atuais, salvo mudança explicitamente aprovada em um plano posterior.

## PLAN 1 — Login adaptativo e SSO

**Objetivo:** tornar a automação de login mais flexível e incluir suporte assistido a SSO, sem guardar senhas, tokens ou códigos de MFA.

### BUILD 1A — Login adaptativo

- Detectar identificador e senha separadamente, sem exigir senha quando o formulário não tiver campo de senha.
- Reconhecer campos por `label`, `autocomplete`, `name`, `id`, `placeholder`, `type`, `aria-label` e relações semânticas com o formulário visível.
- Suportar variações comuns de identificador (e-mail, usuário ou telefone) e botões de avançar/entrar.
- Deixar o usuário revisar e corrigir os campos detectados antes de executar.
- Preencher somente dados de teste informados para a execução atual; nunca persistir senha.
- Ao registrar os passos, manter o identificador conforme a política atual de captura e salvar senha apenas como valor protegido, nunca em texto simples.
- Limitar a execução a uma submissão explicitamente confirmada; não repetir automaticamente após erro, redirecionamento ou timeout.

### BUILD 1B — SSO assistido

- Reconhecer botões e links de SSO por texto acessível e sinais como `provider`, `oauth`, `openid`, `saml`, além de provedores conhecidos (Google, Microsoft, Okta e outros).
- Mostrar o provedor e o destino detectados para o usuário confirmar antes de abrir ou acionar o fluxo.
- Permitir registrar o início do fluxo e a navegação de retorno para o site de origem como passos revisáveis.
- Entregar o controle ao provedor depois da confirmação. Não preencher credenciais do provedor, não capturar senha, token, código de MFA, cookies ou conteúdo de páginas de autenticação externas.
- Tratar MFA, CAPTCHA, consentimento e etapas fora do site autorizado como ações manuais; não tentar contorná-los.
- Se não for possível determinar com segurança o provedor, o destino ou o retorno, oferecer apenas inspeção/registro manual, sem clicar.

### AGENT 1 — Implementação

Implementar o PLAN 1 em duas etapas: primeiro o Login adaptativo (BUILD 1A), depois SSO assistido (BUILD 1B). Antes de cada etapa, inspecionar a implementação atual e criar testes de unidade, integração e E2E para os casos aplicáveis. Preservar os caminhos atuais de gravação, reprodução e exportação; não alterar permissões do manifest sem plano e aprovação próprios. Manter credenciais exclusivamente em memória durante a execução e nunca persistir senhas, tokens, cookies ou códigos de MFA. O SSO deve exigir confirmação para cada acionamento e deixar autenticação no provedor sob controle do usuário. Executar validações focadas e a suíte relevante; registrar limitações e casos não suportados no handoff. Não criar commit ou push.

### Critérios de aceite do PLAN 1

- Login funciona com usuário/e-mail/telefone e senha opcional quando o formulário não exige senha.
- O usuário pode revisar os alvos detectados antes do preenchimento/envio.
- Passos registrados nunca contêm o valor da senha; testes verificam ausência de credenciais em storage, logs, erros e exports.
- SSO só é acionado após confirmação visível e explícita, e a extensão não interage com campos de autenticação do provedor.
- Redirecionamentos, MFA, CAPTCHA, páginas externas e retorno incompleto não causam repetição ou envio automático.
- Fluxos existentes continuam passando seus testes de regressão.

## PLAN 2 — Detecção inteligente de formulário e contexto

**Objetivo:** identificar a tarefa provável da aba atual e oferecer uma automação compatível, explicando os sinais usados e permitindo ao usuário escolher ou corrigir a sugestão.

### BUILD 2A — Inspeção do contexto visível

- Analisar apenas a aba ativa e elementos visíveis no DOM: formulários, rótulos, tipos de campo, botões, texto acessível, títulos, landmarks e fragmento da URL.
- Classificar sinais para casos como login, SSO, cadastro, busca, formulário multi-etapas, OTP e mensagens de erro visíveis.
- Não inferir conteúdo que não esteja acessível no DOM nem afirmar que “entendeu a tela” por OCR/visão computacional.
- Ignorar campos ocultos, conteúdo de iframes de terceiros e elementos fora do documento principal, salvo suporte explicitamente projetado e autorizado.
- Retornar uma sugestão estruturada com tipo provável, nível de confiança, formulário/elementos candidatos e motivos curtos.

### BUILD 2B — Escolha e execução guiadas

- Exibir sugestões em uma área de inspeção, sem executar ações automaticamente.
- Permitir escolher entre as tarefas compatíveis encontradas, corrigir formulário/campos e cancelar.
- Desabilitar execução quando houver ambiguidade relevante; explicar como resolver, em vez de escolher silenciosamente um formulário.
- Pedir confirmação antes de preencher, enviar formulário ou navegar. Restringir a execução ao contexto autorizado da aba e documento atuais.
- Mostrar o resultado por etapa e permitir exportar o que foi executado pelos geradores atuais, sem incluir segredos.

### AGENT 2 — Implementação

Implementar o PLAN 2 depois do BUILD 1A, reutilizando a detecção de login existente e os classificadores do PLAN 1, sem duplicar heurísticas. Começar por um serviço de inspeção somente leitura, tipado e limitado a elementos visíveis no DOM da aba principal; retornar candidatos, confiança e justificativas. Integrar a interface para revisão/correção do usuário e exigir confirmação separada para ações que preencham, enviem ou naveguem. Usar detecção determinística; não adicionar OCR, envio de conteúdo da página a serviços externos, novas permissões ou dependências sem um plano e aprovação próprios. Cobrir casos sem formulário, formulários múltiplos, baixa confiança, conteúdo dinâmico, hash/fragmento, troca de aba/documento e páginas não autorizadas com testes. Preservar os fluxos atuais e não criar commit ou push.

### Critérios de aceite do PLAN 2

- A inspeção é somente leitura e não altera campos nem envia formulários.
- Sugestões apontam os elementos e sinais visíveis que justificam a classificação.
- Múltiplos formulários ou baixa confiança resultam em escolha/correção manual, não em execução silenciosa.
- A execução exige autorização e confirmação no contexto atual; troca de aba, documento ou origem invalida a inspeção pendente.
- Conteúdo analisado permanece local; nenhuma captura de tela, credencial ou dado da página é transmitido externamente.
- Testes de regressão confirmam que gravar, reproduzir e exportar fluxos atuais continuam funcionando.

## Ordem sugerida

1. PLAN 1 / BUILD 1A: consolidar Login adaptativo.
2. PLAN 1 / BUILD 1B: acrescentar SSO assistido.
3. PLAN 2 / BUILD 2A: criar inspeção inteligente somente leitura.
4. PLAN 2 / BUILD 2B: integrar sugestões revisáveis e execução confirmada.

Cada BUILD deve ser tratado como entrega local isolada, com seu próprio handoff e decisão antes de qualquer publicação na Chrome Web Store.
