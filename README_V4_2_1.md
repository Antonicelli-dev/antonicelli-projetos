# Antonicelli — V4.2.1 Render

Correções no fluxo de convites.

## Reconvite de colaborador excluído

Quando um colaborador é excluído, a conta permanece desativada para preservar o histórico.

Agora esse mesmo e-mail pode receber um novo convite normalmente.

Ao concluir o novo cadastro:
- a conta original é reativada;
- o histórico permanece associado ao mesmo usuário;
- nome, senha e nível de acesso são atualizados conforme o novo convite;
- se uma nova foto for escolhida, ela substitui a anterior;
- se nenhuma nova foto for enviada, a foto anterior é mantida;
- o usuário é adicionado novamente ao trabalho que originou o convite.

Contas que já estão ativas continuam não podendo ser convidadas como se fossem novas; nesse caso deve ser usada a opção de adicionar colaborador existente.

## Tela pública do convite

A página recebida pelo colaborador não mostra mais o nome do evento/trabalho.

Ela exibe apenas:
- nível de acesso;
- nome;
- e-mail;
- foto opcional;
- criação de senha.

A API pública do token também deixou de retornar o nome do trabalho.

## Banco de dados

Nenhuma alteração de schema é necessária.
Use o mesmo Supabase e as mesmas variáveis do Render.
