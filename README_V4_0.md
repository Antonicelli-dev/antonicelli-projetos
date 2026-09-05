# Antonicelli — Gerenciamento de Projetos V4.0

## Calendário de trabalhos

A versão V4.0 adiciona um calendário integrado à lista de trabalhos.

### Regras
- Somente trabalhos em andamento aparecem no calendário.
- Trabalhos arquivados não aparecem.
- Trabalhos na Lixeira não aparecem.
- Usuários não administradores veem somente os trabalhos dos quais participam.
- Trabalhos sem nenhuma data não aparecem no calendário.
- Se houver somente uma data, o trabalho aparece apenas naquele dia.
- Se houver data inicial e final, o trabalho aparece em todos os dias do intervalo, inclusive início e término.

### Navegação
Na tela principal existe o botão **Calendário**.

O calendário permite:
- navegar entre meses;
- retornar ao mês atual pelo botão **Hoje**;
- visualizar até três trabalhos diretamente em cada dia;
- indicar quando há mais trabalhos no mesmo dia;
- clicar em qualquer dia.

Ao clicar em um dia, uma janela mostra todos os trabalhos daquele dia com:
- tipo do trabalho;
- nome;
- cliente;
- local;
- período;
- botão **Abrir trabalho** para ir diretamente ao projeto.

### Backend
Foi adicionada a rota:
- `GET /api/calendar-events`

Ela retorna apenas os dados necessários para o calendário e respeita permissões, arquivamento e Lixeira.

Não há alterações no schema do banco nesta versão.

## Atualização
1. Extraia a V4.0.
2. Copie o mesmo `.env` da V3.6.
3. Execute `npm install`.
4. Execute `npm start`.
