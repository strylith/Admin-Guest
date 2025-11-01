import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import packagesRoutes from './routes/packages.js';
import bookingsRoutes from './routes/bookings.js';
import usersRoutes from './routes/users.js';
import settingsRoutes from './routes/settings.js';
import adminBookingsRoutes from './routes/adminBookings.js';
import adminUsersRoutes from './routes/adminUsers.js';
import adminDashboardRoutes from './routes/adminDashboard.js';
import adminAuditRoutes from './routes/adminAudit.js';
import paymentsRoutes from './routes/payments.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
const isProd = process.env.NODE_ENV === 'production';

if (!isProd) {
  const devOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  app.use(cors({
    origin: devOrigins.length ? devOrigins : [
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://strylith.github.io',
      'https://strylith.github.io/Kina-Resort-main'
    ],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
  }));

  // Explicitly handle OPTIONS requests for CORS preflight (dev only)
  app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
  });
}

app.use(express.json());

// Serve static files from the root directory (for frontend)
app.use(express.static(path.join(__dirname, '..')));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Kina Resort Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
      packages: '/api/packages',
      bookings: '/api/bookings',
      users: '/api/users',
      settings: '/api/settings'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Kina Resort Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/packages', packagesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);

// Admin API Routes
app.use('/api/admin/bookings', adminBookingsRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/audit-logs', adminAuditRoutes);

// Payment Routes
app.use('/pay', paymentsRoutes);
app.use('/api/payments', paymentsRoutes);

// API root health/index endpoint
app.get('/api', (req, res) => {
  res.json({
    ok: true,
    message: 'Kina API root',
    routes: {
      auth: '/api/auth',
      bookings: '/api/bookings',
      packages: '/api/packages',
      users: '/api/users',
      settings: '/api/settings',
      admin: {
        bookings: '/api/admin/bookings',
        users: '/api/admin/users',
        dashboard: '/api/admin/dashboard',
        auditLogs: '/api/admin/audit-logs'
      },
      payments: '/api/payments',
      mock: '/mock'
    }
  });
});

// Mock routes, 404 handler, and error handler will be loaded in startServer()
// This ensures proper middleware order: API routes → Mock routes → 404 handler → Error handler

// Initialize database and start server
async function startServer() {
  try {
    // Database client is initialized via db/databaseClient.js
    // It will use mock DB if USE_MOCK_DB=true or NODE_ENV=test
    
    // Seed default packages if using mock database
    if (process.env.USE_MOCK_DB === 'true' || process.env.NODE_ENV === 'test') {
      const { mockClient } = await import('./db/databaseClient.js');
      
      console.log('🧩 Seeding default packages for mock database...');
      mockClient.seed('packages', [
        // Rooms (matching frontend luxuryCard.js)
        {
          id: 1,
          title: 'Standard Room',
          category: 'rooms',
          price: '₱1,500/night',
          capacity: 4,
          description: 'Comfortable rooms with air conditioning, family-sized bed and private bathroom. All 4 rooms are identically designed with modern amenities and stunning garden views.',
          image_url: 'images/kina1.jpg',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          title: 'Ocean View Room',
          category: 'rooms',
          price: '₱1,500/night',
          capacity: 4,
          description: 'Room with balcony overlooking the ocean, perfect for sunset views.',
          image_url: 'images/kina2.jpg',
          created_at: new Date().toISOString()
        },
        {
          id: 3,
          title: 'Deluxe Suite',
          category: 'rooms',
          price: '₱1,500/night',
          capacity: 4,
          description: 'Spacious suite with separate living area, mini-fridge, and premium amenities.',
          image_url: 'images/kina3.jpg',
          created_at: new Date().toISOString()
        },
        {
          id: 4,
          title: 'Premium King',
          category: 'rooms',
          price: '₱1,500/night',
          capacity: 4,
          description: 'Executive comfort with elegant design and premium furnishings.',
          image_url: 'images/resort1.JPG',
          created_at: new Date().toISOString()
        },
        // Cottages (matching frontend)
        {
          id: 5,
          title: 'Standard Cottage',
          category: 'cottages',
          price: '₱400',
          capacity: 8,
          description: 'Private cottage with basic amenities.',
          image_url: 'images/cottage_1.JPG',
          created_at: new Date().toISOString()
        },
        {
          id: 6,
          title: 'Open Cottage',
          category: 'cottages',
          price: '₱300',
          capacity: 8,
          description: 'Cozy cottage surrounded by tropical gardens, perfect for peaceful relaxation.',
          image_url: 'images/cottage_2.JPG',
          created_at: new Date().toISOString()
        },
        {
          id: 7,
          title: 'Family Cottage',
          category: 'cottages',
          price: '₱500',
          capacity: 8,
          description: 'A spacious, open-air cottage with tables and chairs, ideal for daytime relaxation, dining, and gatherings.',
          image_url: 'images/kina1.jpg',
          created_at: new Date().toISOString()
        },
        // Function Halls (matching frontend)
        {
          id: 8,
          title: 'Grand Function Hall',
          category: 'function-halls',
          price: '₱10,000+',
          capacity: 100,
          description: 'Spacious hall perfect for weddings, conferences, and large events. Includes tables, chairs, sound system, and air conditioning.',
          image_url: 'images/Function Hall.JPG',
          created_at: new Date().toISOString()
        },
        {
          id: 9,
          title: 'Intimate Function Hall',
          category: 'function-halls',
          price: '₱10,000+',
          capacity: 100,
          description: 'Cozy hall ideal for birthday parties, meetings, and gatherings. Perfect for smaller celebrations with modern amenities.',
          image_url: 'images/Function Hall.JPG',
          created_at: new Date().toISOString()
        }
      ]);
      console.log('✅ Default packages seeded');
    }
    
    // Load mock routes BEFORE starting server (critical for route availability)
    if (process.env.USE_MOCK_DB === 'true' || process.env.NODE_ENV === 'test') {
      try {
        const { default: mockBookingsRoutes } = await import('./routes/mockBookings.js');
        app.use('/mock', mockBookingsRoutes);
        console.log('🧪 Mock API routes registered at /mock');
        console.log('   - GET  /mock/bookings');
        console.log('   - POST /mock/bookings');
        console.log('   - PATCH /mock/bookings/:id');
        console.log('   - DELETE /mock/bookings/:id');
        console.log('   - GET  /mock/bookings/availability/:packageId');
      } catch (error) {
        console.error('❌ Failed to load mock routes:', error);
        throw error;
      }
    }
    
    // 404 handler (must be after all route registrations)
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Route not found'
      });
    });

    // Error handler
    app.use((err, req, res, next) => {
      console.error('Server error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });
    
    // Start server AFTER all routes and handlers are registered
    app.listen(PORT, () => {
      console.log(`🚀 Kina Resort Backend API running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API endpoint: http://localhost:${PORT}/api`);
      if (process.env.USE_MOCK_DB === 'true') {
        console.log(`🧪 Mock API endpoint: http://localhost:${PORT}/mock`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
