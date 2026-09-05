# Antonicelli — Gestão de Eventos V3.3.1

Correção de manutenção:
- Corrige o erro ao abrir "Minhas tarefas":
  `for SELECT DISTINCT, ORDER BY expressions must appear in select list`

Causa:
- A consulta usava `SELECT DISTINCT` e ordenava por `et.position`,
  que não fazia parte da lista do SELECT.

Correção:
- `DISTINCT` foi removido. Ele não é necessário porque a tabela
  `event_task_responsibles` possui chave única por `(task_id, user_id)`.

Banco de dados:
- Nenhuma alteração.
- Use o mesmo Supabase e o mesmo `.env` da V3.3.

Atualização:
1. Extraia a V3.3.1.
2. Copie o mesmo `.env`.
3. `npm install`
4. `npm start`
