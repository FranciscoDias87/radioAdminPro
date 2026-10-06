# Seguranca

Nao publique falhas com dados pessoais, contratos, tokens ou evidencias de
producao. Comunique-as diretamente ao responsavel pelo repositorio.

## Limites de implantacao

A administracao depende de um gateway autenticado que remove cabecalhos
de identidade enviados pelo visitante e insere uma identidade confiavel.
Nao exponha o Worker administrativo diretamente: os cabecalhos `oai-authenticated-*`
nao substituem um provedor de autenticacao em uma implantacao independente.
O bootstrap do primeiro administrador pressupoe a publicacao privada do proprietario.

O portal publico aceita apenas links individuais. Os segredos da ponte,
do gateway e do WhatsApp permanecem no ambiente do servidor. CPF e poderes
de representacao sao declarados pelo signatario, nao verificados externamente.

Backups contem dados pessoais e tokens criptografados. Restrinja o acesso,
use armazenamento criptografado e nunca versione backups neste repositorio.
