
const Database = require("better-sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "interntrack.db");
const db = new Database(databasePath);

// Create the users table for login and signup.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    passwordHash TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// Add profile columns to existing databases safely.
const userColumns = [
  { name: "college", type: "TEXT" },
  { name: "degree", type: "TEXT" },
  { name: "graduationYear", type: "INTEGER" },
  { name: "skills", type: "TEXT" },
  { name: "careerGoal", type: "TEXT" }
];

const existingUserColumns = db
  .prepare("PRAGMA table_info(users)")
  .all()
  .map(column => column.name);

for (const column of userColumns) {
  if (!existingUserColumns.includes(column.name)) {
    db.exec(
      `ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`
    );
  }
}

// Keep the existing applications table.
db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    applicationDate TEXT NOT NULL,
    deadline TEXT,
    jobLink TEXT,
    status TEXT NOT NULL DEFAULT 'Applied',
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = db;
