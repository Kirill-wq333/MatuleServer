const jsonServer = require('json-server');
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

// Middleware
server.use(jsonServer.bodyParser);
server.use(middlewares);
server.use(corsMiddleware);

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

// Профиль пользователя
server.get('/api/profile', (req, res) => {
  const user = req.user;
  const db = router.db;
  
  const userData = db.get('users').find({ id: user.id }).value();
  const { password, ...userWithoutPassword } = userData;
  
  res.json(userWithoutPassword);
});

// Обновление профиля
server.put('/api/profile', (req, res) => {
  const user = req.user;
  const { 
    firstName, 
    lastName, 
    phone, 
    country, 
    city, 
    address, 
    postalCode, 
    dateOfBirth, 
    gender 
  } = req.body;
  
  const db = router.db;
  
  const userData = db.get('users').find({ id: user.id }).value();
  
  if (!userData) {
    return res.status(404).json({ 
      success: false, 
      error: 'Пользователь не найден' 
    });
  }
  
  // Обновляем только переданные поля
  const updates = {};
  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  if (phone !== undefined) updates.phone = phone;
  if (country !== undefined) updates.country = country;
  if (city !== undefined) updates.city = city;
  if (address !== undefined) updates.address = address;
  if (postalCode !== undefined) updates.postalCode = postalCode;
  if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth;
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
});

// Категории
server.get('/api/categories', (req, res) => {
  const db = router.db;
  const categories = db.get('categories').value();
  res.json(categories);
});

// Акции
server.get('/api/promotions', (req, res) => {
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
});

const PORT = 3000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
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