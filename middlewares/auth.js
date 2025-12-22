const jsonServer = require('json-server');

module.exports = (req, res, next) => {
  console.log(`🔐 Auth middleware: ${req.method} ${req.path}`);
  
  // Публичные маршруты (без аутентификации)
  const publicRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/categories',
    '/api/promotions'
  ];
  
  // Пропускаем публичные маршруты
  if (publicRoutes.includes(req.path)) {
    console.log('✅ Public route, skipping auth');
    return next();
  }
  
  // Пропускаем OPTIONS запросы (CORS)
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request, skipping auth');
    return next();
  }
  
  // Проверяем заголовок авторизации
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    console.log('❌ No authorization header');
    return res.status(401).json({
      success: false,
      error: 'Требуется авторизация'
    });
  }
  
  // Извлекаем токен из заголовка
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : authHeader;
  
  console.log('Token received:', token.substring(0, 10) + '...');
  
  if (!token) {
    console.log('❌ Token is empty');
    return res.status(401).json({
      success: false,
      error: 'Токен отсутствует'
    });
  }
  
  try {
    // Получаем базу данных из запроса
    const db = req.db;
    
    if (!db) {
      console.log('❌ Database not available in request');
      return res.status(500).json({
        success: false,
        error: 'Ошибка доступа к базе данных'
      });
    }
    
    // Ищем токен в базе данных
    const tokenData = db.get('tokens').find({ token }).value();
    
    if (!tokenData) {
      console.log('❌ Token not found in database');
      return res.status(401).json({
        success: false,
        error: 'Неверный или истекший токен'
      });
    }
    
    console.log('✅ Token found, userId:', tokenData.userId);
    
    // Ищем пользователя по ID из токена
    const user = db.get('users').find({ id: tokenData.userId }).value();
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    console.log('✅ User authenticated:', user.email);
    
    // Добавляем пользователя в объект запроса
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      phone: user.phone
    };
    
    next();
  } catch (error) {
    console.error('🔥 Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка аутентификации',
      details: error.message
    });
  }
};