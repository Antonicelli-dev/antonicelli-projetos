# Antonicelli — Gerenciamento de Projetos V4.1.2

## Correções

### Calendário de Tarefas
Tarefas com status **Concluída** não aparecem mais no calendário.

Continuam aparecendo:
- Não Iniciada
- Em Andamento
- Atrasada

As regras de datas permanecem iguais:
- somente início: aparece naquele dia;
- somente término: aparece naquele dia;
- início + término: aparece em todos os dias do intervalo.

Trabalhos arquivados e trabalhos na Lixeira continuam fora do calendário.

### Foto do colaborador após login
Corrigido o problema em que a foto do usuário não aparecia no cabeçalho logo após entrar no sistema.

Causa:
- a resposta do login não incluía `avatar_data`.

Correções:
- o backend agora inclui `avatar_data` na resposta do login;
- após autenticar, o frontend também consulta `/api/me`, garantindo que nome, cargo e foto sejam carregados diretamente do banco antes de mostrar a tela principal.

Não é mais necessário entrar em **Perfil** e salvar novamente para a foto aparecer.

## Banco de dados
Nenhuma alteração de schema é necessária.

Use o mesmo Supabase e o mesmo `.env`.
