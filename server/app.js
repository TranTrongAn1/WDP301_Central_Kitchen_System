require('dotenv').config();
const express = require('express');
const cors = require('cors');
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

// CORS middleware
app.use(cors({
  // Liệt kê tất cả các domain frontend được phép gọi API
  origin: [
    'http://localhost:5173', // Vite (Frontend chính của bạn)
    'http://localhost:3000', // React thường (nếu có)
    'http://localhost:8081'  // Mobile hoặc App khác (nếu có)
  ],
  credentials: true, // Cho phép gửi cookie/token
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

// Load Swagger documentation
const swaggerDocument = YAML.load('./swagger.yaml');

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Serve raw Swagger/OpenAPI JSON spec (for downloading)
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="swagger.json"');
  res.json(swaggerDocument);
});

// Legacy endpoint for compatibility
app.get('/api-docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="swagger.json"');
  res.json(swaggerDocument);
});

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
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/stores', require('./routes/storeRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/ingredients', require('./routes/ingredientRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/production', require('./routes/productionRoutes'));
app.use('/api/batches', require('./routes/batchRoutes'));
app.use('/api/transfers', require('./routes/transferRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/docs', require('./routes/docsRoutes'));
app.use('/api/roles', require('./routes/roleRoutes'));
app.use('/api/system-settings', require('./routes/systemSettingRoutes'));
app.use('/api/logistics', require('./routes/logisticsRoutes'));
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
