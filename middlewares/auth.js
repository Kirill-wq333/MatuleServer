module.exports = (req, res, next) => {
  console.log(`Auth middleware - Path: ${req.path}, Method: ${req.method}`);
  
  const publicRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password'
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
  
  const authHeader = req.headers['authorization'];
  console.log('Auth header:', authHeader ? 'Present' : 'Missing');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ No or invalid auth header');
    return res.status(401).json({
      success: false,
      error: 'Токен отсутствует или имеет неверный формат'
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    console.log('❌ Token is empty');
    return res.status(401).json({
      success: false,
      error: 'Токен отсутствует'
    });
  }
  
  try {
    // Получаем базу данных
    const db = req.getDatabase();
    
    if (!db || !db.tokens) {
      console.log('❌ Database or tokens not available');
      return res.status(500).json({
        success: false,
        error: 'Ошибка доступа к базе данных'
      });
    }
    
    console.log(`🔍 Looking for token in ${db.tokens.length} tokens`);
    
    // Ищем токен
    const tokenData = db.tokens.find(t => t.token === token);
    
    if (!tokenData) {
      console.log('❌ Token not found in database');
      return res.status(401).json({
        success: false,
        error: 'Неверный или истекший токен'
      });
    }
    
    console.log(`✅ Token found for userId: ${tokenData.userId}`);
    
    // Ищем пользователя
    const user = db.users.find(u => u.id === tokenData.userId);
    
    if (!user) {
      console.log('❌ User not found for token');
      return res.status(401).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    console.log(`✅ User found: ${user.email}`);
    
    // Добавляем пользователя в запрос
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
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