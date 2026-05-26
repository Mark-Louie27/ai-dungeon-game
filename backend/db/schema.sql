-- AI Dungeon Game Schema
-- Run this inside your ai_dungeon database

CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  character_class VARCHAR(50) NOT NULL,
  hp INT NOT NULL DEFAULT 10,
  max_hp INT NOT NULL DEFAULT 10,
  xp INT NOT NULL DEFAULT 0,
  location VARCHAR(100) DEFAULT 'The Dark Forest',
  is_alive BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS turns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  turn_number INT NOT NULL DEFAULT 1,
  player_action TEXT,
  scene_text TEXT NOT NULL,
  event_type ENUM('combat', 'explore', 'story', 'loot') DEFAULT 'story',
  hp_change INT DEFAULT 0,
  xp_gain INT DEFAULT 0,
  choices JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Index for faster session lookups
CREATE INDEX idx_turns_session ON turns(session_id);
