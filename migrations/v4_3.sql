-- V4.3: additive and safe to reapply. Legacy plain text remains intact.
BEGIN;
ALTER TABLE events ADD COLUMN IF NOT EXISTS client_logo_data TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS additional_info_html TEXT;
CREATE INDEX IF NOT EXISTS event_tasks_event_position_idx ON event_tasks(event_id,position,id);
CREATE INDEX IF NOT EXISTS event_members_user_event_idx ON event_members(user_id,event_id);
CREATE INDEX IF NOT EXISTS template_phases_template_idx ON template_phases(template_id,position);
CREATE INDEX IF NOT EXISTS template_categories_phase_idx ON template_categories(phase_id,position);
CREATE INDEX IF NOT EXISTS template_tasks_category_idx ON template_tasks(category_id,position);
COMMIT;
