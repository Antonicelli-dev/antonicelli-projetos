# Antonicelli — V4.2.1 Render

Base: V4.1.3.

Versão preparada especificamente para publicação no **Render**, mantendo o **Supabase atual**.

Leia primeiro: `DEPLOY_RENDER.md`.

Principais ajustes:
- Blueprint `render.yaml`;
- health check `/health`;
- `.gitignore` seguro;
- configuração automática de URL pública no Render;
- validação de variáveis obrigatórias em produção;
- Node 22 fixado no `package.json`;
- nenhuma alteração no banco de dados.
