# Fluxo de contratos

1. O locutor/agente cria o contrato com seu cadastro vinculado e comissão inicial de 30%.
2. Envia para OPEC. As condições comerciais ficam bloqueadas para edição.
3. A OPEC confere partes, responsáveis, WhatsApp, valores, parcelas e condições. Aprovar cria uma versão fixa e um PDF para assinatura.
4. O cliente recebe o link individual. A página é separada da administração e não exige conta. Para assinar, informa nome, CPF, código enviado ao WhatsApp cadastrado e concordância com aquela versão.
5. Somente após o cliente assinar, o locutor/agente recebe seu próprio link para a mesma versão e confirma com seu código.
6. Após as duas assinaturas, a OPEC confirma o contrato. A situação muda para Ativo e permite o registro de inserções. O PDF concluído inclui as evidências e fica disponível para download e impressão.

## Situação da integração

A conexão entre as duas páginas está configurada. A emissora ainda precisa conectar uma conta oficial do WhatsApp Business e modelos aprovados. Sem essa configuração, os convites permanecem pendentes e nenhuma assinatura é simulada.

Configurar no ambiente protegido da administração, nunca no navegador ou no código:

- `WHATSAPP_TOKEN`: token da conta oficial, como segredo.
- `WHATSAPP_PHONE_ID`: identificador do número cadastrado.
- `WHATSAPP_API_VERSION`: versão suportada pela conta, no formato `vNN.N`.
- `WHATSAPP_SIGN_TEMPLATE`: modelo aprovado com quatro variáveis no corpo: nome do destinatário, emissora, campanha e link completo.
- `WHATSAPP_OTP_TEMPLATE`: modelo de autenticação aprovado com código e botão de copiar código.
- `WHATSAPP_LANGUAGE`: idioma dos dois modelos, padrão `pt_BR`.

Após configurar, republicar a versão para aplicar o ambiente. OPEC usa Tentar envio pendente nos contratos já aprovados. Aceitação da mensagem pela API não comprova entrega ou leitura; esta integração não recebe notificações de entrega.

## Equipe

A administração continua privada. O proprietário precisa compartilhar o acesso ao site com cada colaborador. O colaborador abre a administração, informa seu código individual ao proprietário, que cadastra o perfil na área Equipe. Permissões do sistema não substituem o compartilhamento do site.

- Administrador: cadastros, equipe, OPEC e financeiro.
- OPEC: conferência, devolução, renovação de links, confirmação final e registro de inserções.
- Locutor/agente: contratos criados por ele e vínculo com seu próprio cadastro.
- Financeiro: recebimentos, comissões, estornos e despesas; não pode confirmar ou assinar contratos.

## Evidências e proteção

O link expira em 72 horas. O código expira em 5 minutos, com limite de 5 tentativas e 6 envios por convite. Renovar revoga o convite anterior. Devolver para correção revoga links pendentes e preserva o histórico e a versão anterior; uma nova aprovação exige novas assinaturas.

São registrados documento apresentado, hash SHA-256, nome e CPF declarados, WhatsApp verificado, data/hora, concordância e metadados da solicitação. Os hashes verificam integridade. O código comprova acesso ao WhatsApp cadastrado, não valida documentos nem poderes de representação. Não há certificação ICP-Brasil ou garantia automática de validade jurídica. O modelo comercial e as regras de representação precisam ser revisados pela emissora antes do uso real.

## Testes

`node --test lib/domain.test.mjs lib/signing.test.mjs` verifica regras financeiras, autorização, sequência, concorrência, versões, códigos incorretos, integração ausente e PDFs em banco isolado, com WhatsApp simulado apenas no teste. `lib/workflow-test-worker.ts` não é uma rota da aplicação.

Na página de assinaturas, `node --test worker.test.mjs` verifica a proteção do acesso anônimo e do canal entre servidores.
