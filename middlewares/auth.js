module.exports = (req, res, next) => {
  const publicRoutes = [
    '/api/auth/login', 
    '/api/auth/register', 
    '/api/auth/forgot-password'
  ];
  
  // Logout требует токен для идентификации пользователя, но это защищенный маршрут
  const protectedRoutes = [
    '/api/auth/logout'
  ];
  
  // Пропускаем публичные маршруты
  if (publicRoutes.includes(req.path)) {
    return next();
  }
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    // Для защищенных маршрутов токен обязателен
    if (protectedRoutes.includes(req.path)) {
      return res.status(401).json({ error: 'Токен отсутствует' });
    }
    return res.status(401).json({ error: 'Токен отсутствует' });
  }
  
  const db = req.app.db || require('json-server').router('db.json').db;
  
  try {
    // Ищем токен в таблице tokens
    const tokenData = db.get('tokens').find({ token }).value();
    
    if (!tokenData) {
      // Для logout разрешаем продолжить даже если токен не найден
      // (пользователь мог уже выйти, но пытается выйти еще раз)
      if (req.path === '/api/auth/logout') {
        return res.status(200).json({ 
          success: true, 
          message: 'Сессия уже завершена' 
        });
      }
      return res.status(401).json({ error: 'Неверный токен' });
    }
    
    // Находим пользователя по userId из токена
    const user = db.get('users').find({ id: tokenData.userId }).value();
    
    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }
    
    // Добавляем пользователя в запрос
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Ошибка проверки токена' });
  }
};