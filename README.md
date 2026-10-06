# radioAdminPro

Administracao comercial de emissoras de radio.

- `admin/`: contratos, conferencias OPEC, financeiro e comissoes.
- `signing/`: pagina publica de assinatura por link individual e codigo WhatsApp.

O fluxo exige cliente, locutor e confirmacao final da OPEC, nesta ordem.
As assinaturas sao aceites eletronicos com evidencias, nao certificados ICP-Brasil.
O envio de links e codigos exige configurar uma conta oficial do WhatsApp.

## Desenvolvimento

Node.js 22.13 ou superior.

```sh
cd admin
npm ci
npm run dev
```

Veja `admin/ASSINATURAS.md` para configuracao da integracao. Chaves e dados
de producao devem permanecer fora do repositorio. A autenticacao da
administracao e o banco D1 dependem da infraestrutura Sites/Cloudflare;
esta exportacao nao e uma instalacao independente com login proprio.
