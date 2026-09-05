# Antonicelli — Gestão de Eventos V2.4

## Novos recursos
- Adicionar/remover colaboradores por evento.
- Responsável por tarefa.
- Apenas membros do evento podem ser atribuídos às tarefas.
- Ao remover um membro, as tarefas dele ficam sem responsável.
- Colaborador vê apenas eventos em que foi incluído.
- Visão "Minhas tarefas".
- Filtros por status, responsável e fase.
- Colaborador não pode alterar tarefas atribuídas a outra pessoa.
- Mantém editor do checklist-modelo e edição de tarefas por evento.

## Compatibilidade
A V2.4 usa o MESMO schema da V2.3. Não há DROP, recriação de tabela ou migração destrutiva.

Você pode reutilizar exatamente o mesmo:
- projeto Supabase;
- DATABASE_URL;
- JWT_SECRET;
- usuários;
- eventos;
- tarefas;
- histórico.

## Atualização
1. Extraia a V2.4 em uma nova pasta.
2. Copie o arquivo `.env` da V2.3 para a nova pasta.
3. Execute:
   npm install
4. Execute:
   npm start
5. Abra:
   http://localhost:3000

## Fluxo de uso
Administrador:
1. Cria/cadastra usuários.
2. Abre um evento.
3. Clica em "Colaboradores".
4. Adiciona as pessoas que participarão daquele evento.
5. Usa a coluna "Responsável" para atribuir as tarefas.

Colaborador:
- vê somente eventos em que foi adicionado;
- pode usar "Minhas tarefas";
- pode atualizar status/observações de tarefas atribuídas a ele;
- não pode alterar tarefa atribuída a outra pessoa.
