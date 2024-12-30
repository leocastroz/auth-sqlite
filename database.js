const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use '/data' no Fly.io e 'data' localmente
const isFlyIo = process.env.FLY_IO === 'true';
const dataDir = isFlyIo ? '/data' : path.resolve(__dirname, 'data');
const dbPath = path.join(dataDir, 'database.db');

// Verificar se o diretório existe, caso contrário, criá-lo
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados:', err.message);
    } else {
        console.log('Banco de dados conectado com sucesso.');
    }
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT UNIQUE,
        username TEXT UNIQUE,
        password TEXT,
        baseImg TEXT DEFAULT NULL,
        nickname TEXT DEFAULT NULL,
        role TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        value REAL,
        user_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS dispatches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS profileUser (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        base_img TEXT,
        age INTEGER,
        nickname TEXT,
        user_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
});

module.exports = db;