require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Connect to MongoDB (skip in test mode - test setup handles this)
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load Swagger documentation
const swaggerDocument = YAML.load('./swagger.yaml');

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Kendo Mooncake Central Kitchen System is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/ingredients', require('./routes/ingredientRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/production', require('./routes/productionRoutes'));
app.use('/api/batches', require('./routes/batchRoutes'));
app.use('/api/transfers', require('./routes/transferRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Swagger API documentation available at http://localhost:${PORT}/api-docs`);
  });
}

module.exports = app;
