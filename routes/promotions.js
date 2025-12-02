const express = require('express');
const router = express.Router();

// Получить все активные акции
router.get('/', (req, res) => {
  const db = req.app.db || require('json-server').router('db.json').db;
  
  const promotions = db.get('promotions')
    .filter({ isActive: true })
    .value();
  
  res.json(promotions);
});

// Получить акцию по ID
router.get('/:id', (req, res) => {
  const db = req.app.db || require('json-server').router('db.json').db;
  const promotionId = parseInt(req.params.id);
  
  const promotion = db.get('promotions')
    .find({ id: promotionId, isActive: true })
    .value();
  
  if (!promotion) {
    return res.status(404).json({ error: 'Акция не найдена' });
  }
  
  res.json(promotion);
});

module.exports = router;