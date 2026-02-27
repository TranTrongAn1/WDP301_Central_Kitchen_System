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

// CORS middleware - Cấu hình cho cả Development, Production và PayOS Webhook
app.use(cors({
  origin: [
    'http://localhost:5173',  // Vite dev server (React/Vue)
    'http://localhost:3000',  // React dev server
    'http://localhost:8081',  // React Native / Expo dev
    'https://pay.payos.vn',   // PayOS payment gateway
    'https://wdp301-central-kitchen-system.onrender.com' // Production Render URL
  ],
  credentials: true,  // Cho phép gửi cookies và authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',      // Required cho JSON requests
    'Authorization',     // Required cho JWT authentication
    'X-Requested-With',  // Standard AJAX header
    'Accept',            // Content negotiation
    'x-api-key',         // PayOS webhook authentication
    'x-client-id'        // PayOS client identification
  ],
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
app.use('/api/production-plans', require('./routes/productionRoutes'));
app.use('/api/batches', require('./routes/batchRoutes'));
app.use('/api/transfers', require('./routes/transferRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/docs', require('./routes/docsRoutes'));
app.use('/api/roles', require('./routes/roleRoutes'));
app.use('/api/logistics', require('./routes/logisticsRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));

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
    // Tự động nhận diện URL dựa trên môi trường
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📚 Swagger API documentation available at ${baseUrl}/api-docs`);
    console.log(`🏥 Health check endpoint: ${baseUrl}/health`);
    
    if (process.env.RENDER_EXTERNAL_URL) {
      console.log(`🌐 Production URL: ${process.env.RENDER_EXTERNAL_URL}`);
    } else {
      console.log(`💻 Local development mode`);
    }
  });
}

module.exports = app;
