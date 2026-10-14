# StepScript — SSO assistido (BUILD 1B)

Data: 2026-10-13

## Resultado

Implementado fluxo assistido de SSO separado do Login adaptativo. O usuário analisa opções na página autorizada, revisa provedor/ação/destino sanitizado e inicia somente pelo botão explícito de confirmação. O fluxo nunca preenche credenciais nem lê conteúdo da página externa.

## Evidências

| Área | Evidência | Resultado |
| --- | --- | --- |
| Detecção | Links, botões e `role=button`; texto acessível e caminhos/parâmetros indicativos de OAuth/OIDC/SAML | Google, Microsoft e Okta só ficam executáveis em host HTTPS reconhecido; casos incertos ficam manuais |
| Revisão | Side Panel exibe provedor, ação e URL sem query/hash; conteúdo de identificação evidente e seletores com aparência secreta são omitidos/redigidos | Aprovado por testes de componente |
| Confirmação/cancelamento | Inspeção não clica; iniciar revalida documento, destino e opção. Sem confirmar, a página e a lista de passos permanecem intactas | Aprovado por testes de componente e E2E |
| Proteção de dados | Sem captura de credenciais, tokens, cookies, MFA, CAPTCHA ou consentimentos; páginas externas não são inspecionadas | Aprovado nos testes de integração/E2E; parâmetros OAuth ausentes dos passos |
| Registro/retorno | O início é um passo de clique existente; retorno validado ao domínio de origem é um passo de navegação existente | Aprovado com provedor sintético, navegação observada apenas por URL/origem |
| Compatibilidade | Sem mudanças em manifest/permissões, versão, schemas, modelos de armazenamento, geradores, gravação ou replay | Confirmado no diff e no build |
| Testes | `npm test -- --maxWorkers=4` | 70 arquivos e 514 testes passaram |
| Build/lint | `npm run build`, `npm run lint`, `git diff --check` | Aprovados |
| E2E | `tests/extension-e2e/sso-assisted.e2e.ts` | 2 testes passaram; identidade externa foi simulada localmente, sem contato com provedor real |

## Limitações conhecidas

- Só são iniciáveis destinos HTTPS explícitos em domínios reconhecidos. Redirecionadores próprios do site, IdPs corporativos não reconhecidos e botões sem destino estático exigem continuação manual.
- O StepScript registra o início e pode observar o retorno por aba/origem. Acompanhamento do status é em memória; se o navegador encerrar o service worker ou o Side Panel durante a autenticação, o retorno pode não ser registrado. O passo inicial permanece salvo e o usuário deve conferir o resultado manualmente.
- O teste E2E usa um provedor sintético de `accounts.google.com`; nenhum login ou consentimento real foi iniciado.
- Verificações de status HTTP/rede e leitura do console não fazem parte deste BUILD.

## Fora do escopo executado

Sem alteração de produto além do fluxo SSO assistido; sem pacote, upload, publicação, commit ou push.

## Revisão ASK, plano e execução de validação — 2026-10-13

Esta seção complementa as evidências anteriores. O resultado atual é **validação manual pendente e SSO ainda sem aprovação final**. Os testes históricos com provedor sintético não demonstram um login real nem substituem o checklist de Chrome/Side Panel.

### Novidade implementada nesta rodada

- A Automação de passos agora oferece `Limpar` para remover os resultados, feedbacks e opções de exportação da seção. O botão fica desabilitado durante uma execução de replay ou operação pendente.
- A limpeza é local ao componente; não envia `CLEAR_RECORDED_STEPS`, não modifica `chrome.storage` e não desfaz ações já realizadas no site. A lista de passos gravados continua com o seu controle próprio `Limpar tudo`.
- Os botões de exportação reutilizam `/icons/playwright-logo.svg` e `/icons/cypress-logo.svg`, com imagens decorativas de 18px e layout que permite quebra de linha no painel estreito. Nenhum asset foi criado ou alterado.
- As únicas mudanças de produto desta rodada estão em `src/components/ReplayControls.tsx`; a lógica de SSO foi apenas revisada.

### ASK — achados de revisão

| Prioridade | Achado e evidência | Implicação |
| --- | --- | --- |
| Alta | `safeAutomationUrl` remove query/hash, mas preserva o caminho da URL que `createSsoStartStep` salva. A verificação local com `https://app.example.test/auth/callback/QA_FAKE_CODE_123?code=QA_FAKE_QUERY#token=QA_FAKE_HASH` retornou `https://app.example.test/auth/callback/QA_FAKE_CODE_123`. | Não há base para garantir ausência de tokens/códigos colocados no caminho da URL. Só marcadores fictícios foram usados nesta revisão; nenhum segredo real foi acessado. |
| Alta | `recordSsoStart` salva o passo antes da chamada final a `ssoInPage('start')`. Se essa chamada falhar por mudança de DOM/documento, o registro inicial já existe. | O passo pode afirmar um clique que não aconteceu; o status precisa distinguir tentativa, clique e falha. |
| Alta | A rechecagem de gravação dentro de `recordSsoStart` retorna sem lançar erro quando a gravação começou. `runSsoAutomation` continua para o clique depois que esse callback retorna. | Uma corrida entre gravação e SSO pode ultrapassar o bloqueio inicial. Deve ser corrigida antes de aprovar o fluxo. |
| Média | A UI exibe exportação quando existe `ssoFlow`, mas `exportResult` só processa `automationExport` ou replay com `phase === 'completed'`. | Uma execução apenas de SSO pode exibir os botões e responder “Conclua uma automação antes de exportar”. A inclusão dos ícones não corrige esse comportamento existente. |
| Média | `ssoFlow` é mantido em memória; `tabs.onRemoved` não atualiza esse fluxo e não existe prazo de encerramento. | Fechamento de aba, popup bloqueado, falta de navegação ou suspensão do worker podem deixar feedback incompleto. |
| Cobertura | O fixture SSO registra um clique em botão `data-url` que não navega. O E2E faz a navegação externa e o retorno por `page.goto` separado. | Evidência válida para clique e observador de URL; abertura real do provedor, popup, MFA, CAPTCHA e consentimento continuam sem validação manual. |

