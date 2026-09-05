# Antonicelli — Gerenciamento de Projetos V3.5

## Múltiplos modelos de trabalho
Agora é possível criar quantos modelos forem necessários, por exemplo:
- Evento
- Vídeo
- Stand
- Transmissão Online
- Convenção
- Produção Audiovisual

Cada modelo possui suas próprias fases, categorias e tarefas.

## Editar Modelos
A tela "Editar Modelos" agora mostra todos os modelos cadastrados.
É possível:
- criar um modelo novo do zero;
- definir o Tipo do trabalho e o Nome do modelo;
- alternar entre modelos;
- editar nome/tipo;
- criar, renomear e excluir fases;
- criar, renomear e excluir categorias;
- criar, editar e excluir tarefas.

## Novo trabalho
Ao criar um novo trabalho, o campo "Modelo do trabalho" é obrigatório.
O sistema copia somente as tarefas daquele modelo para o novo trabalho.
Alterações futuras no modelo não afetam trabalhos já existentes.

## Identificação visual
Na lista "Trabalhos em Andamento", cada trabalho recebe um selo com seu tipo, como:
`Evento`, `Vídeo`, `Stand`, `Transmissão` etc.

Os trabalhos existentes continuam vinculados ao modelo anterior e são identificados inicialmente como `Evento`.

## Banco de dados
Continua usando o mesmo Supabase.
A migração adiciona somente `type_label` à tabela `templates`.
Também corrige o status padrão de novas tarefas para `Não Iniciada`.

## Atualização
1. Extraia a V3.5.
2. Copie o mesmo `.env` da V3.4.
3. Execute `npm install`.
4. Execute `npm start`.
