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
    // Local Development
    'http://localhost:5173', // Vite (Frontend chính của bạn)
    'http://localhost:3000', // React thường (nếu có)
    'http://localhost:8081', // Mobile hoặc App khác (nếu có)
    
    // Production - Frontend (Vercel)
    
    'https://wdp301-central-kitchen.vercel.app', 
    
    // Production - Backend (Render)
    'https://wdp301-central-kitchen-system.onrender.com',
    
    // PayOS Webhook
    'https://pay.payos.vn'   // PayOS production domain for webhooks
  ],
  credentials: true, // Cho phép gửi cookie/token
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept',
    'x-api-key',      // PayOS API authentication header
    'x-client-id'     // PayOS client identification header
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
app.use('/api/ingredient-batches', require('./routes/ingredientBatchRoutes'));
app.use('/api/vehicle-types', require('./routes/vehicleTypeRoutes'));
app.use('/api/system-settings', require('./routes/systemSettingRoutes'));
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
    console.log(`📚 Swagger API documentation: ${baseUrl}/api-docs`);
    console.log(`🏥 Health check endpoint: ${baseUrl}/health`);
    console.log(`📄 OpenAPI JSON spec: ${baseUrl}/swagger.json`);
    
    if (process.env.RENDER_EXTERNAL_URL) {
      console.log(`\n🌐 Production Mode (Render)`);
      console.log(`   Backend URL: ${process.env.RENDER_EXTERNAL_URL}`);
      console.log(`   Frontend URL:  wdp301-central-kitchen.vercel.app`);
    } else {
      console.log(`\n💻 Local Development Mode`);
      console.log(`   Backend: http://localhost:${PORT}`);
      console.log(`   Frontend: http://localhost:5173`);
    }
  });
}

module.exports = app;
