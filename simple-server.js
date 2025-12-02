const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

server.use(jsonServer.bodyParser);
server.use(middlewares);

// CORS
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

// Логин
server.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const db = router.db;
  
  const user = db.get('users').find({ email, password }).value();
  
  if (user) {
    const { password, ...userWithoutPassword } = user;
    res.json({
      success: true,
      user: userWithoutPassword,
      token: user.token
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Неверный email или пароль'
    });
  }
});

// Регистрация
server.post('/api/register', (req, res) => {
  const { email, password, name } = req.body;
  const db = router.db;
  
  const existingUser = db.get('users').find({ email }).value();
  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: 'Пользователь уже существует'
    });
  }
  
  const newUser = {
    id: Date.now(),
    email,
    password,
    name,
    favoriteMovies: [],
    token: `token_${Date.now()}`
  };
  
  db.get('users').push(newUser).write();
  
  const { password: _, ...userWithoutPassword } = newUser;
  res.json({
    success: true,
    user: userWithoutPassword,
    token: newUser.token
  });
});

// Защищенные маршруты
server.use('/api/profile', (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ error: 'Токен отсутствует' });
  }
  next();
});

server.get('/api/profile', (req, res) => {
  const token = req.headers['authorization'];
  const db = router.db;
  
  const user = db.get('users').find({ token }).value();
  if (user) {
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } else {
    res.status(401).json({ error: 'Пользователь не найден' });
  }
});

server.use(router);

server.listen(3000, '0.0.0.0', () => {
  console.log('JSON Server с аутентификацией запущен!');
});