CREATE TABLE IF NOT EXISTS users (
 id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','collaborator')) DEFAULT 'collaborator',
 active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS templates (
 id SERIAL PRIMARY KEY, name TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
 active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS template_phases (
 id SERIAL PRIMARY KEY, template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
 name TEXT NOT NULL, position INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS template_categories (
 id SERIAL PRIMARY KEY, phase_id INTEGER NOT NULL REFERENCES template_phases(id) ON DELETE CASCADE,
 name TEXT NOT NULL, position INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS template_tasks (
 id SERIAL PRIMARY KEY, category_id INTEGER NOT NULL REFERENCES template_categories(id) ON DELETE CASCADE,
 name TEXT NOT NULL, position INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
 id SERIAL PRIMARY KEY, name TEXT NOT NULL, client TEXT, event_date DATE, place TEXT,
 template_id INTEGER REFERENCES templates(id), template_version INTEGER,
 created_by INTEGER REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS event_members (
 event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 PRIMARY KEY(event_id,user_id)
);
CREATE TABLE IF NOT EXISTS event_tasks (
 id SERIAL PRIMARY KEY, event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
 phase_name TEXT NOT NULL, category_name TEXT NOT NULL, name TEXT NOT NULL, position INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'Não Iniciado',
 responsible_user_id INTEGER REFERENCES users(id),
 observations TEXT DEFAULT '', updated_by INTEGER REFERENCES users(id),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS audit_log (
 id SERIAL PRIMARY KEY, event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
 task_id INTEGER REFERENCES event_tasks(id) ON DELETE SET NULL,
 user_id INTEGER REFERENCES users(id), action TEXT NOT NULL, details JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- V2.5: detalhes da tarefa (migração não destrutiva)
ALTER TABLE event_tasks ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE event_tasks ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE event_tasks ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

UPDATE event_tasks SET status='Não Iniciada' WHERE status='Não Iniciado';
UPDATE event_tasks SET status='Concluída' WHERE status='Concluído';
UPDATE event_tasks SET status='Atrasada' WHERE status='Bloqueado';
UPDATE event_tasks SET status='Não Iniciada' WHERE status='Não se Aplica';


-- V2.8: cabeçalho detalhado de eventos
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS participants INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS additional_info TEXT DEFAULT '';


-- V3.0: perfis de acesso e convites
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK(role IN ('admin','collaborator','guest'));

CREATE TABLE IF NOT EXISTS invitations (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('collaborator','guest')),
  token TEXT UNIQUE NOT NULL,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  invited_by INTEGER REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invitations_token_idx ON invitations(token);
CREATE INDEX IF NOT EXISTS invitations_email_idx ON invitations(email);


-- V3.1: foto de perfil e convites de administrador
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_data TEXT;

ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_role_check;
ALTER TABLE invitations
  ADD CONSTRAINT invitations_role_check
  CHECK(role IN ('admin','collaborator','guest'));


-- V3.3: múltiplos responsáveis por tarefa
CREATE TABLE IF NOT EXISTS event_task_responsibles (
  task_id INTEGER NOT NULL REFERENCES event_tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY(task_id,user_id)
);

CREATE INDEX IF NOT EXISTS event_task_responsibles_user_idx
  ON event_task_responsibles(user_id);

-- Migra o responsável único antigo para a nova tabela, sem apagar o campo legado.
INSERT INTO event_task_responsibles(task_id,user_id)
SELECT id,responsible_user_id
FROM event_tasks
WHERE responsible_user_id IS NOT NULL
ON CONFLICT DO NOTHING;


-- V3.5: múltiplos modelos de trabalho e identificação visual
ALTER TABLE templates ADD COLUMN IF NOT EXISTS type_label TEXT;
UPDATE templates SET type_label='Evento' WHERE type_label IS NULL OR BTRIM(type_label)='';

-- Corrige o valor padrão legado para novas tarefas.
ALTER TABLE event_tasks ALTER COLUMN status SET DEFAULT 'Não Iniciada';


-- V3.6: arquivamento e lixeira de trabalhos
ALTER TABLE events ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS archived_by INTEGER REFERENCES users(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS events_archived_at_idx ON events(archived_at);
CREATE INDEX IF NOT EXISTS events_deleted_at_idx ON events(deleted_at);
