const express = require('express');
const chatController = require('../controllers/chatController');

const router = express.Router();

router.post('/message', chatController.handleMessage);
router.post('/reset', chatController.resetConversation);
router.get('/menu', chatController.getMenu);

module.exports = router;

