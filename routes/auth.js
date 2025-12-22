const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Регистрация
router.post('/register', async (req, res) => {
  try {
    const db = req.db;
    const { email, password, firstName } = req.body;
    
    // Проверяем обязательные поля
    if (!email || !password || !firstName) {
      return res.status(400).json({
        success: false,
        error: 'Заполните все обязательные поля'
      });
    }
    
    // Проверяем, существует ли пользователь
    const existingUser = db.get('users').find({ email }).value();
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Пользователь с таким email уже существует'
      });
    }
    
    // Хэшируем пароль
    // const hashedPassword = await bcrypt.hash(password, 10);
    
    // Создаем пользователя
    const newUser = {
      id: Date.now(),
      email,
      password: password,
      firstName,
      lastName: '',
      avatar: null,
      phone: null,
      country: null,
      city: null,
      address: null,
      postalCode: null,
      gender: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Сохраняем пользователя
    db.get('users').push(newUser).write();
    
    // Создаем токен
    const token = uuidv4();
    const tokenData = {
      id: uuidv4(),
      userId: newUser.id,
      token,
      createdAt: new Date().toISOString()
    };
    
    db.get('tokens').push(tokenData).write();
    
    // Удаляем пароль из ответа
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      success: true,
      message: 'Регистрация успешна',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка регистрации'
    });
  }
});

// Вход
router.post('/login', async (req, res) => {
  try {
    const db = req.db;
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Введите email и пароль'
      });
    }
    
    // Ищем пользователя
    const user = db.get('users').find({ email }).value();
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Неверный email или пароль'
      });
    }
    
    // Проверяем пароль
    // const isPasswordValid = await bcrypt.compare(password, user.password);
    // if (!isPasswordValid) {
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        error: 'Неверный email или пароль'
      });
    }
    
    // Создаем новый токен
    const token = uuidv4();
    const tokenData = {
      id: uuidv4(),
      userId: user.id,
      token,
      createdAt: new Date().toISOString()
    };
    
    db.get('tokens').push(tokenData).write();
    
    // Удаляем пароль из ответа
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      message: 'Вход выполнен успешно',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка входа'
    });
  }
});

// Выход
router.post('/logout', (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;
    
    if (token) {
      const db = req.db;
      db.get('tokens').remove({ token }).write();
    }
    
    res.json({
      success: true,
      message: 'Выход выполнен успешно'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка выхода'
    });
  }
});

// Восстановление пароля
router.post('/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Введите email'
      });
    }
    
    // В реальном приложении здесь была бы отправка email
    res.json({
      success: true,
      message: 'Инструкции по восстановлению пароля отправлены на email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка восстановления пароля'
    });
  }
});

module.exports = router;