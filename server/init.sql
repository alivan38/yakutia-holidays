CREATE TABLE IF NOT EXISTS proposals (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  people VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  region VARCHAR(255),
  approved BOOLEAN DEFAULT FALSE,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trash_proposals (
  id SERIAL PRIMARY KEY,
  original_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  people VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  region VARCHAR(255),
  approved BOOLEAN DEFAULT FALSE,
  images TEXT[] DEFAULT '{}',
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS holidays (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  date VARCHAR(10) NOT NULL,
  people VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  full_description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  image VARCHAR(255),
  images TEXT[] DEFAULT '{}',
  region VARCHAR(255),
  source VARCHAR(255),
  approved BOOLEAN DEFAULT TRUE
);