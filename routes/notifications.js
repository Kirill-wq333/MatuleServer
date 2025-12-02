const express = require('express');

const router = express.Router();

// Получить уведомления
router.get('/', (req, res) => {
  const db = req.app.db || require('json-server').router('db.json').db;
  const userId = req.user.id;
  
  const notifications = db.get('notifications')
    .filter({ userId })
    .orderBy('createdAt', 'desc')
    .value();
  
  res.json(notifications);
});

// Отметить как прочитанное
router.put('/:id/read', (req, res) => {
  const db = req.app.db || require('json-server').router('db.json').db;
  const notificationId = parseInt(req.params.id);
  const userId = req.user.id;
  
  const notification = db.get('notifications')
    .find({ id: notificationId, userId })
    .value();
  
  if (!notification) {
    return res.status(404).json({ error: 'Уведомление не найдено' });
  }
  
  db.get('notifications')
    .find({ id: notificationId })
    .assign({ isRead: true })
    .write();
  
  res.json({ success: true, message: 'Уведомление отмечено как прочитанное' });
});

module.exports = router;