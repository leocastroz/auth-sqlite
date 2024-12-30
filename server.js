const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'your_secret_key';

app.use(bodyParser.json());
app.use(cors());

// Registro de usuário
app.post('/register', (req, res) => {
    const { username, password, baseImg, nickname, role } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 8);
    const userId = Math.random().toString(36).substr(2, 9);

    db.run('INSERT INTO users (userId, username, password, baseImg, nickname, role) VALUES (?, ?, ?, ?, ?, ?)', [userId, username, hashedPassword, baseImg, nickname, role], function (err) {
        if (err) return res.status(500).send({ status: 500, message: 'Erro ao registrar usuário.' });
        res.status(201).send({ status: 201, message: 'Usuário registrado com sucesso!', userId });
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

        const token = jwt.sign({ id: user.id, userId: user.userId }, SECRET_KEY, { expiresIn: 86400 });
        res.status(200).send({ status: 200, auth: true, token: token, userId: user.userId, username: user.username, baseImg: user.baseImg, nickname: user.nickname, role: user.role });
    });
});

// Middleware de autenticação
function verifyToken(req, res, next) {
    const token = req.headers['x-access-token'];
    if (!token) return res.status(403).send('Token não fornecido.');

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(500).send('Falha ao autenticar token.');
        req.userId = decoded.userId;
        next();
    });
}

// Cadastro de produtos
app.post('/products', verifyToken, (req, res) => {
    const { name, value } = req.body;

    const userId = req.userId;
    if (!userId) {
        return res.status(400).send('User ID não fornecido.');
    }

    db.run('INSERT INTO products (name, value, user_id) VALUES (?, ?, ?)', [name, value, userId], function (err) {
        if (err) return res.status(500).send('Erro ao cadastrar produto.');
        res.status(201).send('Produto cadastrado com sucesso!');
    });
});

// Rota para listar todos os produtos de um usuário
app.get('/products', verifyToken, (req, res) => {
    const userId = req.userId;

    db.all('SELECT * FROM products WHERE user_id = ?', [userId], (err, rows) => {
        if (err) {
            return res.status(500).send('Erro ao buscar produtos.');
        }
        res.status(200).json(rows);
    });
});

// Cadastro de perfil de usuário
app.post('/profile', verifyToken, (req, res) => {
    const { base_img, age, nickname } = req.body;
    const userId = req.userId;

    db.run('INSERT INTO profileUser (base_img, age, nickname, user_id) VALUES (?, ?, ?, ?)', [base_img, age, nickname, userId], function (err) {
        if (err) return res.status(500).send('Erro ao cadastrar perfil de usuário.');
        res.status(201).send('Perfil de usuário cadastrado com sucesso!');
    });
});

// Rota para obter o perfil de usuário
app.get('/profile', verifyToken, (req, res) => {
    const userId = req.userId;

    db.get('SELECT * FROM profileUser WHERE user_id = ?', [userId], (err, row) => {
        if (err) {
            return res.status(500).send('Erro ao buscar perfil de usuário.');
        }
        res.status(200).json(row);
    });
});

// Rota para editar o perfil de usuário
app.put('/profile', verifyToken, (req, res) => {
    const { base_img, age, nickname } = req.body;
    const userId = req.userId;

    db.run('UPDATE profileUser SET base_img = ?, age = ?, nickname = ? WHERE user_id = ?', [base_img, age, nickname, userId], function (err) {
        if (err) return res.status(500).send('Erro ao atualizar perfil de usuário.');
        res.status(200).send('Perfil de usuário atualizado com sucesso!');
    });
});

// Rota para editar os dados do usuário
app.put('/users', verifyToken, (req, res) => {
    const { baseImg, nickname } = req.body;
    const userId = req.userId;

    db.run('UPDATE users SET baseImg = ?, nickname = ? WHERE userId = ?', [baseImg, nickname, userId], function (err) {
        if (err) return res.status(500).send(err);
        res.status(200).send('Dados do usuário atualizados com sucesso!');
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

// Rota para deletar um produto baseado no seu ID
app.delete('/products/:id', verifyToken, (req, res) => {
    const productId = req.params.id;
    const userId = req.userId;

    db.run('DELETE FROM products WHERE id = ? AND user_id = ?', [productId, userId], function (err) {
        if (err) return res.status(500).send('Erro ao deletar produto.');
        if (this.changes === 0) return res.status(404).send('Produto não encontrado ou não pertence ao usuário.');
        res.status(200).send('Produto deletado com sucesso!');
    });
});

// Rota para listar todos os usuários
app.get('/users', verifyToken, (req, res) => {
    db.all('SELECT * FROM users', [], (err, rows) => {
        if (err) {
            return res.status(500).send('Erro ao buscar usuários.');
        }
        res.status(200).json(rows);
    });
});

// Rota para obter os dados do usuário logado
app.get('/user', verifyToken, (req, res) => {
    const userId = req.userId;

    db.get('SELECT * FROM users WHERE userId = ?', [userId], (err, row) => {
        if (err) {
            return res.status(500).send('Erro ao buscar dados do usuário.');
        }
        res.status(200).json(row);
    });
});

// Rota para resetar a senha do usuário
app.put('/reset-password', (req, res) => {
    const { username, newPassword } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).send({ status: 500, message: 'Erro no servidor.' });
        }
        if (!user) {
            return res.status(404).send({ status: 404, message: 'Usuário não encontrado.' });
        }

        const hashedPassword = bcrypt.hashSync(newPassword, 8);

        db.run('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, username], function (err) {
            if (err) return res.status(500).send({ status: 500, message: 'Erro ao atualizar senha.' });
            res.status(200).send({ status: 200, message: 'Senha atualizada com sucesso!' });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});