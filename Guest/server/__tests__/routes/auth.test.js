import request from 'supertest';
import express from 'express';
import authRoutes from '../../routes/auth.js';
import { db, dbAuth } from '../../db/databaseClient.js';
import { cleanupTestData, generateTestEmail } from '../utils/testDb.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  // Cleanup is handled globally in setup.js, but we can add test-specific cleanup if needed
  afterEach(async () => {
    // Global cleanup in setup.js will handle this
  });

  describe('POST /api/auth/register', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: generateTestEmail(),
        password: 'testpass123',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.token).toBeDefined();
    });

    it('should return error for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('All fields are required');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login existing user', async () => {
      // Generate unique email for this test
      const testEmail = generateTestEmail();
      
      // First create a user via registration to ensure both auth and profile exist
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'testpass123',
          firstName: 'Test',
          lastName: 'User'
        })
        .expect(200);

      expect(registerResponse.body.success).toBe(true);
      const userId = registerResponse.body.user.id;

      // Now test login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'testpass123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(testEmail);
    });

    it('should return error for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrongpass'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});


