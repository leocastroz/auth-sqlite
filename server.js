// server.js
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors'); // Importando o pacote cors
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 7000;
const SECRET_KEY = 'your_secret_key';

app.use(bodyParser.json());
app.use(cors()); // Usando o middleware cors

// Registro de usuário
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 8);

    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function (err) {
        if (err) return res.status(500).send('Erro ao registrar usuário.');
        res.status(201).send('Usuário registrado com sucesso!');
    });
});

// Login de usuário
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).send({ status: 500, message: 'Erro no servidor.' });
        }
        if (!user) {
            return res.status(404).send({ status: 404, message: 'Usuário não encontrado.' });
        }

        const passwordIsValid = bcrypt.compareSync(password, user.password);
        if (!passwordIsValid) {
            return res.status(401).send({ status: 401, message: 'Senha inválida.' });
        }

        const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: 86400 });
        res.status(200).send({ status: 200, auth: true, token });
    });
});

// Middleware de autenticação
function verifyToken(req, res, next) {
    const token = req.headers['x-access-token'];
    if (!token) return res.status(403).send('Token não fornecido.');

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(500).send('Falha ao autenticar token.');
        req.userId = decoded.id;
        next();
    });
}

// Cadastro de produtos
app.post('/products', verifyToken, (req, res) => {
    const { name, value } = req.body;

    db.run('INSERT INTO products (name, value) VALUES (?, ?)', [name, value], function (err) {
        if (err) return res.status(500).send('Erro ao cadastrar produto.');
        res.status(201).send('Produto cadastrado com sucesso!');
    });
});

// Rota para listar todos os produtos
app.get('/products', verifyToken, (req, res) => {
    db.all('SELECT * FROM products', [], (err, rows) => {
        if (err) {
            return res.status(500).send('Erro ao buscar produtos.');
        }
        res.status(200).json(rows);
    });
});

// Cadastro de despacho
app.post('/dispatches', verifyToken, (req, res) => {
    const { product_id } = req.body;

    db.run('INSERT INTO dispatches (product_id) VALUES (?)', [product_id], function (err) {
        if (err) return res.status(500).send('Erro ao cadastrar despacho.');
        res.status(201).send('Despacho cadastrado com sucesso!');
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});