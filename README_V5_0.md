# Antonicelli V5.0 — Redesign de interface

Esta versão parte diretamente da V4.3.7 e preserva backend, Supabase, permissões, PWA, editor visual, modelos, calendário, convites e demais recursos existentes.

## Principais mudanças visuais
- Nova navegação lateral no desktop, inspirada em interfaces SaaS modernas.
- Menu lateral responsivo no mobile, aberto pelo botão ☰.
- Navegação direta para Trabalhos, Minhas tarefas, Calendário e, para administradores, Modelos, Usuários, Arquivados e Lixeira.
- Perfil e saída movidos para a base da barra lateral.
- Dashboard de Trabalhos redesenhado com cabeçalho limpo, busca, filtro por cliente, filtro por tipo e ordenação.
- Busca e filtros são aplicados no navegador sobre a lista já carregada, evitando novas consultas a cada alteração.
- Lista de trabalhos em linhas compactas, com logo do cliente, cliente | trabalho, metadados, progresso e menu contextual `⋯`.
- Página do trabalho recebeu cabeçalho visual simplificado e consistente com a nova navegação.
- Componentes gerais receberam bordas, espaçamentos, tipografia e superfícies mais discretas.
- Mobile revisado para evitar overflow horizontal e manter controles legíveis no zoom padrão.

## Compatibilidade
- Nenhuma migração de banco foi adicionada.
- Usa o mesmo Supabase da V4.3.7.
- Mantém o Web App Manifest e os ícones de instalação da V4.3.7.
- `render.yaml` e a configuração de deploy permanecem compatíveis com Render.

## Atualização
Substitua o conteúdo do repositório pela V5.0 e faça o redeploy normal no Render. Não envie `.env` real para o repositório.