A revisão confirmou que o código SSO só injeta a inspeção/ação no documento de origem autorizado e que o observador externo usa metadados de navegação. Isso não comprova uma garantia geral de ausência de dados sensíveis, devido ao achado de URL acima. Não foi iniciada autenticação real.

### PLAN — checklist manual definido

Build unpacked: `D:\www\projs\qa\flowsnap\dist`. Manifest: StepScript `0.5.1`, com as permissões existentes. Usar exclusivamente página de teste e valores fictícios; login real requer ambiente de teste previamente definido.

| Caso | Procedimento e resultado esperado | Estado nesta rodada |
| --- | --- | --- |
| Detecção | Reabrir pelo ícone na aba autorizada, escolher SSO e analisar. Conferir opções Google/Microsoft/Okta com URL explícita; registrar também botões sem destino estático. | Pendente no Chrome |
| Revisão | Conferir provedor, ação, URL sanitizada e ausência dos marcadores fictícios de query/hash nos resultados e passos. Incluir códigos fictícios no caminho como teste negativo. | Pendente; limitação de caminho já confirmada localmente |
| Cancelamento | Analisar e fechar antes de confirmar. Não deve haver clique, navegação ou novo passo. | Pendente no Side Panel real; cobertura histórica sintética |
| Confirmação | Confirmar uma vez em página de teste. Verificar o clique, a navegação real e o passo inicial. Não repetir automaticamente após erro ou timeout. | Pendente; o fixture atual não abre provedor |
| Provedor desconhecido | Usar IdP fictício/ambíguo e conflito entre texto e domínio. A opção deve exigir continuação manual. | Pendente no Chrome; testes locais de opção desconhecida passaram |
| MFA/CAPTCHA/consentimento | Somente em sandbox aprovado: o proprietário realiza as ações manualmente. A extensão não preenche nem registra credenciais, códigos ou escolhas do provedor. | Não executado; nenhum sandbox de identidade fornecido |
| Retorno | Observar retorno à origem após saída em mesma aba e popup. Revisar passo de retorno sem assumir que autenticação foi bem-sucedida. | Pendente; cobertura histórica é navegação sintética |
| Falha/encerramento | Trocar/fechar a aba, bloquear popup e interromper antes do retorno. Registrar feedback e verificar ausência de tentativas automáticas. | Pendente; limitações de status identificadas na revisão |
| Novos controles | Produzir resultado de scan, conferir ícones e limpar. O resultado/exportação desaparece e os passos gravados permanecem. Conferir painel estreito e teclado. | Comportamento coberto por testes; aparência manual pendente |

### AGENT — evidências executadas e pendências

| Verificação | Resultado |
| --- | --- |
| Conexão Chrome | O Browser runtime foi inicializado; `agent.browsers.get('chrome')` informou indisponibilidade e a listagem retornou `[]`. Não há navegador conectado nesta sessão. |
| Validação manual solicitada | **Não executada.** A escolha explícita de Chrome foi preservada; nenhum outro navegador foi utilizado para representar esse teste manual. |
| Testes locais relevantes | `npm test -- --maxWorkers=2 src/components/ReplayControls.test.tsx src/automation/ssoInPage.test.ts src/integration/capture/ssoAutomation.integration.test.ts src/automation/automationExport.test.ts`: 4 arquivos, **18 testes aprovados**. |
| Lint e build | `npm run lint` e `npm run build`: aprovados. O build unpacked foi atualizado em `dist`; nenhum ZIP foi produzido. |
| Manifest e ícones | Os hashes SHA-256 de `public/manifest.json` e `dist/manifest.json` coincidem. Os hashes de cada SVG reutilizado também coincidem entre `public/icons` e `dist/icons`. Manifest, permissões e assets não foram alterados. |
| Segurança da revisão | Inspeção de código e marcadores fictícios somente; nenhuma conta, senha, cookie, token real, MFA ou página de provedor foi acessada. Garantia geral de não captura permanece pendente por causa da sanitização incompleta do caminho da URL. |
| Git | `git diff --check` aprovado. Sem commit ou push. |

Para continuar a execução manual, conectar o Chrome pela configuração de Computer use do aplicativo e utilizar um ambiente SSO de teste identificado. Os achados de revisão devem ser tratados em uma BUILD corretiva separada, preservando a divisão de escopo desta rodada.
