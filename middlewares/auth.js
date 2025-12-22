const jsonServer = require('json-server');

module.exports = (req, res, next) => {
  console.log(`Auth middleware - Path: ${req.path}`);
  
  const publicRoutes = [
    '/api/auth/login', 
    '/api/auth/register', 
    '/api/auth/forgot-password'
  ];
  
  // Пропускаем публичные маршруты
  if (publicRoutes.includes(req.path)) {
    console.log('Public route, skipping auth');
    return next();
  }
  
  const authHeader = req.headers['authorization'];
  console.log('Auth header:', authHeader);
  
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    console.log('No token found');
    return res.status(401).json({ 
      success: false, 
      error: 'Токен отсутствует' 
    });
  }
  
  try {
    // Получаем db из app
    let db;
    if (req.app && req.app.db) {
      db = req.app.db;
      console.log('Using db from req.app');
    } else {
      console.log('Creating new router for db');
      const router = jsonServer.router('db.json');
      db = router.db;
    }
    
    console.log('Looking for token:', token.substring(0, 10) + '...');
    
    // Ищем токен в таблице tokens
    const tokenData = db.get('tokens').find({ token }).value();
    
    if (!tokenData) {
      console.log('Token not found in database');
      return res.status(401).json({ 
        success: false, 
        error: 'Неверный токен' 
      });
    }
    
    console.log('Token found, userId:', tokenData.userId);
    
    // Находим пользователя по userId из токена
    const user = db.get('users').find({ id: tokenData.userId }).value();
    
    if (!user) {
      console.log('User not found for token');
      return res.status(401).json({ 
        success: false, 
        error: 'Пользователь не найден' 
      });
    }
    
    console.log('User found:', user.email);
    
    // Добавляем пользователя в запрос
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Ошибка проверки токена',
      details: error.message 
    });
  }
};