# Antonicelli — Gestão de Eventos V2.1

V2.1 corrigida para Node.js 24, sem better-sqlite3. O banco agora é PostgreSQL usando `pg`, que suporta Node 24 e utiliza o driver JavaScript puro, sem módulo nativo de compilação.

## 1. Instalar
Abra PowerShell nesta pasta:

    npm install

## 2. Criar banco PostgreSQL
Você pode usar PostgreSQL localmente ou um PostgreSQL hospedado. O sistema espera uma variável `DATABASE_URL`.

Exemplo:
    DATABASE_URL=postgresql://usuario:senha@host:5432/antonicelli

## 3. Configurar .env
Copie `.env.example` para `.env` e preencha:
    PORT=3000
    JWT_SECRET=uma-chave-longa
    DATABASE_URL=postgresql://...

Se o provedor exigir SSL:
    DATABASE_SSL=true

O Node 24 consegue carregar `.env` diretamente via `--env-file-if-exists`, portanto não é necessário instalar dotenv.

## 4. Rodar
    npm start

Depois:
    http://localhost:3000

Primeiro acesso:
    admin@antonicelli.local
    admin123

Troque a senha antes de usar em produção.

## 5. O que a V2.1 contém
- autenticação JWT
- administrador/colaborador
- PostgreSQL
- modelo versionado
- eventos criados por cópia do modelo
- 5 fases e 111 tarefas importadas
- status e observações
- membros por evento
- auditoria

## Próximo passo
Depois que o banco estiver conectado e o login funcionar, vamos implementar a interface completa para:
- editar o modelo;
- adicionar/excluir/reordenar tarefas;
- atribuir colaboradores aos eventos;
- módulos de Equipamentos e Tempos & Movimentos;
- deploy online.
