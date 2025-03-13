const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const productsPath = path.join(__dirname, 'products.json');

// Загрузка товаров из JSON-файла
let products = fs.existsSync(productsPath)
    ? JSON.parse(fs.readFileSync(productsPath, 'utf-8'))
    : [];

if (!fs.existsSync(productsPath)) {
    fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
}

// ==== Сервер каталога товаров (Порт 8080) ====
const catalogApp = express();
const CATALOG_PORT = 8080;

catalogApp.use(bodyParser.json());
catalogApp.use(express.static(path.join(__dirname, '../frontend')));

// Главная страница каталога
catalogApp.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Получить список товаров
catalogApp.get('/products', (req, res) => {
    res.json(products);
});

// Получить товары по категории
catalogApp.get('/products/category/:category', (req, res) => {
    const category = req.params.category.toLowerCase();
    const filteredProducts = products.filter(product =>
        product.categories.map(cat => cat.toLowerCase()).includes(category)
    );
    res.json(filteredProducts);
});

// Запуск сервера каталога
catalogApp.listen(CATALOG_PORT, () => {
    console.log(`Каталог товаров запущен: http://localhost:${CATALOG_PORT}`);
});

// ==== Сервер админки (Порт 3000) ====
const adminApp = express();
const ADMIN_PORT = 3000;

adminApp.use(bodyParser.json());

// Главная страница админки
adminApp.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Получить список товаров
adminApp.get('/products', (req, res) => {
    res.json(products);
});

// Получить товар по ID
adminApp.get('/products/:id', (req, res) => {
    const productId = Number(req.params.id);
    const product = products.find(p => p.id === productId);

    if (!product) {
        return res.status(404).json({ message: 'Товар не найден' });
    }

    res.json(product);
});

// Создать новый товар
adminApp.post('/products', (req, res) => {
    const id = products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
    const newProduct = {
        id,
        name: req.body.name,
        price: req.body.price,
        description: req.body.description || 'Нет описания',
        categories: req.body.categories || [],
    };
    products.push(newProduct);
    fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
    res.status(201).json(newProduct);
});

// Обновить товар по ID
adminApp.put('/products/:id', (req, res) => {
    const productId = Number(req.params.id);
    const product = products.find(p => p.id === productId);

    if (!product) {
        return res.status(404).json({ message: 'Товар не найден' });
    }

    Object.assign(product, req.body);
    fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
    res.json(product);
});

// Удалить товар по ID
adminApp.delete('/products/:id', (req, res) => {
    products = products.filter(p => p.id !== Number(req.params.id));
    fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
    res.status(204).send();
});

// Запуск сервера админки
adminApp.listen(ADMIN_PORT, () => {
    console.log(`Сервер админки запущен: http://localhost:${ADMIN_PORT}`);
});
