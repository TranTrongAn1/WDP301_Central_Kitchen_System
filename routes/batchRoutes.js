const express = require('express');
const {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
} = require('../controllers/batchController');

const router = express.Router();

// Route: /api/batches
router.route('/')
  .get(getBatches)      // GET all batches
  .post(createBatch);   // POST create new batch

// Route: /api/batches/:id
router.route('/:id')
  .get(getBatchById)    // GET single batch by ID
  .put(updateBatch)     // PUT update batch
  .delete(deleteBatch); // DELETE batch

module.exports = router;
