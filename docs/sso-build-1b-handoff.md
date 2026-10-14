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
