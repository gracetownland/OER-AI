exports.up = (pgm) => {
  pgm.sql(`
    -- Add a nullable chat_session_id to user_interactions and index it
    ALTER TABLE user_interactions
      ADD COLUMN chat_session_id uuid;

    CREATE INDEX idx_user_interactions_chat_session_id ON user_interactions(chat_session_id);

    -- Add foreign key constraint linking interactions to chat_sessions
    ALTER TABLE user_interactions
      ADD CONSTRAINT fk_user_interactions_chat_session_id FOREIGN KEY (chat_session_id) REFERENCES chat_sessions(id);

    -- Add last_active_at to chat_sessions so we can quickly update the last activity timestamp
    ALTER TABLE chat_sessions
      ADD COLUMN last_active_at timestamptz DEFAULT now();
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE user_interactions DROP CONSTRAINT fk_user_interactions_chat_session_id;
    DROP INDEX idx_user_interactions_chat_session_id;
    ALTER TABLE user_interactions DROP COLUMN chat_session_id;
    ALTER TABLE chat_sessions DROP COLUMN last_active_at;
  `);
};
