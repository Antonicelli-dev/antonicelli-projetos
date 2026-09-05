# Antonicelli — Gestão de Eventos V3.3

## Múltiplos responsáveis por tarefa
Cada tarefa pode ter mais de um responsável.

Na janela de detalhes:
- os responsáveis são escolhidos por caixas de seleção;
- podem ser marcadas várias pessoas;
- convidados não podem ser responsáveis.

Na lista de tarefas:
- quando há responsáveis, as fotos aparecem lado a lado;
- quando não há responsável, aparece um seletor rápido;
- depois de escolher o primeiro responsável, os avatares passam a aparecer;
- para adicionar ou remover vários responsáveis, abra os detalhes da tarefa.

## Filtros
O filtro por responsável funciona com tarefas que possuem vários responsáveis.
Uma tarefa aparece se o colaborador filtrado estiver entre os responsáveis.

## Migração
A V3.3 cria a tabela `event_task_responsibles` e migra automaticamente o responsável único antigo para ela.
Nenhum dado existente é perdido.

## Interface
O aviso "Arraste uma tarefa para mudar sua ordem, categoria ou fase..." foi removido.
A funcionalidade de arrastar continua disponível para administradores.

## Atualização
1. Extraia a V3.3.
2. Copie o mesmo `.env` da V3.2.
3. `npm install`
4. `npm start`
