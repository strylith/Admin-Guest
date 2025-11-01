// Mock Database Client - In-memory implementation for testing

class MockDatabaseClient {
  constructor() {
    // In-memory storage using Maps
    this.tables = {
      users: new Map(),
      packages: new Map(),
      bookings: new Map(),
      booking_items: new Map(),
      reservations_calendar: new Map(),
      admin_settings: new Map()
    };
    
    // Auth users (for auth.admin methods)
    this.authUsers = new Map();
  }

  // Reset all tables
  reset() {
    Object.keys(this.tables).forEach(key => this.tables[key].clear());
    this.authUsers.clear();
    if (process.env.DEBUG_TESTS) {
      console.log('Mock database reset');
    }
  }

  // Seed test data
  seed(tableName, records) {
    if (!this.tables[tableName]) {
      throw new Error(`Table ${tableName} does not exist`);
    }
    
    records.forEach(record => {
      const id = record.id || this.generateId();
      // Store with string key for consistency
      this.tables[tableName].set(String(id), { ...record, id });
    });
    
    if (process.env.DEBUG_TESTS) {
      console.log(`✅ Seeded ${records.length} records into ${tableName}`);
    }
  }

  // Generate mock ID
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Table query builder (Supabase-style API)
  from(tableName) {
    if (!this.tables[tableName]) {
      throw new Error(`Table ${tableName} does not exist`);
    }
    
    return new MockQueryBuilder(this.tables[tableName], tableName);
  }

  // Auth client
  auth = {
    admin: {
      createUser: async (userData) => {
        const id = userData.id || this.generateId();
        const user = {
          id,
          email: userData.email,
          user_metadata: userData.user_metadata || {},
          created_at: new Date().toISOString(),
          ...userData
        };
        
        this.authUsers.set(id, user);
        return { data: { user }, error: null };
      },

      deleteUser: async (userId) => {
        this.authUsers.delete(userId);
        return { data: null, error: null };
      },

      getUserById: async (userId) => {
        const user = this.authUsers.get(userId);
        return { data: user, error: user ? null : { message: 'User not found' } };
      },

      listUsers: async () => {
        return {
          data: { users: Array.from(this.authUsers.values()) },
          error: null
        };
      }
    },

    signInWithPassword: async ({ email, password }) => {
      // Find user by email in authUsers
      const user = Array.from(this.authUsers.values()).find(u => u.email === email);
      
      if (!user) {
        return { data: null, error: { message: 'Invalid email or password' } };
      }

      return { data: { user }, error: null };
    },

    resetPasswordForEmail: async (email, options) => {
      // Mock implementation - just return success
      return { data: null, error: null };
    }
  };
}

// Query builder class for method chaining
class MockQueryBuilder {
  constructor(table, tableName) {
    this.table = table;
    this.tableName = tableName;
    this.filters = [];
    this.selectFields = '*';
  }

  // Select fields
  select(fields = '*') {
    this.selectFields = fields;
    this.selectCalled = true;
    return this;
  }

  // Filter: equals
  eq(column, value) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  // Filter: in
  in(column, values) {
    this.filters.push({ type: 'in', column, values });
    return this;
  }

  // Filter: greater than or equal
  gte(column, value) {
    this.filters.push({ type: 'gte', column, value });
    return this;
  }

  // Filter: less than or equal
  lte(column, value) {
    this.filters.push({ type: 'lte', column, value });
    return this;
  }

  // Single result
  single() {
    this.limitValue = 1;
    return this;
  }

  // Order by
  order(column, options = {}) {
    this.orderBy = { column, ascending: options.ascending !== false };
    return this;
  }

  // Apply filters to data
  applyFilters(data) {
    if (this.filters.length === 0) return data;
    
    return data.filter(record => {
      return this.filters.every(filter => {
        switch (filter.type) {
          case 'eq':
            // Handle type coercion for ID comparisons
            if (filter.column === 'id' || filter.column === 'user_id' || filter.column === 'package_id' || filter.column === 'booking_id') {
              return String(record[filter.column]) === String(filter.value);
            }
            return record[filter.column] === filter.value;
          case 'in':
            return filter.values.includes(record[filter.column]);
          case 'gte':
            return record[filter.column] >= filter.value;
          case 'lte':
            return record[filter.column] <= filter.value;
          default:
            return true;
        }
      });
    });
  }

  // Execute query
  async then(resolve, reject) {
    try {
      // If this is an update operation, execute update
      if (this.isUpdate) {
        return await this.executeUpdate().then(resolve, reject);
      }
      
      const allData = Array.from(this.table.values());
      let filteredData = this.applyFilters(allData);

      // Apply ordering if specified
      if (this.orderBy) {
        filteredData.sort((a, b) => {
          const aVal = a[this.orderBy.column];
          const bVal = b[this.orderBy.column];
          
          if (aVal < bVal) return this.orderBy.ascending ? -1 : 1;
          if (aVal > bVal) return this.orderBy.ascending ? 1 : -1;
          return 0;
        });
      }

      // Limit results if specified
      if (this.limitValue === 1) {
        filteredData = filteredData.slice(0, 1);
      }

      // Return in Supabase format
      let data, error = null;
      
      if (this.limitValue === 1) {
        data = filteredData[0] || null;
        // If single() was called and no result, return error
        if (data === null) {
          error = { code: 'PGRST116', message: 'No rows returned', details: null };
        }
      } else {
        data = filteredData;
      }

      const result = { data, error };

      resolve(result);
      return result;
    } catch (error) {
      const result = { data: null, error };
      reject(error);
      return result;
    }
  }

  // Insert operation - supports single record or array
  async insert(records) {
    const recordsArray = Array.isArray(records) ? records : [records];
    const inserted = [];
    
    recordsArray.forEach((record, index) => {
      // Use provided ID or generate sequential ID
      const id = record.id || (this.table.size + index + 1);
      const newRecord = { ...record, id, created_at: new Date().toISOString() };
      this.table.set(String(id), newRecord);
      inserted.push(newRecord);
    });
    
    // Return in Supabase format - always return array
    return { data: inserted, error: null };
  }

  // Update operation - returns the query builder for chaining
  update(updates) {
    this.updateData = updates;
    this.isUpdate = true;
    return this;
  }
  
  // Execute update with select chaining
  async executeUpdate() {
    const allData = Array.from(this.table.values());
    const toUpdate = this.applyFilters(allData);
    
    const updatedRecords = [];
    toUpdate.forEach(record => {
      const recordId = String(record.id);
      const existing = this.table.get(recordId);
      const updated = { ...existing, ...this.updateData, updated_at: new Date().toISOString() };
      this.table.set(recordId, updated);
      updatedRecords.push(updated);
    });

    // If select() and single() were called, return filtered result
    if (this.selectCalled && this.limitValue === 1) {
      return { data: updatedRecords[0] || null, error: null };
    }

    return { data: updatedRecords, error: null };
  }

  // Delete operation
  async delete() {
    const allData = Array.from(this.table.values());
    const toDelete = this.applyFilters(allData);
    
    toDelete.forEach(record => {
      this.table.delete(String(record.id));
    });

    return { data: toDelete, error: null };
  }
}

// Create singleton instance
const mockClient = new MockDatabaseClient();

export default mockClient;

