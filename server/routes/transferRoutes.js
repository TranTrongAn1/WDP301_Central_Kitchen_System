const express = require('express');
const {
  getTransfers,
  getTransferById,
  createTransfer,
  updateTransferStatus,
  deleteTransfer,
} = require('../controllers/transferController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getTransfers);
router.get('/:id', getTransferById);

router.post('/', authorize('Admin', 'Manager'), createTransfer);

router.put('/:id/status', updateTransferStatus);

router.delete('/:id', authorize('Admin', 'Manager'), deleteTransfer);

module.exports = router;
