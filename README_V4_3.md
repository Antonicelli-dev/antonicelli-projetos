# Antonicelli V4.3 — Render + Supabase

Base: pacote Antonicelli V4.2.1 Render fornecido pelo usuário. A atualização mantém o banco e os fluxos existentes. Inclui a logo de cabeçalho PNG e o favicon SVG fornecidos.

## Atualizar o serviço que já está no Render

1. Faça um backup do Supabase antes da atualização.
2. Extraia o ZIP. Envie **o conteúdo** da pasta `antonicelli_eventos_v4_3_render` para a raiz do mesmo repositório GitHub, substituindo os arquivos anteriores. Inclua `package-lock.json`, `v43.js`, `migrations/` e todos os novos arquivos de `public/`.
3. Mantenha as variáveis já existentes no Render: `DATABASE_URL`, `DATABASE_SSL`, `JWT_SECRET` e, se usados, `APP_URL` e SMTP. Não copie `.env` para o repositório.
4. Use Node **22.x**, Build Command `npm ci` e Start Command `npm start`. O Blueprint incluído também contém essas configurações.
5. Faça o deploy. Na inicialização, o servidor aplica o `schema.sql` da base e depois `migrations/v4_3.sql`. O usuário da conexão precisa poder alterar tabelas e criar índices, como na versão anterior.
6. Confira `/health`, faça login e teste um trabalho. A atualização não exige recriar usuários, trabalhos ou modelos.

Não foi feito deploy nem acesso ao Supabase de produção durante a preparação deste pacote.

## Recursos e uso

| Requisito | Comportamento da V4.3 |
| --- | --- |
| Desempenho | Progresso de todos os trabalhos calculado em uma consulta agregada, eliminando uma consulta por trabalho. Dentro do trabalho, tarefas e membros são carregados em paralelo após autorização. |
| Colaboradores | Gestão carrega usuários e membros em paralelo, sem buscar todas as tarefas. Ao adicionar, atualiza a lista e os seletores de responsáveis imediatamente, sem sair e entrar. O botão fica desabilitado durante o envio. |
| Navegação | URLs `#/trabalhos`, `#/trabalho/ID`, `#/calendario`, `#/minhas-tarefas`, `#/arquivados`, `#/lixeira`, `#/modelos` e `#/modelos/ID`. F5 e voltar/avançar do navegador restauram a tela; não exigem configuração adicional no Render. |
| Detalhes | Título alterado para “Mais detalhes do trabalho”. |
| Anotações | Janela flutuante ao passar o mouse ou focar o ícone com o teclado. Texto escapado, com quebras de linha e rolagem para anotações longas. |
| Importação | Em **Editar Modelos → Importar CSV**, informe o nome e selecione o arquivo. Cria um modelo independente. |
| Exportação | Botão **Exportar CSV** dentro do trabalho; inclui todas as tarefas do trabalho, independentemente dos filtros da tela. Usuários precisam ter acesso ao trabalho. |
| Nível de acesso | Em **Usuários**, admin altera usuários ativos entre Administrador, Colaborador e Convidado. A alteração vale para toda a plataforma. |
| Identidade visual | PNG original do cabeçalho e SVG original do favicon incluídos em `public/assets/`. |
| Logo do cliente | No novo trabalho ou em **Mais detalhes**, selecione PNG, JPEG ou WebP de até 5 MB. A imagem é reduzida para até 512 × 512, mantendo proporção, convertida em WebP e guardada no banco como data URL. Há opção de remover. |
| Informações adicionais | Editor com negrito, itálico, sublinhado, listas e limpeza de formato. A formatação aparece no trabalho e é sanitizada no navegador e no servidor. Colagem insere texto simples. |

O calendário continua excluindo tarefas concluídas, trabalhos arquivados e trabalhos na lixeira. A foto continua sendo enviada no login e atualizada por `/api/me`. Datas exibidas nas tarefas e exportadas usam `dd/mm/aaaa`; campos de edição mantêm o seletor nativo do navegador. Convites continuam reativando a conta original com o mesmo ID e preservando a foto quando nenhuma nova for enviada. O cadastro público não expõe o nome do trabalho.

## CSV

Formato de importação: **UTF-8**, separado por vírgulas, com cabeçalho exatamente:

```csv
Fase,Categoria,Tarefa
Planejamento,Produção,Definir cronograma
Planejamento,Produção,"Confirmar fornecedores, equipe e materiais"
Execução,Montagem,Conferir montagem
```

Há um exemplo em `public/modelo-exemplo.csv`, também disponível no formulário. São aceitos BOM UTF-8, CRLF/LF, vírgulas e quebras de linha dentro de campos entre aspas. Aspas internas devem ser duplicadas. Arquivos separados por ponto e vírgula são rejeitados com orientação sobre o cabeçalho.

Limites: 1 MB, 1 a 5.000 tarefas e até 500 caracteres por campo. Nenhum campo pode estar vazio. Fases e categorias repetidas são agrupadas na ordem em que aparecem; tarefas repetidas são mantidas, pois podem ser intencionais. O arquivo inteiro é validado antes da primeira gravação. Todas as gravações usam uma transação: se alguma falhar, nenhum modelo parcial permanece.

Exportação: `Fase,Categoria,Tarefa,Status,Responsáveis,Data Inicial,Data Final,Anotações`. Inclui BOM para facilitar abertura no Excel, todos os campos entre aspas e datas brasileiras. Responsáveis são separados por `; ` dentro do campo. Campos que poderiam virar fórmulas recebem um apóstrofo inicial de proteção. O CSV exportado possui oito colunas e não é um arquivo de importação de modelo; para reutilizá-lo, mantenha apenas as três primeiras colunas e o cabeçalho esperado.

