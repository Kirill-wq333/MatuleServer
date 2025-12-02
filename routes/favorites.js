const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Получить избранное
router.get('/', (req, res) => {
  const db = req.app.db || require('json-server').router('db.json').db;
  const userId = req.user.id;
  
  const favorites = db.get('favorites').filter({ userId }).value();
  
  const favoritesWithProducts = favorites.map(fav => {
    const product = db.get('products').find({ id: fav.productId }).value();
    return {
      ...fav,
      product: product ? {
        id: product.id,
        name: product.name,
        price: product.price,
        images: product.images
      } : null
    };
  }).filter(fav => fav.product !== null);
  
  res.json(favoritesWithProducts);
});

// Добавить в избранное
router.post('/:productId', (req, res) => {
  const db = req.app.db || require('json-server').router('db.json').db;
  const productId = parseInt(req.params.productId);
  const userId = req.user.id;
  
  const product = db.get('products').find({ id: productId }).value();
  if (!product) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  
  const existingFavorite = db.get('favorites').find({ userId, productId }).value();
  if (existingFavorite) {
    return res.status(400).json({ error: 'Товар уже в избранном' });
  }
  
  const newFavorite = {
    id: Date.now(),
    userId,
    productId,
    createdAt: new Date().toISOString()
  };
  
  db.get('favorites').push(newFavorite).write();
  
  res.json({ success: true, message: 'Товар добавлен в избранное' });
});

// Удалить из избранного
router.delete('/:productId', (req, res) => {
  const db = req.app.db || require('json-server').router('db.json').db;
  const productId = parseInt(req.params.productId);
  const userId = req.user.id;
  
  const removed = db.get('favorites').remove({ userId, productId }).write();
  
  if (removed.length === 0) {
    return res.status(404).json({ error: 'Товар не найден в избранном' });
  }
  
  res.json({ success: true, message: 'Товар удален из избранного' });
});

module.exports = router;