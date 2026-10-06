# Operacao e entrega

## Qualidade

O GitHub Actions verifica tipos, testes isolados, compilacao e dependencias
de producao. As Actions usam commits fixos e permissoes somente de leitura.
Dependabot propoe atualizacoes, sem merge automatico.

Recomenda-se proteger `master` exigindo os jobs `admin` e `signing` antes
de merge. A protecao deve ser ativada pelo proprietario nas configuracoes
do repositorio; o arquivo de workflow sozinho nao a ativa.

## Publicacao

O envio ao GitHub nao publica automaticamente no Sites. A publicacao usa
versao salva, compilacao aprovada e audiencia preservada: administracao
privada e portal publico apenas por token. Nao ha credencial Sites no CI.
Nao publicar se testes, integridade ou compilacao falharem.

Antes: exportar backup protegido, verificar integridade, registrar commit
e versao anterior. Depois: confirmar status de publicacao, conferir
perfis e fluxo em ambiente de teste sem mensagens ou assinaturas reais.
Para rollback, republicar a versao anterior pela infraestrutura Sites.
Rollback de codigo nao desfaz pagamentos ou migracoes do banco.

## Backup e recuperacao

O administrador exporta `/api/backup`. No ambiente local:

```sh
cd admin
node scripts/verify-backup.mjs /caminho/backup.json
```

A verificacao e somente leitura: detecta duplicatas, referencias ausentes
e alteracao dos hashes de versoes, PDFs e evidencias. Ela nao autentica
quem produziu o backup, nem restaura o banco.

Ainda nao existe restauracao automatica na aplicacao. A recuperacao exige
um administrador da infraestrutura, banco de teste e validacao antes de
substituir producao. Guardar tambem os segredos em cofre separado e testar
a restauracao. Backup sem exercicio de recuperacao nao garante continuidade.

## Regras desta atualizacao

- Agentes consultam sua carteira e seu cadastro de locutor.
- Agentes alteram apenas anunciantes proprios sem contrato em conferencia
  ou vinculo comercial de outro agente. A OPEC administra cadastros compartilhados.
- Recebimentos antecipados continuam permitidos; repasses exigem etapa 5
  e contrato ativo ou encerrado. Cancelamentos exigem acerto administrativo.
- Convites assinados permitem baixar o documento por 30 dias apos homologacao,
  inclusive se o contrato for encerrado. Cancelamento bloqueia o acesso externo.
- A auditoria mostra metadados, sem disponibilizar CPF, tokens ou documentos.

## Pendencias

Ativar WhatsApp oficial e templates aprovados. Ainda faltam entrega por
webhooks, assinatura certificada externa, validacao de representacao,
contas a pagar completas, conciliacao, upload/aprovacao de midia,
integracao com programacao e restauracao automatica.
