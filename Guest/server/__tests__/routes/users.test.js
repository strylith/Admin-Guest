import request from 'supertest';
import express from 'express';
import usersRoutes from '../../routes/users.js';
import { db, dbAuth } from '../../db/databaseClient.js';
import jwt from 'jsonwebtoken';
import { createTestUser, createTestBooking, createTestPackages } from '../utils/testDb.js';

const app = express();
app.use(express.json());
app.use('/api/users', usersRoutes);

// Mock authenticateToken middleware
const mockAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'Access token required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
    req.user = { user: { id: decoded.userId } };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

const appWithAuth = express();
appWithAuth.use(express.json());
appWithAuth.use('/api/users', mockAuth);
appWithAuth.use('/api/users', usersRoutes);

describe('Users Routes', () => {
  let authToken;
  let userId;
  let testUser;
  let testPackages;

  beforeEach(async () => {
    // Create test user
    testUser = await createTestUser({
      firstName: 'Test',
      lastName: 'User',
      loyaltyPoints: 100,
      totalBookings: 2
    });
    
    userId = testUser.id;
    
    // Generate token
    authToken = jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret');
    
    // Create test packages for bookings
    testPackages = await createTestPackages();
    
    // Create test bookings
    await createTestBooking({
        user_id: userId,
      package_id: testPackages[0].id,
      status: 'confirmed'
    });
    
    await createTestBooking({
        user_id: userId,
      package_id: testPackages[0].id,
      status: 'completed'
    });
  });

  describe('GET /api/users/profile', () => {
    it('should return user profile with stats', async () => {
      const response = await request(appWithAuth)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.profile.email).toBe(testUser.email);
      expect(response.body.data.stats.totalBookings).toBe(2);
    });
  });

  describe('PATCH /api/users/profile', () => {
    it('should update user profile', async () => {
      const response = await request(appWithAuth)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('Updated');
      expect(response.body.data.lastName).toBe('Name');
    });
  });
});


