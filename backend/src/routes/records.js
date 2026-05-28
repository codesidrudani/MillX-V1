const express = require('express');
const router = express.Router();
const { 
  getIncoming, 
  getOutgoing, 
  deleteIncoming, 
  deleteOutgoing, 
  getAuditLogs 
} = require('../controllers/recordsController');
const { requireRole } = require('../middleware/authMiddleware');

// Only admins can access records management
router.use(requireRole(['admin']));

router.get('/incoming', getIncoming);
router.get('/outgoing', getOutgoing);
router.delete('/incoming/:id', deleteIncoming);
router.delete('/outgoing/:id', deleteOutgoing);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
