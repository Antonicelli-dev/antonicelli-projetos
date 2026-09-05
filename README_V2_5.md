# Antonicelli — Gestão de Eventos V2.5

Novidades:
- tarefa clicável;
- janela de detalhes;
- data inicial e final;
- campo grande de anotações;
- campo curto Observações removido da interface;
- status: Não Iniciada, Em Andamento, Concluída e Atrasada;
- cores: cinza, azul, verde e vermelho;
- Bloqueado -> Atrasada;
- Não se Aplica -> Não Iniciada;
- mesma base Supabase e dados preservados.

Atualização:
1. Copie o mesmo `.env` da V2.4.
2. `npm install`
3. `npm start`

A migração do banco é automática e apenas adiciona `start_date`, `end_date` e `notes`.
