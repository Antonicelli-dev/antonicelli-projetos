# Publicação no Render — Antonicelli V4.2 Render

Esta versão foi preparada para **Render + Supabase**.

## O que já está preparado

- `render.yaml` para criar o Web Service no plano Free.
- `/health` para o health check do Render.
- `.gitignore` bloqueando `.env` e `node_modules`.
- `JWT_SECRET` gerado automaticamente pelo Render ao criar via Blueprint.
- `DATABASE_SSL=true` já configurado pelo Blueprint.
- `APP_URL` não é obrigatório no Render: o sistema usa `RENDER_EXTERNAL_URL` automaticamente.
- Banco continua no Supabase atual.
- Nenhuma mudança de schema em relação à V4.1.3.

## 1. Antes de enviar ao GitHub

Copie o seu `.env` apenas para uso local. **Não envie o `.env` ao GitHub.**

A pasta que deve virar o repositório é a raiz desta versão, onde estão:

- `server.js`
- `package.json`
- `render.yaml`
- `schema.sql`
- `public/`

## 2. Criar o repositório no GitHub

Crie um repositório, por exemplo:

`antonicelli-projetos`

Envie todos os arquivos desta pasta. O `.gitignore` impede que o `.env` seja incluído.

## 3. Criar no Render usando Blueprint

No Render:

1. New → Blueprint
2. Conecte o GitHub.
3. Escolha o repositório `antonicelli-projetos`.
4. O Render detectará `render.yaml`.
5. Na criação, ele solicitará `DATABASE_URL`.
6. Cole a mesma `DATABASE_URL` do Supabase que você já usa localmente.
7. Confirme a criação.

O Blueprint configura automaticamente:

- runtime Node
- plano Free
- build `npm install`
- start `npm start`
- health check `/health`
- `DATABASE_SSL=true`
- um `JWT_SECRET` seguro e aleatório

## 4. DATABASE_URL do Supabase

Use preferencialmente a string que já funciona no seu `.env` local.

Como você já utiliza Supavisor/Pooler, mantenha essa mesma conexão. Não crie outro banco.

Exemplo de formato:

`postgresql://postgres.PROJECT_REF:SENHA@aws-REGION.pooler.supabase.com:5432/postgres`

## 5. URL pública

O Render fornece automaticamente uma URL semelhante a:

`https://antonicelli-projetos.onrender.com`

O sistema detecta `RENDER_EXTERNAL_URL`, então os links de convite já usarão a URL pública do Render mesmo sem `APP_URL`.

Se futuramente usar domínio próprio, adicione no Render:

`APP_URL=https://projetos.seudominio.com`

## 6. SMTP é opcional

Sem SMTP:
- o convite é criado;
- o sistema mostra o link para você copiar e enviar manualmente.

Para envio automático por e-mail, acrescente no Render, em Environment:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`

## 7. Atualizações futuras

Depois que o Render estiver conectado ao GitHub, basta enviar uma nova versão/commit ao repositório. O serviço pode ser redeployado a partir do repositório conectado.

## Verificação rápida

Depois do deploy:

- abra `/health` — deve retornar `{"ok":true,...}`;
- faça login;
- confira foto do perfil;
- abra um trabalho;
- confira tarefas e calendário;
- teste um convite.

## Observação sobre o plano Free

Esta versão foi pensada para testes internos. O serviço gratuito pode ficar inativo quando não está sendo usado e levar algum tempo para responder no primeiro acesso após um período ocioso.
