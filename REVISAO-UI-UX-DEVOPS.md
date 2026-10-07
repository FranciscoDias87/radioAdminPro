# Revisao de interface, transacoes e operacao

Data: 2026-10-07. Base: codigo atual de administracao, estilos, contratos,
financeiro, backup e pipeline. Inspecao visual nesta sessao indisponivel por
falha da ferramenta de navegador. Nao atribuir conformidade WCAG ou validacao
visual a esta revisao de codigo. Nenhum dado de producao foi alterado pelos testes.

## Diagnostico

| Prioridade | Achado | Tratamento |
| --- | --- | --- |
| Alta | Recebimento, repasse e estorno eram gravados sem resumo final | Etapa de conferencia com valor, cliente, campanha, data, parcela/locutor e motivo; dados preservados ao voltar |
| Alta | Bloqueio de clique dependia somente do estado React | Trava sincrona de envio no comercial e workflow; CAS do servidor permanece obrigatorio |
| Alta | Backup validava existencia, mas nao o tipo da referencia | Verificacao de tipos, contrato do convite e evidencias vinculadas a documento/versao; importacao e releitura em D1 isolado |
| Media | Alvos de toque dos dialogs e detalhes eram menores que os da pagina | Area minima de 44px nos controles de icone e fechar; foco visivel tambem nos portais |
| Media | Botoes longos e filtros intermediarios podiam exceder a largura | Quebra de texto e filtros adaptaveis; rodape de formulario fixado dentro da area rolavel |
| Media | Devolucao da OPEC usava dialog sem tema comercial | Tema consistente e fechamento bloqueado durante envio |
| Alta, pendente | Backup agendado, alertas e recuperacao completa nao estao ativos | Roteiro de operacao e ensaio local; requer decisoes, acesso e validacao operacional |
| Media, pendente | Formularios cadastrais podem perder edicoes ao fechar | Adicionar controle de alteracoes nao salvas e validacao com usuarios |
| Media, pendente | Tabelas extensas exigem rolagem horizontal; lista carrega toda a carteira | Priorizar resumo de linhas no celular e paginacao no servidor conforme volume |
| Media, pendente | Compilacao alerta para pacotes JavaScript acima de 500kB | Medir carregamento em rede movel e separar modulos sob demanda; alerta nao equivale a medicao de Core Web Vitals |

## Mobile First e UI

Ha base de uma coluna em formularios, sidebar fechando no celular, rail de
icones no desktop, campos de 16px, filtros de relatorios e tema escuro.
Preservar essa identidade. Nao aumentar titulos ou transformar telas
operacionais em landing pages. Contratos, saldos, prazos e proximas acoes
devem ser os elementos mais faceis de localizar.

Aceite visual ainda necessario: 320, 390, 768 e 1280px; claro/escuro;
teclado virtual; zoom de 200%; foco, leitura, contraste e textos extensos.
Confirmar que menus, fechar e salvar nao sobrepoem titulos/campos, que o
rodape nao cobre o ultimo campo e que tabelas rolam sem mover a pagina.
44px e escolha ergonomica do projeto, nao declaracao de conformidade.

## UX Das Transacoes

Fluxo comercial preservado: rascunho pelo agente -> conferencia OPEC ->
assinatura cliente -> assinatura locutor -> homologacao OPEC -> veiculacao.
Cada etapa depende da anterior. O financeiro nao substitui a homologacao.
Sem WhatsApp oficial configurado, as assinaturas continuam pendentes.
A conexao permanece pausada, conforme decisao do usuario.

Fluxo financeiro: informar dados -> conferir resumo -> confirmar ->
aguardar servidor -> atualizar carteira e mostrar resultado. Corrigir dados
retorna ao formulario preenchido. A requisicao usa a versao que foi revisada;
alteracao concorrente continua sendo rejeitada no servidor. Estorno cria
registro de reversao, nao apaga o original. Essa etapa cobre recebimentos,
repasses e seus estornos; despesas e demais cadastros nao foram redesenhados.

Pendencias de UX: teste com agente, OPEC e financeiro; aviso de alteracoes
nao salvas; mensagens de erro proximas aos campos; resultado incerto de rede
com reconciliacao e chave de idempotencia no servidor; tratamento comercial
de cancelamento, multa e devolucao. Trava de clique nao substitui idempotencia.

## DevOps Aplicado

Entrega em pequenos lotes, qualidade automatizada antes de publicar e
operacao documentada. CI existente mantido: tipos, testes, compilacao e
auditoria bloqueante de dependencias de producao; permissoes reduzidas e
Actions fixadas por commit. Novos testes entram no mesmo gate.

Ensaio de recuperacao verifica importacao, quantidade, conteudo e hashes em
banco descartavel sem acesso a producao. Exercita tambem registros ficticios
gerados pelo fluxo de assinaturas. Nao e restaurador de producao nem
certificacao juridica dos documentos. Backups reais nao entram no repositorio.

Verificacao local desta entrega: 33 testes aprovados, TypeScript sem erros,
compilacao concluida e auditoria das dependencias de producao da administracao
sem alertas conhecidos. O build possui alerta de tamanho de pacote citado acima.
Source Sites preparado: d37461dae641e9540bec80a5411061128dd52762.
Os resultados locais nao atestam CI remoto nem inspecao visual desta sessao.

Ver OPERACAO.md para release, rollback, incidente e indicadores. Ainda falta
ativar protecao de branch, homologacao visual recorrente, monitoramento/alertas,
backup agendado e ensaio completo com segredos e infraestrutura. Deploy Sites
nao se torna automatico apenas por enviar commits ao GitHub.

## Referencias

- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Reflow: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
- DORA, continuous delivery: https://dora.dev/capabilities/continuous-delivery/
- DORA, monitoring: https://dora.dev/capabilities/monitoring-and-observability/
