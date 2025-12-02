const express = require('express');
const router = express.Router();

// Получить все заказы пользователя
router.get('/', (req, res) => {
  const db = req.app.db || require('json-server').router('db.json').db;
  const userId = req.user.id;
  
  const orders = db.get('orders')
    .filter({ userId })
    .orderBy('createdAt', 'desc')
    .value();
  
  const ordersCount = orders.length;
  
  res.json({
    success: true,
    orders: orders,
    summary: {
      totalOrders: ordersCount,
      delivered: orders.filter(order => order.status === 'delivered').length,
      processing: orders.filter(order => order.status === 'processing').length
    }
  });
});

// Получить заказ по ID
router.get('/:id', (req, res) => {
  const db = req.app.db || require('json-server').router('db.json').db;
  const orderId = parseInt(req.params.id);
  const userId = req.user.id;
  
  const order = db.get('orders').find({ id: orderId, userId }).value();
  
  if (!order) {
    return res.status(404).json({ 
      success: false, 
      error: 'Заказ не найден' 
    });
  }
  
  res.json({
    success: true,
    order: order
  });
});

// Создать заказ из корзины
router.post('/', (req, res) => {
  const db = req.app.db || require('json-server').router('db.json').db;
  const userId = req.user.id;
  const { contactInfo, address, paymentMethod } = req.body;
  
  if (!contactInfo || !contactInfo.firstName || !contactInfo.phone) {
    return res.status(400).json({ 
      success: false, 
      error: 'Контактная информация обязательна' 
    });
  }
  
  if (!address || !address.country || !address.city || !address.street) {
    return res.status(400).json({ 
      success: false, 
      error: 'Адрес обязателен' 
    });
  }
  
  if (!paymentMethod) {
    return res.status(400).json({ 
      success: false, 
      error: 'Способ оплаты обязателен' 
    });
  }
  
  const cartItems = db.get('cart').filter({ userId }).value();
  
  if (cartItems.length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Корзина пуста' 
    });
  }
  
  const orderItems = cartItems.map(item => {
    const product = db.get('products').find({ id: item.productId }).value();
    return {
      productId: item.productId,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      image: product.images[0]
    };
  });
  
  const subtotal = orderItems.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  const delivery = 60.20;
  const total = subtotal + delivery;
  
  const lastOrder = db.get('orders').orderBy('orderNumber', 'desc').value()[0];
  const orderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1001;
  
  const user = db.get('users').find({ id: userId }).value();
  
  const newOrder = {
    id: Date.now(),
    orderNumber: orderNumber,
    userId: userId,
    items: orderItems,
    subtotal: parseFloat(subtotal.toFixed(2)),
    delivery: parseFloat(delivery.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    status: 'processing',
    contactInfo: {
      firstName: contactInfo.firstName,
      lastName: contactInfo.lastName || '',
      phone: contactInfo.phone,
      email: contactInfo.email || user.email
    },
    address: {
      country: address.country,
      city: address.city,
      street: address.street,
      postalCode: address.postalCode || '',
      apartment: address.apartment || ''
    },
    paymentMethod: paymentMethod,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  db.get('orders').push(newOrder).write();
  
  db.get('cart').remove({ userId }).write();
  
  const notification = {
    id: Date.now() + 1,
    userId: userId,
    title: 'Заказ создан',
    message: `Ваш заказ #${orderNumber} успешно создан и находится в обработке.`,
    type: 'order',
    isRead: false,
    createdAt: new Date().toISOString()
  };
  
  db.get('notifications').push(notification).write();
  
  res.json({
    success: true,
    order: newOrder,
    message: 'Заказ успешно создан'
  });
});

// Обновить статус заказа
router.put('/:id/status', (req, res) => {
  const db = req.app.db || require('json-server').router('db.json').db;
  const orderId = parseInt(req.params.id);
  const { status } = req.body;
  
  const validStatuses = ['processing', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Неверный статус заказа' 
    });
  }
  
  const order = db.get('orders').find({ id: orderId }).value();
  
  if (!order) {
    return res.status(404).json({ 
      success: false, 
      error: 'Заказ не найден' 
    });
  }
  
  db.get('orders')
    .find({ id: orderId })
    .assign({ 
      status: status,
      updatedAt: new Date().toISOString()
    })
    .write();
  
  res.json({ 
    success: true, 
    message: 'Статус заказа обновлен' 
  });
});

module.exports = router;