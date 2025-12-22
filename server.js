// server.js
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

const app = express();
const PORT = 3005;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Пропускаем OPTIONS запросы
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Функции для работы с базой данных
function getDatabase() {
  try {
    const dbPath = path.join(__dirname, 'db.json');
    
    // Если файла нет - создаем из примера
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
    return { users: [], tokens: [] };
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

// Логирование запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Публичные маршруты (только аутентификация)
app.use('/api/auth', authRoutes);

// Применяем аутентификацию ко ВСЕМ маршрутам ниже
app.use(authMiddleware);

// ============= ЗАЩИЩЕННЫЕ МАРШРУТЫ (требуют токен) =============

// Категории (теперь защищенные)
app.get('/api/categories', (req, res) => {
  try {
    const db = req.getDatabase();
    res.json(db.categories || []);
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения категорий'
    });
  }
});

// Акции (теперь защищенные)
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
    console.error('Promotions error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения акций'
    });
  }
});

// Профиль пользователя (защищенный)
app.get('/api/profile', (req, res) => {
  try {
    console.log('GET /api/profile - User:', req.user);
    
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
    
    console.log('✅ Profile found:', user.email);
    
    res.json(userWithoutPassword);
    
  } catch (error) {
    console.error('❌ Profile GET error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера при получении профиля',
      details: error.message
    });
  }
});

// Обновить профиль (защищенный)
app.put('/api/profile', (req, res) => {
  try {
    console.log('PUT /api/profile - Body:', req.body);
    
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
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'country', 
      'city', 'address', 'postalCode', 'avatar', 'gender'
    ];
    
    const validUpdates = {};
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        validUpdates[field] = updates[field];
      }
    });
    
    // Обновляем пользователя
    db.users[userIndex] = {
      ...db.users[userIndex],
      ...validUpdates,
      updatedAt: new Date().toISOString()
    };
    
    // Сохраняем изменения
    if (!req.saveDatabase(db)) {
      throw new Error('Ошибка сохранения в базу данных');
    }
    
    // Удаляем пароль из ответа
    const { password, ...userWithoutPassword } = db.users[userIndex];
    
    console.log('✅ Profile updated for:', db.users[userIndex].email);
    
    res.json({
      success: true,
      user: userWithoutPassword,
      message: 'Профиль успешно обновлен'
    });
    
  } catch (error) {
    console.error('❌ Profile PUT error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка обновления профиля',
      details: error.message
    });
  }
});

// Остальные защищенные маршруты
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/notifications', notificationRoutes);

// Обработка 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Маршрут ${req.method} ${req.path} не найден`
  });
});

// Глобальный обработчик ошибок
app.use((error, req, res, next) => {
  console.error('🔥 Global error handler:', error);
  
  if (error instanceof TypeError && error.message.includes('Cannot convert undefined')) {
    return res.status(400).json({
      success: false,
      error: 'Некорректные данные в запросе',
      details: 'Проверьте формат передаваемых данных'
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Внутренняя ошибка сервера',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`✅ Sneaker Shop API запущен на http://localhost:${PORT}`);
  console.log('');
  console.log('🔐 ТРЕБУЮТ ТОКЕН:');
  console.log('   GET  /api/profile - Профиль пользователя');
  console.log('   PUT  /api/profile - Обновить профиль');
  console.log('   GET  /api/categories - Категории товаров');
  console.log('   GET  /api/promotions - Акции и скидки');
  console.log('   GET  /api/products - Все товары');
  console.log('   GET  /api/cart - Корзина пользователя');
  console.log('   GET  /api/orders - История заказов');
  console.log('   GET  /api/favorites - Избранное');
  console.log('   GET  /api/notifications - Уведомления');
  console.log('');
  console.log('🔓 ПУБЛИЧНЫЕ МАРШРУТЫ:');
  console.log('   POST /api/auth/register - Регистрация');
  console.log('   POST /api/auth/login - Вход');
  console.log('   POST /api/auth/logout - Выход');
  console.log('   POST /api/auth/forgot-password - Восстановление пароля');
  console.log('');
  console.log('📝 Тестовые токены:');
  console.log('   • admin@example.com: admin_permanent_token_12345');
  console.log('   • kirill@gmail.com: user_token_1764185793638');
});