const express = require('express');
const YAML = require('yamljs');
const path = require('path');

const router = express.Router();

// Load swagger.yaml and convert to JSON
const swaggerData = YAML.load(path.join(__dirname, '../swagger.yaml'));

/**
 * @route   GET /api/docs/json
 * @desc    Get raw Swagger documentation in JSON format
 * @access  Public
 * @note    This endpoint serves the OpenAPI specification for easy import into tools like Postman
 */
router.get('/json', (req, res) => {
  try {
    res.json(swaggerData);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to load Swagger documentation',
      error: error.message,
    });
  }
});

module.exports = router;
