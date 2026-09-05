# Antonicelli — Gestão de Eventos V2.3

## Novos recursos

### Editor do checklist-modelo
Administrador pode:
- renomear o modelo;
- criar, renomear e excluir fases;
- criar, renomear e excluir categorias;
- criar, editar e excluir tarefas;
- acompanhar a versão do modelo.

Cada alteração incrementa automaticamente a versão do checklist-modelo.

### Edição de eventos já criados
Administrador pode:
- adicionar uma tarefa somente ao evento;
- editar nome, fase e categoria de uma tarefa do evento;
- excluir uma tarefa somente daquele evento.

Essas alterações não afetam o checklist-modelo nem outros eventos.

## Regra de versionamento
- Alterações no modelo afetam eventos criados depois da alteração.
- Eventos antigos continuam com a cópia do checklist que receberam no momento da criação.
- Ajustes em um evento existente são locais daquele evento.

## Atualização a partir da V2.2
Você pode usar o mesmo banco Supabase e o mesmo arquivo `.env`.

1. Extraia esta versão em uma nova pasta.
2. Copie seu `.env` da V2.2 para esta pasta.
3. Rode:
   npm install
4. Depois:
   npm start
5. Abra:
   http://localhost:3000

Não é necessário criar outro banco.

## Observação
A V2.3 mantém o schema atual; não há migração destrutiva.
Se já existirem dados no Supabase, eles são preservados.
