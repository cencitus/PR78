const { ApolloServer, gql } = require('apollo-server-express');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const bodyParser = require('body-parser');

const PORT = 3000;
const app = express();

// Инициализация данных
const productsPath = path.join(__dirname, 'products.json');
let products = [];

// Создаем файл products.json если его нет
if (!fs.existsSync(productsPath)) {
    fs.writeFileSync(productsPath, '[]');
}

function loadProducts() {
    try {
        const data = fs.readFileSync(productsPath, 'utf-8');
        products = JSON.parse(data);
        return products;
    } catch (err) {
        console.error('Ошибка загрузки товаров:', err);
        return [];
    }
}

function saveProducts() {
    fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
}

// Настройка CORS (должен быть первым middleware)
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(bodyParser.json());

// Статические файлы из Practice5 и Practice6
app.use(express.static(path.join(__dirname, '../Practice5'))); // Основной интерфейс
app.use(express.static(path.join(__dirname, '../Practice6'))); // Админ-панель

// Явные маршруты для HTML-страниц
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../Practice5/index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../Practice6/admin.html'));
});

// GraphQL схема
const typeDefs = gql`
    type Product {
        id: ID!
        name: String!
        price: Float!
        description: String
        categories: [String]
    }

    type Query {
        products: [Product]
        product(id: ID!): Product
    }

    type Mutation {
        addProduct(name: String!, price: Float!, description: String, categories: [String]): Product
    }
`;

// Резолверы
const resolvers = {
    Query: {
        products: () => loadProducts(),
        product: (_, { id }) => products.find(p => p.id == id),
    },
    Mutation: {
        addProduct: (_, { name, price, description, categories }) => {
            const newProduct = {
                id: products.length ? Math.max(...products.map(p => p.id)) + 1 : 1,
                name,
                price,
                description: description || '',
                categories: categories || [],
            };
            products.push(newProduct);
            saveProducts();
            return newProduct;
        },
    },
};

// Apollo Server
const server = new ApolloServer({ typeDefs, resolvers });

// Swagger
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Product API',
            version: '1.0.0',
            description: 'API для управления товарами',
        },
        servers: [{ url: `http://localhost:${PORT}` }],
    },
    apis: ['./server.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// WebSocket сервер
const wss = new WebSocket.Server({ port: 8080 });
let chatHistory = [];

wss.on('connection', (ws) => {
    console.log('Новое подключение к WebSocket');
    ws.send(JSON.stringify({ history: chatHistory }));

    ws.on('message', (message) => {
        const msg = JSON.parse(message.toString());
        chatHistory.push(msg);
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(msg));
            }
        });
    });

    ws.on('close', () => console.log('Клиент отключился'));
});

// REST API
app.get('/products', (req, res) => res.json(products));
app.post('/products', (req, res) => {
    const { name, price, description, categories } = req.body;
    const newProduct = {
        id: products.length ? products[products.length - 1].id + 1 : 1,
        name,
        price,
        description: description || '',
        categories: categories || [],
    };
    products.push(newProduct);
    saveProducts();
    res.status(201).json(newProduct);
});

// Запуск сервера
async function startServer() {
    await server.start();
    server.applyMiddleware({ app });

    app.listen(PORT, () => {
        console.log(`Сервер запущен: http://localhost:${PORT}`);
        console.log(`GraphQL: http://localhost:${PORT}/graphql`);
        console.log(`Swagger: http://localhost:${PORT}/api-docs`);
        console.log(`WebSocket: ws://localhost:8080`);
    });
}

// Инициализация
loadProducts();
startServer();