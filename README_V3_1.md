# Antonicelli — Gestão de Eventos V3.1

## Novidades

### Administrador em novos convites
Ao convidar um novo usuário, agora é possível escolher:
- Administrador
- Colaborador
- Convidado

### Foto no cadastro
Na tela de conclusão do convite, o novo usuário pode escolher uma foto de perfil.
A foto é opcional e é redimensionada automaticamente no navegador antes de ser salva.

### Editar perfil
Todos os usuários têm um botão "Perfil" no cabeçalho.
É possível:
- alterar o nome;
- trocar a foto;
- remover a foto.

O e-mail continua sendo o identificador de login e não é alterado pela tela de perfil.

### Exibição da foto
A foto/avatares aparecem no cabeçalho ao lado do nome do usuário.

## Banco de dados
Continua usando o mesmo Supabase.
A migração apenas:
- adiciona `avatar_data` em `users`;
- permite `admin` na tabela de convites.

As fotos são armazenadas diretamente no banco já redimensionadas, evitando depender de outro serviço de armazenamento nesta etapa.

## Atualização
1. Extraia a V3.1.
2. Copie o mesmo `.env` da V3.0.
3. `npm install`
4. `npm start`
