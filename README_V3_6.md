# Antonicelli — Gerenciamento de Projetos V3.6

## Arquivamento de trabalhos
Administradores agora veem o botão **Arquivar** em cada trabalho da lista principal.

Ao arquivar:
- há uma confirmação antes da ação;
- o trabalho sai de **Trabalhos em Andamento**;
- tarefas, colaboradores, histórico e demais dados são preservados;
- o trabalho passa a aparecer em **Arquivados**.

Na tela **Arquivados**, o administrador pode:
- abrir o trabalho;
- **Desarquivar**, devolvendo-o à lista principal;
- mover o trabalho para a **Lixeira**.

## Lixeira
O botão **Excluir** da lista principal não apaga mais o trabalho do banco.

Agora ele:
- pede confirmação;
- move o trabalho para a **Lixeira**;
- permite restaurá-lo posteriormente.

Na tela **Lixeira**, o administrador pode:
- **Restaurar** o trabalho para a lista de Trabalhos em Andamento;
- **Excluir permanentemente**.

A exclusão permanente exige nova confirmação e é irreversível.

## Banco de dados
A V3.6 adiciona quatro campos à tabela `events`:
- `archived_at`
- `archived_by`
- `deleted_at`
- `deleted_by`

Use o mesmo Supabase e o mesmo `.env`.

## Atualização
1. Extraia a V3.6.
2. Copie o `.env` da V3.5.2.
3. Execute `npm install`.
4. Execute `npm start`.

A migração é aplicada automaticamente na inicialização.
