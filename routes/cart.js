const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Получить корзину с полной информацией
router.get('/', (req, res) => {
  const db = req.app.db || require('json-server').router('db.json').db;
  const userId = req.user.id;
  
  const cartItems = db.get('cart').filter({ userId }).value();
  
  // Добавляем полную информацию о товарах
  const cartWithProducts = cartItems.map(item => {
    const product = db.get('products').find({ id: item.productId }).value();
    return {
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      createdAt: item.createdAt,
      product: product ? {
        id: product.id,
        name: product.name,
        price: product.price,
        images: product.images,
        description: product.description
      } : null
    };
  }).filter(item => item.product !== null);
  
  // Вычисляем суммы
  const subtotal = cartWithProducts.reduce((sum, item) => {
    return sum + (item.product.price * item.quantity);
  }, 0);
  
  const delivery = 60.20;
  const total = subtotal + delivery;
  
  res.json({
    success: true,
    items: cartWithProducts,
    summary: {
      subtotal: parseFloat(subtotal.toFixed(2)),
      delivery: parseFloat(delivery.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      itemsCount: cartWithProducts.reduce((sum, item) => sum + item.quantity, 0)
    }
  });
});

// Добавить товар в корзину
router.post('/', (req, res) => {
  const db = req.app.db || require('json-server').router('db.json').db;
  const userId = req.user.id;
  const { productId, quantity = 1 } = req.body;
  
  if (!productId) {
    return res.status(400).json({ 
      success: false, 
      error: 'ID товара обязателен' 
    });
  }
  
  const product = db.get('products').find({ id: productId }).value();
  if (!product) {
    return res.status(404).json({ 
      success: false, 
      error: 'Товар не найден' 
    });
  }
  
  const existingItem = db.get('cart')
    .find({ userId, productId })
    .value();
  
  if (existingItem) {
    db.get('cart')
      .find({ id: existingItem.id })
      .assign({ 
        quantity: existingItem.quantity + quantity,
        updatedAt: new Date().toISOString()
      })
      .write();
  } else {
    const newCartItem = {
      id: Date.now(),
      userId,
      productId,
      quantity,
      createdAt: new Date().toISOString()
    };
    
    db.get('cart').push(newCartItem).write();
  }
  
  res.json({ 
    success: true, 
    message: 'Товар добавлен в корзину' 
  });
});

// Обновить количество товара в корзине
router.put('/:id', (req, res) => {
  const db = req.app.db || require('json-server').router('db.json').db;
  const cartItemId = parseInt(req.params.id);
  const userId = req.user.id;
  const { quantity } = req.body;
  
  if (!quantity || quantity < 1) {
    return res.status(400).json({ 
      success: false, 
      error: 'Количество должно быть больше 0' 
    });
  }
  
  const cartItem = db.get('cart').find({ id: cartItemId, userId }).value();
  
  if (!cartItem) {
    return res.status(404).json({ 
      success: false, 
      error: 'Элемент корзины не найден' 
    });
  }
  
  db.get('cart')
    .find({ id: cartItemId })
    .assign({ 
      quantity: quantity,
      updatedAt: new Date().toISOString()
    })
    .write();
  
  res.json({ 
    success: true, 
    message: 'Корзина обновлена' 
  });
});

// Удалить товар из корзины
router.delete('/:id', (req, res) => {
  const db = req.app.db || require('json-server').router('db.json').db;
  const cartItemId = parseInt(req.params.id);
  const userId = req.user.id;
  
  const removed = db.get('cart').remove({ id: cartItemId, userId }).write();
  
  if (removed.length === 0) {
    return res.status(404).json({ 
      success: false, 
      error: 'Элемент корзины не найден' 
    });
  }
  
  res.json({ 
    success: true, 
    message: 'Товар удален из корзины' 
  });
});

// Очистить корзину
router.delete('/', (req, res) => {
  const db = req.app.db || require('json-server').router('db.json').db;
  const userId = req.user.id;
  
  db.get('cart').remove({ userId }).write();
  
  res.json({ 
    success: true, 
    message: 'Корзина очищена' 
  });
});

module.exports = router;