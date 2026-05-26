const express = require('express');
const router = express.Router();
const { startGame, sendAction, getSession, listSessions } = require('../controllers/gameController');

router.post('/start', startGame);
router.post('/action', sendAction);
// router.get('/session/:id', getSession);
// router.get('/sessions', listSessions);

module.exports = router;
