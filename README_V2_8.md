# Antonicelli — Gestão de Eventos V2.8

## Cabeçalho detalhado por evento
Cada evento agora possui:
- Nome do cliente
- Nome do evento
- Data de início
- Data de término
- Local
- Número de participantes

Essas informações aparecem no topo da página do evento.

## Botão "Mais detalhes"
O administrador pode clicar em "Mais detalhes" para editar:
- Nome do cliente
- Nome do evento
- Data de início
- Data de término
- Local
- Número de participantes
- Informações adicionais

O campo "Informações adicionais" é opcional e só aparece dentro da janela "Mais detalhes".

## Banco de dados
A V2.8 usa o mesmo Supabase e preserva todos os dados.
Apenas adiciona à tabela `events`:
- end_date
- participants
- additional_info

A migração é automática e não destrutiva.

## Atualização
1. Extraia a V2.8.
2. Copie o mesmo `.env` da V2.7.
3. `npm install`
4. `npm start`
