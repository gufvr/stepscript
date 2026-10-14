# StepScript — PLAN 1 / BUILD 1A handoff

Status: implementação local concluída em 13 de outubro de 2026. Sem envio à Chrome Web Store, commit ou push.

## Entrega

- A inspeção lista formulários visíveis e candidatos a identificador, senha e ação. Usa `label`, `aria-label`, `aria-labelledby`, `autocomplete`, `name`, `id`, `placeholder`, tipo do campo, título e contexto do formulário.
- O painel permite revisar e trocar o formulário, campo de identificador e botão de ação antes da confirmação. Senha é opcional quando não existe no formulário; uma etapa posterior somente com senha é aceita após nova inspeção.
- O executor valida de novo o formulário e os seletores escolhidos no documento autorizado antes de preencher e antes de clicar. A ação é acionada uma única vez após a confirmação.
- Valores de senha ficam em memória apenas durante a tentativa e são removidos do estado do painel ao concluir, trocar de modo ou fechar. Passos salvos usam `value.kind: protected` para senha. Exportações usam variáveis de ambiente, sem incluir credenciais.
- URLs gravadas pela automação e incluídas nas exportações removem parâmetros de consulta e fragmentos com aparência de segredo; fragmentos de rota simples, como `#otp-login`, são preservados.

## Evidências

| Verificação | Resultado |
| --- | --- |
| Suíte unitária e de integração | 504 testes passaram antes do ajuste final de sanitização de URL |
| Testes focados após sanitização de URL | 9 passaram |
| E2E da extensão | 8 passaram, incluindo escolha de telefone e segunda etapa somente com senha |
| Build, lint e `git diff --check` | Passaram |

## Limites conhecidos

- Formulários de cadastro ou troca de senha com múltiplos campos de senha não são tratados como login automático.
- Sites com componentes em shadow DOM fechado, iframes externos ou botões não semânticos podem exigir gravação manual.
- Após clicar em “Avançar”, o usuário deve abrir a automação novamente para inspecionar a segunda etapa. Não há repetição automática.
- A limpeza de URL cobre query e fragmentos suspeitos; caminhos que incorporem segredos em segmentos aparentemente comuns exigem revisão antes de compartilhar um export.
- SSO pertence à BUILD 1B e não está incluído nesta entrega.
