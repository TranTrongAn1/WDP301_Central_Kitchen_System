# Kendo Mooncake Central Kitchen System

A comprehensive backend system for managing mooncake production, inventory, and distribution operations.

## 🚀 Features

- **MongoDB Integration**: Robust database connection with Mongoose ODM
- **RESTful API**: Clean and scalable API architecture
- **Swagger Documentation**: Interactive API documentation at `/api-docs`
- **Error Handling**: Centralized error handling middleware
- **Batch Management**: Track production batches with manufacturing and expiration dates
- **Environment Configuration**: Secure configuration using environment variables

## 📁 Project Structure

```
WDP301_Central_Kitchen_System/
├── config/             # Configuration files
│   └── db.js          # MongoDB connection setup
├── controllers/        # Request handlers (business logic)
├── middleware/         # Custom middleware
│   └── errorHandler.js # Centralized error handling
├── models/            # Mongoose schemas and models
│   └── BatchModel.js  # Batch schema definition
├── routes/            # API route definitions
├── node_modules/      # Dependencies
├── app.js             # Main application entry point
├── swagger.yaml       # API documentation
├── package.json       # Project metadata and dependencies
└── .env.example       # Environment variables template
```

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd WDP301_Central_Kitchen_System
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   MONGO_URI=mongodb://localhost:27017/kendo_mooncake_db
   PORT=5000
   NODE_ENV=development
   ```

4. **Start the server**
   ```bash
   npm start
   ```

## 📦 Dependencies

- **express**: Web application framework
- **mongoose**: MongoDB object modeling
- **dotenv**: Environment variable management
- **swagger-ui-express**: Swagger UI hosting
- **yamljs**: YAML file parsing

## 🔧 Usage

### Starting the Server

```bash
node app.js
```

The server will start on `http://localhost:5000` (or the port specified in your `.env` file).

### API Documentation

Once the server is running, access the interactive Swagger documentation at:
```
http://localhost:5000/api-docs
```

### Health Check

Test if the server is running:
```bash
GET http://localhost:5000/health
```

Response:
```json
{
  "success": true,
  "message": "Kendo Mooncake Central Kitchen System is running",
  "timestamp": "2026-01-14T12:00:00.000Z"
}
```

## 📊 Data Models

### Batch Model

Represents a production batch with the following fields:

- **batchCode** (String, required, unique): Unique identifier for the batch
- **productId** (ObjectId, required): Reference to the product
- **mfgDate** (Date, required): Manufacturing date
- **expDate** (Date, required): Expiration date (must be after mfgDate)
- **currentQuantity** (Number, required): Current stock quantity (minimum: 0)
- **timestamps**: Automatically managed createdAt and updatedAt fields

## 🔐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/kendo_mooncake_db` |
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |

## 🚦 API Endpoints

### Health Check
- **GET** `/health` - Check server status

### Coming Soon
- Batch CRUD operations
- Product management
- Inventory tracking
- Order management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is part of WDP301 coursework.

## 👥 Team

FPT University - WDP301 Central Kitchen System Team

---

**Note**: Make sure MongoDB is running before starting the application.