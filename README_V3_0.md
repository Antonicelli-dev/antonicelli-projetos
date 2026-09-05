# Antonicelli — Gestão de Eventos V3.0

## Níveis de acesso

### Administrador
Pode:
- criar e excluir eventos;
- editar os dados gerais do evento;
- gerenciar colaboradores;
- convidar novos usuários;
- editar o checklist-modelo;
- criar, editar e excluir tarefas;
- reorganizar tarefas, fases e categorias.

### Colaborador
Dentro dos eventos em que participa, pode:
- visualizar o evento;
- criar novas tarefas;
- editar nome, status, responsável, datas e anotações das tarefas;
- excluir tarefas.

Não pode:
- criar eventos;
- excluir eventos;
- editar o checklist-modelo;
- gerenciar colaboradores;
- renomear categorias ou reorganizar a estrutura por arrastar.

### Convidado
Pode apenas visualizar os eventos e tarefas aos quais recebeu acesso.
Nenhum campo de tarefa pode ser alterado.

## Cadastro e convites
Na janela "Colaboradores" do evento:
- é possível adicionar uma pessoa já cadastrada;
- há a opção "Convidar novo colaborador";
- o administrador informa nome, e-mail e nível de acesso;
- o convite é associado ao evento atual;
- a pessoa recebe um link para criar a própria senha;
- após concluir o cadastro, a conta é automaticamente adicionada ao evento;
- depois disso ela passa a aparecer normalmente na lista de usuários cadastrados.

## Excluir colaborador
A opção "Excluir colaborador" desativa a conta e remove a pessoa dos eventos.
O histórico de alterações é preservado.

## Configuração do envio de e-mail
Adicione ao `.env`:

APP_URL=https://URL-PUBLICA-DA-PLATAFORMA
SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario
SMTP_PASS=senha
MAIL_FROM="Antonicelli Eventos <eventos@seudominio.com>"

Sem SMTP configurado, o sistema cria o convite e mostra o link na tela para teste, mas não envia o e-mail.

IMPORTANTE:
APP_URL precisa ser uma URL acessível pelo convidado. `http://localhost:3000` funciona apenas no computador onde o sistema está rodando.

## Banco de dados
A V3.0 continua usando o mesmo Supabase.
A migração:
- amplia o campo `role` para aceitar `guest`;
- cria a tabela `invitations`.

Nenhum evento ou tarefa existente é apagado.

## Atualização
1. Extraia a V3.0.
2. Copie o `.env` da V2.9.
3. Acrescente as configurações SMTP.
4. Execute `npm install`.
5. Execute `npm start`.
