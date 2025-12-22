const jsonServer = require('json-server');
const express = require('express');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const favoriteRoutes = require('./routes/favorites');
const notificationRoutes = require('./routes/notifications');
const authMiddleware = require('./middlewares/auth');
const corsMiddleware = require('./middlewares/cors');

const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

// ИСПРАВЛЕНО: Получаем db из router
const db = router.db;

// Инициализируем коллекции если их нет
if (!db.get('tokens').value()) {
  db.set('tokens', []).write();
}
if (!db.get('users').value()) {
  db.set('users', []).write();
}

// Middleware - ИСПРАВЛЕНО:
server.use(express.json()); // ✅ Добавьте скобки
server.use(express.urlencoded({ extended: true })); // ✅ Исправлено название
server.use(jsonServer.bodyParser);
server.use(middlewares);
server.use(corsMiddleware);

// ИСПРАВЛЕНО: Передаем db в app
server.use((req, res, next) => {
  req.app = req.app || {};
  req.app.db = db; // ✅ db теперь определена
  console.log('Setting db to request');
  next();
});

// Добавим логирование для отладки
server.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body || 'No body');
  next();
});

// Публичные маршруты
server.use('/api/auth', authRoutes);

// Применяем аутентификацию
server.use(authMiddleware);

// Защищенные маршруты
server.use('/api/products', productRoutes);
server.use('/api/cart', cartRoutes);
server.use('/api/orders', orderRoutes);
server.use('/api/favorites', favoriteRoutes);
server.use('/api/notifications', notificationRoutes);

// Профиль пользователя - ИСПРАВЛЕНО:
server.get('/api/profile', (req, res) => {
  try {
    console.log('GET /api/profile - User:', req.user);
    
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Пользователь не авторизован' 
      });
    }
    
    const user = req.user;
    const db = req.app.db || router.db; // Безопасное получение db
    
    console.log('Looking for user with id:', user.id);
    
    const userData = db.get('users').find({ id: user.id }).value();
    
    if (!userData) {
      return res.status(404).json({ 
        success: false, 
        error: 'Пользователь не найден' 
      });
    }
    
    console.log('Found user:', userData.email);
    
    // Удаляем пароль
    const { password, ...userWithoutPassword } = userData;
    
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

// Обновление профиля - ИСПРАВЛЕНО:
server.put('/api/profile', (req, res) => {
  try {
    console.log('PUT /api/profile - User:', req.user);
    console.log('PUT /api/profile - Body:', req.body);
    
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Пользователь не авторизован' 
      });
    }
    
    const user = req.user;
    const {
      avatar, 
      firstName, 
      lastName, 
      phone, 
      country, 
      city, 
      address, 
      postalCode, 
      gender 
    } = req.body || {}; // ✅ Защита от undefined
    
    const db = req.app.db || router.db;
    
    const userData = db.get('users').find({ id: user.id }).value();
    
    if (!userData) {
      return res.status(404).json({ 
        success: false, 
        error: 'Пользователь не найден' 
      });
    }
    
    // Обновляем только переданные поля
    const updates = {};
    if (avatar !== undefined) updates.avatar = avatar;
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (phone !== undefined) updates.phone = phone;
    if (country !== undefined) updates.country = country;
    if (city !== undefined) updates.city = city;
    if (address !== undefined) updates.address = address;
    if (postalCode !== undefined) updates.postalCode = postalCode;
    if (gender !== undefined) updates.gender = gender;
    
    updates.updatedAt = new Date().toISOString();
    
    db.get('users')
      .find({ id: user.id })
      .assign(updates)
      .write();
      
    const updatedUser = db.get('users').find({ id: user.id }).value();
    const { password: _, ...userWithoutPassword } = updatedUser;
    
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
server.get('/api/categories', (req, res) => {
  try {
    const db = router.db;
    const categories = db.get('categories').value();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка получения категорий' });
  }
});

// Акции
server.get('/api/promotions', (req, res) => {
  try {
    const db = router.db;
    
    const promotions = db.get('promotions')
      .filter({ isActive: true })
      .map(promotion => ({
        id: promotion.id,
        image: promotion.image,
        validUntil: promotion.validUntil,
        isActive: promotion.isActive,
        createdAt: promotion.createdAt
      }))
      .value();
    
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка получения акций' });
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