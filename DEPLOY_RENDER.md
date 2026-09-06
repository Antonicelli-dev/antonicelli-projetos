# Publicação no Render — Antonicelli V4.3

As instruções atuais estão em [README_V4_3.md](README_V4_3.md).

Para atualizar seu serviço existente, envie o conteúdo desta pasta para o mesmo repositório, mantenha as variáveis do Render e use Node 22.x, build `npm ci`, start `npm start` e health check `/health`. A migração V4.3 roda automaticamente na inicialização.

Não recrie o Supabase. Não envie .env para o GitHub. Em banco vazio de produção, configure INITIAL_ADMIN_PASSWORD (12 ou mais caracteres) antes de iniciar.