## Banco e compatibilidade

A migração `migrations/v4_3.sql` é aditiva, transacional e idempotente:

- `events.client_logo_data TEXT`: logo otimizada, semelhante ao avatar existente.
- `events.additional_info_html TEXT`: HTML sanitizado. Permanece nulo em trabalhos antigos até uma edição com formatação.
- Índices para tarefas por trabalho, membros por usuário e hierarquia de modelos.

O campo antigo `additional_info` não é removido nem reinterpretado como HTML. Textos existentes são exibidos escapados, preservando quebras de linha. Ao salvar pelo editor, o servidor atualiza também a representação em texto simples. Uma atualização legada que envie somente `additional_info` limpa a versão HTML para evitar exibir conteúdo desatualizado.

É possível reaplicar a migração pelo SQL Editor do Supabase, mas a inicialização já faz isso automaticamente. Índices novos podem prolongar o primeiro deploy em bancos grandes; as execuções seguintes não os recriam. Não exclua colunas para reverter a aplicação: a V4.2.1 tolera as colunas adicionais. Após rollback, edições feitas por uma versão antiga podem deixar a coluna HTML desatualizada; alinhe os campos antes de retornar à V4.3.

## Proteções e limitações documentadas

- O servidor consulta o usuário ativo e seu nível de acesso em cada requisição autenticada. Uma sessão antiga não mantém privilégios removidos. Isso acrescenta uma consulta curta por requisição, necessária para aplicar alterações e desativações sem esperar o token expirar. A interface de uma sessão já aberta pode precisar de F5 para refletir os novos menus; o servidor já bloqueia ações proibidas.
- É proibido rebaixar o próprio administrador. A transação de mudança de função verifica novamente o administrador solicitante, protege o último administrador ativo e registra auditoria. Rebaixar alguém para convidado não apaga tarefas, histórico nem atribuições existentes; o acesso passa a ser de leitura e o usuário não pode receber novas atribuições.
- Rich text aceita apenas parágrafos, quebras de linha, negrito, itálico, sublinhado e listas. Scripts, eventos, estilos, imagens e links são removidos. Limite: 100.000 caracteres. Usa DOMPurify no navegador e sanitize-html no servidor, ambos instalados localmente sem CDN.
- O editor usa comandos nativos do navegador para formatação leve; não oferece edição colaborativa ou formatação avançada.
- As imagens são limitadas e otimizadas para conter o crescimento do banco. A listagem ainda carrega os trabalhos acessíveis e suas logos; uma futura base com milhares de trabalhos poderá se beneficiar de paginação. Não foram inventadas medições de latência do Render/Supabase: a redução de consultas foi validada localmente.
- Operações de senha usam bcrypt assíncrono para não bloquear o servidor durante o cálculo.
- Em um **banco novo e vazio em produção**, configure `INITIAL_ADMIN_PASSWORD` com pelo menos 12 caracteres antes do primeiro deploy. O usuário inicial é `admin@antonicelli.local`. Essa variável não muda senhas nem usuários em bancos já existentes e pode ser removida após a criação. Em desenvolvimento permanece o acesso inicial da base (`admin123`), e os campos de login não vêm mais preenchidos.

## Validação realizada

Testes executados em Node **22.23.2**, com banco PostgreSQL isolado via PGlite e requisições HTTP via Supertest:

- Sintaxe do servidor, módulo V4.3 e scripts da interface.
- CSV válido, campos ausentes, cabeçalho incorreto, aspas, BOM e linhas múltiplas.
- Falha de gravação simulada: rollback integral da importação.
- Reaplicação do schema e da migração preservando tarefas e informações.
- Mudança de função, proteção do próprio admin, acesso com token antigo e conta desativada.
- Criação e edição de trabalho, sanitização, logo, membros e exportação autorizada.
- Calendário sem concluídas, foto no login e reativação de convidado com ID/foto preservados.
- Quantidade fixa de consultas na listagem: autenticação, lista e progresso agregado.
- Testes de DOM para restauração de rota, texto antigo e atualização dos seletores.

Revisão em navegador local: login, F5 dentro do trabalho, inclusão imediata de colaborador, texto em negrito salvo, envio/otimização de imagem exibida no trabalho e na lista, importação do CSV de exemplo e criação das fases esperadas. Não foram utilizados dados reais de produção.

Para repetir: `npm ci --include=dev` e `npm test`. Os testes criam seu próprio banco em memória e não usam `DATABASE_URL`.

Referências das bibliotecas: [sanitize-html](https://www.npmjs.com/package/sanitize-html) e [CSV Parse](https://csv.js.org/parse/options/).

## Dependências revisadas

O pacote inclui lockfile. Nodemailer foi atualizado para 10.0.0 (compatível com Node 22; requer Node 20+). A dependência interna `qs` do Express 4 recebe override para a linha corrigida 6.16.x. Essas mudanças tratam os avisos encontrados na auditoria inicial. O uso SMTP mantém `createTransport` e `sendMail`; o teste de composição é local, sem enviar e-mail. A entrega por seu provedor SMTP precisa ser conferida após o deploy, pois nenhuma credencial real foi utilizada. Referência: [Nodemailer](https://nodemailer.com/).

Resultado final: **6 testes passaram, 0 falhas**, em Node 22.23.2. Auditoria final `npm audit --omit=dev`: **0 vulnerabilidades reportadas** em 06/09/2026. Isso descreve os avisos disponíveis na data da consulta, não uma garantia contra falhas futuras.
