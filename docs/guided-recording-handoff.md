# StepScript — gravação guiada

## Entrega

A gravação comum continua selecionada por padrão. A opção **Gravação guiada — destacar cada passo**, no controle de gravação, ativa o acompanhamento visual das interações reais do usuário. O painel mostra o passo mais recente e sua posição na sequência, com anúncio acessível. A página recebe somente um contorno decorativo no elemento associado.

O destaque não lê valores dos campos, não chama `focus`, não desloca a página, não clica, não preenche e não despacha eventos de interação. Usa `pointer-events: none !important` e `aria-hidden`; o feedback acessível está no Side Panel. A captura continua usando o gravador e a proteção de campos sensíveis existentes.

## Controles e contexto

| Controle ou evento | Comportamento |
| --- | --- |
| Pausar | Desativa o gravador, remove o destaque e cancela uma seleção de assertion aberta. Novas capturas e navegações não são acrescentadas durante a pausa. O estado de sessão existente continua reservado para impedir automações concorrentes. |
| Retomar | Revalida aba autorizada, origem e documento ativo; instala/ativa o gravador naquele documento. Não recupera ações realizadas durante a pausa. |
| Revisar passos | Pausa a captura ativa e seleciona o primeiro passo salvo. Destaca somente um elemento único, disponível e visível na URL e no documento originais. |
| Passo anterior / Avançar passo | Navegam pela revisão visual. Não executam passos, não mudam valores e não alteram a ordem dos registros. |
| Encerrar / Parar Gravação | Remove o destaque, encerra a captura pelo fluxo atual e mantém os passos. A revisão continua disponível. |
| Navegação na mesma origem | Remove o destaque anterior. A captura ativa usa a retomada atual do gravador no novo documento; uma sessão pausada permanece pausada. |
| Troca de aba ou origem | Pausa a gravação guiada e remove o destaque. Exige reabrir pelo ícone na aba de origem e retomar explicitamente. |
| Fechamento da aba | Mantém feedback de fechamento, inclusive quando o Chrome ativa outra aba em seguida. Não tenta retomar em uma aba diferente. |
| Elemento removido ou ocultado | Remove o destaque e apresenta feedback. Os passos já salvos permanecem intactos. |
| Formulários em etapas e componentes dinâmicos | Seguem as interações reais e os tipos de captura já suportados. Não descobrem nem executam cenários automaticamente. |

## Estado e compatibilidade

- Os schemas dos passos e de `recordingState` não mudaram. Não houve alteração de manifest, versão, permissões, dependências, assets, geradores, replay ou lógica de automação de Login/SSO.
- O controle usa uma chave adicional em `chrome.storage.session`, `guidedRecordingSession`, exclusivamente temporária e em memória do navegador. Contém origem, IDs de aba/documento/passos, fase e mensagens genéricas; não duplica valores, descrições, seletores, credenciais ou conteúdo dos passos.
- Esse estado permite restaurar pausa e referências de documento após o reinício do service worker. Não é enviado a serviços externos nem gravado em `chrome.storage.local`.
- Uma nova gravação comum limpa o controle guiado anterior. Gravações existentes e exportações mantêm seus formatos atuais.
- A lista usa a atualização atual por `chrome.storage.onChanged`; o controle consulta o estado do background a cada 600 ms enquanto está montado. A opção escolhida para uma próxima sessão não é uma preferência persistente.

## Evidências de validação

| Verificação | Evidência |
| --- | --- |
| Unidade | Contorno de campo protegido sem leitura do valor, mudança de foco ou clique; limpeza ao remover elemento e sair do documento; rejeição de URL desatualizada e seletor ambíguo. |
| Integração | Atualização ao capturar, pausa sem limpeza dos registros, captura rejeitada durante pausa, retomada, senha protegida, revisão sem replay, cancelamento de picker, troca de aba/origem, documento substituído e recuperação do estado após reinício do background. |
| E2E unpacked | Formulário fictício em etapas, campo protegido, contorno e foco preservado, pausa/retomada, revisão sem ações, remoção dinâmica, navegação, troca de aba, mudança de origem e fechamento. |
| Compatibilidade E2E | Gravação comum após navegação completa, contexto sem permissão pré-concedida, replay, Login adaptativo/OTP/segunda etapa e SSO com downloads Playwright/Cypress. |
| Suíte completa final | `npm test -- --maxWorkers=2`: 75 arquivos, 537 testes aprovados, exit code 0. Inclui recuperação da pausa após reinício do background. |
| E2E completo final | 16 testes aprovados, exit code 0, com Chromium unpacked e configuração temporária de servidor descrita abaixo. Três testes cobrem a gravação guiada; os demais cobrem os fluxos existentes. |
| Build, lint e diff | `npm run build`, `npm run lint` e `git diff --check` aprovados. Build unpacked atualizado em `dist/`; nenhum ZIP produzido. |

A primeira rodada E2E encontrou feedback de fechamento sobrescrito pela ativação da próxima aba; o caso foi corrigido e coberto. A configuração usual do servidor E2E ficou presa na finalização no Windows. As rodadas com conclusão limpa usaram uma configuração de teste temporária em `test-results/extension-e2e/direct.config.ts`, reaproveitando o servidor local de fixtures, sem mudar a configuração versionada ou o produto. Somente dados fictícios e o provedor SSO sintético das regressões existentes foram usados.

## Como testar manualmente

1. Recarregar a extensão unpacked de `dist/` e atualizar a página de teste.
2. Abrir o StepScript pelo ícone na aba de teste, marcar **Gravação guiada — destacar cada passo** e iniciar.
3. Clicar e preencher um campo comum; sair dele ou usar Tab para concluir a captura do preenchimento, conforme o comportamento atual do gravador. Conferir a atualização do painel e o contorno sem mudança automática de foco.
4. Usar uma senha fictícia. Confirmar que o passo mostra valor protegido e que o contorno não contém texto ou valor.
5. Pausar, interagir com a página e confirmar que a contagem não cresce. Retomar e capturar uma nova ação.
6. Revisar, avançar e voltar; conferir que nenhum clique, preenchimento, navegação ou reordenação acontece por causa da revisão.
7. Usar um formulário em etapas, ocultar/remover um elemento e navegar na mesma origem. Conferir remoção do destaque e feedback.
8. Trocar de aba ou origem, voltar à aba de origem e reabrir pelo ícone antes de retomar. Testar também o fechamento da aba.
9. Encerrar e revisar os passos; gerar Playwright e Cypress pelo fluxo existente.

## Limites e pendências

- Revisão visual não navega para páginas anteriores nem restaura documentos ou campos removidos. Passos de navegação e verificações de URL permanecem como descrição, sem contorno de elemento.
- Elementos sem seletor DOM único ou visível não são destacados. Iframes e Shadow DOM que o gravador atual não suporta continuam fora desta entrega.
- O preenchimento é capturado quando o gravador atual conclui a ação, por exemplo em `change`/saída do campo, e não a cada caractere digitado.
- `chrome.storage.session` é descartado ao reiniciar o navegador ou recarregar/desabilitar a extensão. O controle guiado não é restaurado nesses casos; os passos persistidos continuam disponíveis. Encerrar a gravação antes dessas operações.
- A validação manual no Side Panel nativo do proprietário permanece pendente. Os E2Es usam Chromium unpacked e a página da extensão como superfície de painel de teste; não comprovam login SSO real nem resolvem a sandbox SSO pendente da BUILD 1C.
- Sem commit, push, pacote ou publicação nesta entrega.
