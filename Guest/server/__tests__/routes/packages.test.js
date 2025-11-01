import request from 'supertest';
import express from 'express';
import packagesRoutes from '../../routes/packages.js';
import { db } from '../../db/databaseClient.js';
import { createTestPackages } from '../utils/testDb.js';

const app = express();
app.use(express.json());
app.use('/api/packages', packagesRoutes);

describe('Packages Routes', () => {
  let testPackages = [];
    
  beforeEach(async () => {
    // Create test packages for each test
    testPackages = await createTestPackages([
      {
        title: 'Standard Room',
        category: 'rooms',
        price: '₱5,500/night',
        capacity: 4,
        description: 'Comfortable room',
        image_url: 'images/room1.jpg'
      },
      {
        title: 'Beachfront Cottage',
        category: 'cottages',
        price: '₱9,500/night',
        capacity: 6,
        description: 'Beach access cottage',
        image_url: 'images/cottage1.jpg'
      }
    ]);
  });

  describe('GET /api/packages', () => {
    it('should return all packages', async () => {
      const response = await request(app)
        .get('/api/packages')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      // Should include at least the test packages we created
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      
      // Verify our test packages are in the results
      const titles = response.body.data.map(p => p.title);
      expect(titles).toContain('Standard Room');
      expect(titles).toContain('Beachfront Cottage');
    });

    it('should filter packages by category', async () => {
      const response = await request(app)
        .get('/api/packages?category=cottages')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      
      // All results should be cottages
      response.body.data.forEach(pkg => {
        expect(pkg.category).toBe('cottages');
      });
      
      // Verify our test cottage is in the results
      const titles = response.body.data.map(p => p.title);
      expect(titles).toContain('Beachfront Cottage');
    });
  });

  describe('GET /api/packages/:id', () => {
    it('should return a single package', async () => {
      const packageId = testPackages[0].id;
      const response = await request(app)
        .get(`/api/packages/${packageId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(packageId);
      expect(response.body.data.title).toBe('Standard Room');
    });

    it('should return 404 for non-existent package', async () => {
      const response = await request(app)
        .get('/api/packages/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});



