const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Регистрация
router.post('/register', (req, res) => {
  const { email, password, firstName, lastName, phone } = req.body;
  
  if (!email || !password || !firstName) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email, пароль и имя обязательны' 
    });
  }
  
  const db = req.app.db || require('json-server').router('db.json').db;
  
  try {
    const existingUser = db.get('users').find({ email }).value();
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Пользователь с таким email уже существует'
      });
    }
    
    const newUser = {
      id: Date.now(),
      email,
      password: password, // Простой пароль без хеширования
      firstName,
      lastName: lastName || '',
      phone: phone || '',
      country: '',
      city: '',
      address: '',
      postalCode: '',
      avatar: '',
      dateOfBirth: '',
      createdAt: new Date().toISOString()
    };
    
    // Сохраняем пользователя
    db.get('users').push(newUser).write();
    
    // Создаем постоянный токен для пользователя
    const permanentToken = `user_token_${Date.now()}`;
    
    const newToken = {
      id: Date.now() + 1,
      userId: newUser.id,
      token: permanentToken,
      createdAt: new Date().toISOString()
    };
    
    db.get('tokens').push(newToken).write();
    
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.json({
      success: true,
      user: userWithoutPassword,
      token: permanentToken
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка сервера' 
    });
  }
});

// Логин - простая проверка пароля
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email и пароль обязательны' 
    });
  }
  
  const db = req.app.db || require('json-server').router('db.json').db;
  
  try {
    const user = db.get('users').find({ email }).value();
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    // Простая проверка пароля (без bcrypt)
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        error: 'Неверный пароль'
      });
    }
    
    // Ищем существующий токен пользователя
    const userToken = db.get('tokens').find({ userId: user.id }).value();
    
    if (!userToken) {
      return res.status(500).json({
        success: false,
        error: 'Токен пользователя не найден'
      });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      user: userWithoutPassword,
      token: userToken.token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка сервера' 
    });
  }
});

// Восстановление пароля
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email обязателен' 
    });
  }
  
  const db = req.app.db || require('json-server').router('db.json').db;
  
  const user = db.get('users').find({ email }).value();
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'Пользователь с таким email не найден'
    });
  }
  
  res.json({
    success: true,
    message: 'Инструкции по восстановлению пароля отправлены на ваш email'
  });
});

router.post('/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    const db = req.app.db || require('json-server').router('db.json').db;
    
    // Находим токен и записываем время выхода
    const tokenData = db.get('tokens').find({ token }).value();
    
    if (tokenData) {
      db.get('tokens')
        .find({ token })
        .assign({ 
          lastLogoutAt: new Date().toISOString()
        })
        .write();
    }
  }
  
  res.json({
    success: true,
    message: 'Успешный выход из системы'
  });
});

module.exports = router;