# radioAdmin Pro

## Correcao de integridade e rastreabilidade

- Cancelar preserva parcelas, saldos e recebimentos. Cancelamento exige motivo e nao equivale a baixa financeira.
- Novos contratos iniciam em rascunho. Ativacao ocorre apenas pela homologacao; contratos cancelados ou encerrados nao podem ser reabertos pela edicao.
- Condicoes comerciais ficam preservadas a partir da conferencia OPEC. Novas conferencias armazenam uma copia dos dados do anunciante, emissora e nome do locutor. Registros antigos sem copia nao permitem reconstruir dados historicos que ja foram alterados.
- Recebimentos e repasses podem ser estornados integralmente pelo detalhe do contrato, com motivo e data. Originais permanecem e um lancamento inverso e adicionado. Um recebimento com comissao ja repassada exige estornar primeiro o repasse correspondente.
- APIs exigem identidade encaminhada pela plataforma em producao; o fallback de desenvolvimento e removido na compilacao. A plataforma deve continuar restringindo o acesso ao proprietario. Nao ha perfis de equipe implementados.
- Alteracoes geram eventos de auditoria com identificador do usuario, data e estados anterior/posterior na mesma transacao. Nao existe operacao de alteracao ou exclusao desses eventos na API.
- Configuracao da estacao permite baixar uma exportacao JSON de todos os registros, incluindo auditoria. Guarde-a em local protegido. Isso nao substitui backup automatico nem um procedimento de restauracao testado; importacao/restauracao ainda nao esta implementada.
- Falhas inesperadas retornam mensagens genericas; lancamentos financeiros rejeitam datas futuras e solicitacoes de outra origem sao bloqueadas.

Sistema comercial para emissoras de radio, com interface em portugues, React/Vinext, API no Cloudflare Workers e persistencia D1 (SQLite).

## Fluxo

1. Cadastre anunciantes com documento e contato.
2. Crie contratos com campanha, vigencia, valor, programa, quantidade e duracao das insercoes.
3. Vincule o locutor, com comissao inicial de 30%, e configure as parcelas mensais.
4. Registre conferencia OPEC e aceites internos sequenciais no detalhe do contrato.
5. Registre pagamentos integrais ou parciais em Cobrancas.
6. Acompanhe comissao prevista (30% do contrato), liberada (proporcional ao recebido) e paga. Registre os repasses em Comissoes.
7. Consulte receitas, despesas e saldo por mes no Financeiro. Repasses de comissao entram como despesas automaticamente.
8. Prepare mensagens de cobranca e confirme o envio pessoalmente no WhatsApp.
9. Exporte contratos, cobrancas, comissoes e extrato em CSV.

Os exemplos sao somente leitura e nao sao gravados na carteira. O site e privado por padrao, com acesso controlado pela plataforma Sites.

## Desenvolvimento

- `npm install`
- `npm run db:generate` apos alteracoes de schema
- `npm run dev`
- `npm run build`
- `node --test lib/domain.test.mjs` para calculos de parcelas e comissao
- `node --test lib/api.test.mjs` com servidor local ativo e schema aplicado; cria registros com prefixo qa- somente no banco local

As migrations em drizzle sao aplicadas pela plataforma na publicacao. Configure a binding DB para desenvolvimento com persistencia. Sem banco disponivel, a interface apresenta erro e permite tentar novamente.

## Integridade financeira

Valores sao calculados em centavos. Parcelas somam exatamente o valor do contrato, inclusive quando a divisao tem resto. Recebimentos e repasses nao podem exceder os saldos. Alteracoes usam comparacao do registro anterior para rejeitar gravacoes concorrentes. Contrato e parcelas sao criados juntos em uma transacao. Alteracoes financeiras antes de pagamentos recalculam as parcelas; depois do primeiro pagamento, valor, anunciante, locutor e percentual ficam preservados. Registros de recebimento e repasse sao historicos sem exclusao nesta versao.

## Escopo atual

Reconstrucao a partir da interface de referencia, com codigo independente do Skip. Inclui contratos, conferencias internas, parcelas, recebimentos parciais, comissoes, despesas, cobrancas por mensagem preparada, relatorios CSV e contagem manual de insercoes. Nao inclui emissao bancaria de boletos, disparos automaticos, assinatura Gov.br, emissao fiscal, integracao com automacao de radio ou acesso individual por funcionario. Os aceites sao registros administrativos e nao representam assinaturas digitais. O cadastro de locutores vincula comissoes e nao cria contas de acesso.
