CREATE TABLE IF NOT EXISTS platform_settings (
  setting_key VARCHAR(64) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_by INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO platform_settings (setting_key, setting_value)
VALUES ('active_layout', 'classic')
ON DUPLICATE KEY UPDATE setting_key = setting_key;
