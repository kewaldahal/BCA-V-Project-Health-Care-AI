const sqlite3 = require('sqlite3').verbose();

const DBSOURCE = "db.sqlite";

const db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
      console.error(err.message);
      throw err;
    } else {
        console.log('Connected to the SQLite database.');
        db.exec(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            password TEXT,
            age INTEGER,
            weight REAL,
            medical_conditions TEXT,
            symptoms TEXT,
            CONSTRAINT email_unique UNIQUE (email)
            )`,
        (err) => {
            if (err) {
                // Table already created
            }
        });  

        db.exec(`CREATE TABLE IF NOT EXISTS analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            report_data TEXT,
            summary TEXT,
            predictions TEXT,
            health_score INTEGER,
            recommendations TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
            )`,
        (err) => {
            if (err) {
                // Table already created
            }
        });

        db.exec(`CREATE TABLE IF NOT EXISTS chats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            role TEXT,
            message TEXT,
            metadata TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
            )`,
        (err) => {
            if (err) {
                // Table already created
            }
        });
    }
});

module.exports = db;
