# Antonicelli — Gerenciamento de Projetos V3.5.2

Ajustes de interface e datas:

- Botão para sair de um trabalho:
  - `Eventos` → `Voltar para lista`

- Data de início:
  - permanece opcional;
  - o formulário agora deixa isso explícito.

- Exibição da data na lista de trabalhos:
  - se início e término estiverem preenchidos: `dd/mm/aaaa a dd/mm/aaaa`;
  - se somente a data de início estiver preenchida: mostra apenas o início;
  - se a data de início estiver vazia e houver data final: mostra somente a data final;
  - datas passam a aparecer no formato brasileiro `dd/mm/aaaa`.

- Cliente, local e data continuam aparecendo juntos na linha de resumo do trabalho.

Não há alteração no banco de dados.
Use o mesmo Supabase e o mesmo `.env` da V3.5.1.
