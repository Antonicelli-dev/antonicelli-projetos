# Antonicelli — Gerenciamento de Projetos V4.1

## Calendário baseado em tarefas

A V4.1 altera o calendário para mostrar **datas das tarefas**, e não mais as datas gerais dos trabalhos.

### O que aparece
- Somente tarefas de trabalhos em andamento.
- Trabalhos arquivados ficam fora.
- Trabalhos na Lixeira ficam fora.
- Tarefas sem data ficam fora do calendário.
- Usuários comuns continuam vendo apenas trabalhos aos quais têm acesso.

### Regras de datas
- Só data inicial: tarefa aparece naquele dia.
- Só data final: tarefa aparece naquele dia.
- Data inicial + final: tarefa aparece em todos os dias do intervalo, inclusive início e término.

### Ao clicar em um dia
A janela mostra todas as tarefas daquela data com:
- nome da tarefa;
- status;
- trabalho ao qual pertence;
- fase e categoria;
- cliente;
- local;
- período da tarefa;
- responsáveis;
- botão **Abrir trabalho**.

### Banco de dados
Nenhuma alteração de schema é necessária.

Use o mesmo Supabase e o mesmo `.env` da V4.0.
