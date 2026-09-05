# Antonicelli — Gerenciamento de Projetos V3.5.1

## Otimização da edição de modelos

A tela de modelos foi otimizada para reduzir fortemente a latência com o Supabase.

### Antes (V3.5)
- `/api/templates` carregava a estrutura completa de TODOS os modelos.
- Para cada modelo eram feitas consultas adicionais para fases.
- Para cada fase eram feitas consultas para categorias.
- Para cada categoria eram feitas consultas para tarefas.
- Com vários modelos, a quantidade de consultas crescia rapidamente.

### Agora (V3.5.1)
- `/api/templates` traz somente a lista leve de modelos (nome, tipo e versão): 1 consulta.
- A estrutura completa é carregada somente para o modelo selecionado.
- O modelo selecionado é montado com apenas 2 consultas ao banco:
  1. metadados do modelo;
  2. uma única consulta JOIN para fases, categorias e tarefas.
- Ao alternar entre modelos, a lista de modelos fica em cache no navegador.
- Ao criar/renomear/excluir fase, categoria ou tarefa, só o modelo atual é recarregado.
- Ao criar ou editar nome/tipo de modelo, o cache local é atualizado sem baixar novamente todos os modelos.

Não há alteração de schema nesta versão.
Use o mesmo Supabase e o mesmo `.env` da V3.5.

## Atualização
1. Extraia a V3.5.1.
2. Copie o `.env` da V3.5.
3. Execute `npm install`.
4. Execute `npm start`.
