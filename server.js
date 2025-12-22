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

// Получаем db из router
const db = router.db;

// Инициализируем коллекции если их нет
if (!db.get('tokens').value()) {
  db.set('tokens', []).write();
}
if (!db.get('users').value()) {
  db.set('users', []).write();
}

// Middleware
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(jsonServer.bodyParser);
server.use(middlewares);
server.use(corsMiddleware);

// Передаем db в каждый запрос (единый подход)
server.use((req, res, next) => {
  req.db = db; // Просто req.db, а не req.app.db
  next();
});

// Логирование для отладки
server.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  
  // Логируем заголовки
  if (req.headers.authorization) {
    console.log('Auth token: Present');
  } else {
    console.log('Auth token: Missing');
  }
  
  // Логируем body для POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    console.log('Request body:', req.body || 'Empty');
  }
  
  next();
});

// Публичные маршруты (без аутентификации)
server.use('/api/auth', authRoutes);

// Публичный доступ к категориям и акциям
server.get('/api/categories', (req, res) => {
  try {
    const categories = db.get('categories').value() || [];
    res.json(categories);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка получения категорий' 
    });
  }
});

server.get('/api/promotions', (req, res) => {
  try {
    const promotions = (db.get('promotions').value() || [])
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

// Применяем аутентификацию ко всем остальным маршрутам
server.use(authMiddleware);

// Защищенные маршруты (требуют аутентификацию)
server.use('/api/products', productRoutes);
server.use('/api/cart', cartRoutes);
server.use('/api/orders', orderRoutes);
server.use('/api/favorites', favoriteRoutes);
server.use('/api/notifications', notificationRoutes);

// Профиль пользователя (защищенный)
server.get('/api/profile', (req, res) => {
  try {
    console.log('GET /api/profile - User ID:', req.user?.id);
    
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Пользователь не авторизован' 
      });
    }
    
    const userId = req.user.id;
    
    const userData = db.get('users').find({ id: userId }).value();
    
    if (!userData) {
      return res.status(404).json({ 
        success: false, 
        error: 'Пользователь не найден' 
      });
    }
    
    // Удаляем пароль из ответа
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

// Обновление профиля
server.put('/api/profile', (req, res) => {
  try {
    console.log('PUT /api/profile - User:', req.user?.id);
    console.log('PUT /api/profile - Body:', req.body);
    
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Пользователь не авторизован' 
      });
    }
    
    const userId = req.user.id;
    const updates = req.body || {};
    
    const userData = db.get('users').find({ id: userId }).value();
    
    if (!userData) {
      return res.status(404).json({ 
        success: false, 
        error: 'Пользователь не найден' 
      });
    }
    
    // Обновляем только переданные поля
    const newData = { ...userData };
    
    if (updates.avatar !== undefined) newData.avatar = updates.avatar;
    if (updates.firstName !== undefined) newData.firstName = updates.firstName;
    if (updates.lastName !== undefined) newData.lastName = updates.lastName;
    if (updates.phone !== undefined) newData.phone = updates.phone;
    if (updates.country !== undefined) newData.country = updates.country;
    if (updates.city !== undefined) newData.city = updates.city;
    if (updates.address !== undefined) newData.address = updates.address;
    if (updates.postalCode !== undefined) newData.postalCode = updates.postalCode;
    if (updates.gender !== undefined) newData.gender = updates.gender;
    
    newData.updatedAt = new Date().toISOString();
    
    db.get('users')
      .find({ id: userId })
      .assign(newData)
      .write();
    
    // Удаляем пароль из ответа
    const { password, ...userWithoutPassword } = newData;
    
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

const PORT = 3005;

server.listen(PORT, () => {
  console.log(`👟 Sneaker Shop API запущен на http://localhost:${PORT}`);
  console.log('📚 Доступные маршруты:');
  console.log('🔐 Аутентификация (публичные):');
  console.log('   POST /api/auth/register');
  console.log('   POST /api/auth/login');
  console.log('   POST /api/auth/forgot-password');
  console.log('');
  console.log('📁 Данные (публичные):');
  console.log('   GET /api/categories');
  console.log('   GET /api/promotions');
  console.log('');
  console.log('🔒 Защищенные маршруты (требуют токен):');
  console.log('   GET  /api/profile');
  console.log('   PUT  /api/profile');
  console.log('   GET  /api/products');
  console.log('   GET  /api/cart');
  console.log('   GET  /api/orders');
  console.log('   GET  /api/favorites');
  console.log('   GET  /api/notifications');
});

// Глобальный обработчик ошибок
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