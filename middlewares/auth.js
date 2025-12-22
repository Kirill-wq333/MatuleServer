module.exports = (req, res, next) => {
  console.log(`🔐 Auth middleware - ${req.method} ${req.path}`);
  
  const publicRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password'
  ];
  
  // Пропускаем публичные маршруты (только аутентификация)
  if (publicRoutes.includes(req.path)) {
    console.log('✅ Public auth route, skipping auth');
    return next();
  }
  
  // Пропускаем OPTIONS запросы (CORS)
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request, skipping auth');
    return next();
  }
  
  // Проверяем токен для ВСЕХ остальных маршрутов
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    console.log('❌ No authorization header');
    return res.status(401).json({
      success: false,
      error: 'Токен отсутствует'
    });
  }
  
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : authHeader;
  
  if (!token) {
    console.log('❌ Token is empty');
    return res.status(401).json({
      success: false,
      error: 'Токен отсутствует'
    });
  }
  
  console.log(`🔍 Validating token: ${token.substring(0, 10)}...`);
  
  try {
    // Получаем базу данных
    const db = req.getDatabase();
    
    if (!db || !db.tokens || !db.users) {
      console.log('❌ Database structure is invalid');
      return res.status(500).json({
        success: false,
        error: 'Ошибка доступа к базе данных'
      });
    }
    
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
    
    console.log(`✅ User authenticated: ${user.email} (${user.firstName})`);
    
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