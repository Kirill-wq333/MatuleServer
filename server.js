const express = require('express');
const fs = require('fs');
const path = require('path');

// Загружаем существующие роуты
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const favoriteRoutes = require('./routes/favorites');
const notificationRoutes = require('./routes/notifications');
const authMiddleware = require('./middlewares/auth');
const corsMiddleware = require('./middlewares/cors');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(corsMiddleware);

// Функция для работы с db.json
function getDatabase() {
  try {
    const dbPath = path.join(__dirname, 'db.json');
    
    // Если файла нет - создаем базовую структуру
    if (!fs.existsSync(dbPath)) {
      const initialData = {
        users: [],
        tokens: [],
        products: [],
        categories: [],
        promotions: [],
        cart: [],
        orders: [],
        favorites: [],
        notifications: []
      };
      fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
      console.log('Created new db.json file');
    }
    
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return { users: [], tokens: [] }; // Возвращаем пустую структуру
  }
}

function saveDatabase(data) {
  try {
    const dbPath = path.join(__dirname, 'db.json');
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving database:', error);
    return false;
  }
}

// Передаем функции работы с БД в каждый запрос
app.use((req, res, next) => {
  req.getDatabase = getDatabase;
  req.saveDatabase = saveDatabase;
  next();
});

// Логирование
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Headers:', req.headers.authorization ? 'Token present' : 'No token');
  console.log('Body:', req.body || 'Empty');
  next();
});

// Публичные маршруты
app.use('/api/auth', authRoutes);

// Применяем аутентификацию ко всем остальным маршрутам
app.use(authMiddleware);

// Защищенные маршруты
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/notifications', notificationRoutes);

// Профиль пользователя
app.get('/api/profile', (req, res) => {
  try {
    console.log('GET /api/profile - User:', req.user);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Пользователь не авторизован'
      });
    }
    
    const db = req.getDatabase();
    const user = db.users.find(u => u.id === req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    // Удаляем пароль из ответа
    const { password, ...userWithoutPassword } = user;
    
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Profile GET error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера',
      details: error.message
    });
  }
});

// Обновление профиля
app.put('/api/profile', (req, res) => {
  try {
    console.log('PUT /api/profile - User:', req.user);
    console.log('PUT /api/profile - Body:', req.body);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Пользователь не авторизован'
      });
    }
    
    const userId = req.user.id;
    const updates = req.body || {};
    
    const db = req.getDatabase();
    const userIndex = db.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    // Обновляем только переданные поля
    db.users[userIndex] = {
      ...db.users[userIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // Сохраняем изменения
    req.saveDatabase(db);
    
    // Удаляем пароль из ответа
    const { password, ...userWithoutPassword } = db.users[userIndex];
    
    res.json({
      success: true,
      user: userWithoutPassword,
      message: 'Профиль успешно обновлен'
    });
  } catch (error) {
    console.error('Profile PUT error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка обновления профиля',
      details: error.message
    });
  }
});

// Категории
app.get('/api/categories', (req, res) => {
  try {
    const db = req.getDatabase();
    res.json(db.categories || []);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ошибка получения категорий'
    });
  }
});

// Акции
app.get('/api/promotions', (req, res) => {
  try {
    const db = req.getDatabase();
    const promotions = (db.promotions || [])
      .filter(p => p.isActive === true)
      .map(p => ({
        id: p.id,
        image: p.image,
        validUntil: p.validUntil,
        isActive: p.isActive,
        createdAt: p.createdAt
      }));
    
    res.json(promotions);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ошибка получения акций'
    });
  }
});

const PORT = 3005;

server.listen(PORT, () => {
  console.log(`👟 Sneaker Shop API запущен на http://localhost:${PORT}`);
  console.log('📚 Документация API:');
  console.log('🔐 Аутентификация:');
  console.log('   POST /api/auth/register - Регистрация');
  console.log('   POST /api/auth/login - Вход');
  console.log('   POST /api/auth/logout - Выход');
  console.log('   POST /api/auth/forgot-password - Восстановление пароля');
  console.log('   GET  /api/profile - Профиль');
  console.log('   PUT  /api/profile - Обновление профиля');
  console.log('');
  console.log('📁 Данные:');
  console.log('   GET  /api/categories - Категории');
  console.log('   GET  /api/promotions - Акции');
  console.log('');
  console.log('👟 Продукты:');
  console.log('   GET  /api/products - Все товары');
  console.log('   GET  /api/products/:id - Товар по ID');
  console.log('   GET  /api/products/category/:category - По категории');
  console.log('');
  console.log('🛒 Корзина:');
  console.log('   GET  /api/cart - Корзина пользователя');
  console.log('   POST /api/cart - Добавить в корзину');
  console.log('   PUT  /api/cart/:id - Обновить корзину');
  console.log('   DELETE /api/cart/:id - Удалить из корзины');
  console.log('');
  console.log('📦 Заказы:');
  console.log('   GET  /api/orders - История заказов');
  console.log('   POST /api/orders - Создать заказ');
  console.log('   GET  /api/orders/:id - Детали заказа');
  console.log('');
  console.log('❤️  Избранное:');
  console.log('   GET  /api/favorites - Избранное пользователя');
  console.log('   POST /api/favorites/:productId - Добавить в избранное');
  console.log('   DELETE /api/favorites/:productId - Удалить из избранного');
  console.log('');
  console.log('🔔 Уведомления:');
  console.log('   GET  /api/notifications - Уведомления пользователя');
  console.log('   PUT  /api/notifications/:id/read - Отметить как прочитанное');
});

server.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  if (error instanceof TypeError) {
    return res.status(400).json({
      success: false,
      error: 'Ошибка обработки данных',
      details: error.message
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Внутренняя ошибка сервера'
  });
});