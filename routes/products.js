const express = require('express');
const router = express.Router();

// Все товары с фильтрацией
router.get('/', (req, res) => {
  const db = req.app.db || require('json-server').router('db.json').db;
  const { category, minPrice, maxPrice, sortBy, search } = req.query;
  const userId = req.user.id;
  
  let products = db.get('products').value();
  
  // Поиск
  if (search) {
    products = products.filter(product => 
      product.name.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  // Фильтрация по категории
  if (category && (category === 'outdoor' || category === 'tennis')) {
    products = products.filter(product => product.category === category);
  }
  
  // Фильтрация по цене
  if (minPrice) {
    products = products.filter(product => product.price >= parseFloat(minPrice));
  }
  
  if (maxPrice) {
    products = products.filter(product => product.price <= parseFloat(maxPrice));
  }
  
  // Сортировка
  if (sortBy) {
    switch (sortBy) {
      case 'price_asc':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        products.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }
  }
  
  // Добавляем информацию об избранном
  const favorites = db.get('favorites').filter({ userId }).value();
  
  const productsWithUserData = products.map(product => ({
    ...product,
    isFavorite: favorites.some(fav => fav.productId === product.id)
  }));
  
  res.json(productsWithUserData);
});

// Товар по ID
router.get('/:id', (req, res) => {
  const db = req.app.db || require('json-server').router('db.json').db;
  const productId = parseInt(req.params.id);
  const userId = req.user.id;
  
  const product = db.get('products').find({ id: productId }).value();
  
  if (!product) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  
  const isFavorite = db.get('favorites').find({ userId, productId }).value();
  
  res.json({
    ...product,
    isFavorite: !!isFavorite
  });
});

// Товары по категории
router.get('/category/:category', (req, res) => {
  const db = req.app.db || require('json-server').router('db.json').db;
  const category = req.params.category;
  const userId = req.user.id;
  
  // Проверяем что категория допустимая
  if (category !== 'outdoor' && category !== 'tennis') {
    return res.status(400).json({ error: 'Неверная категория' });
  }
  
  let products = db.get('products').filter({ category }).value();
  
  const favorites = db.get('favorites').filter({ userId }).value();
  
  const productsWithUserData = products.map(product => ({
    ...product,
    isFavorite: favorites.some(fav => fav.productId === product.id)
  }));
  
  res.json(productsWithUserData);
});

module.exports = router;