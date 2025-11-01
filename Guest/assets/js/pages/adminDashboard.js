import { showToast } from '../components/toast.js';
import { setBusy } from '../components/loader.js';
import { apiRequest } from '../utils/api.js';

export async function AdminDashboardPage() {
  // Check if user is logged in and has admin/staff role
  if (!window.kinaAuth || !window.kinaAuth.isLoggedIn()) {
    showToast('Please log in to access the admin dashboard', 'error');
    location.hash = '#/auth';
    return '';
  }

  const user = window.kinaAuth.getCurrentUser();
  
  // TODO: Check user role from token/user data
  // For now, this is a placeholder that will be replaced with actual API calls
  
  await setBusy(true);
  
  try {
    // Fetch dashboard stats
    const statsData = await apiRequest('/admin/dashboard/stats');
    
    if (!statsData.success) {
      showToast('Failed to load dashboard statistics', 'error');
      return '';
    }
    
    const stats = statsData.stats;
    
    await setBusy(false);
    
    return `
      <div class="admin-dashboard">
        <div class="admin-header">
          <h1>Admin Dashboard</h1>
          <div class="admin-user-info">
            <span>Welcome, ${user.firstName || 'Admin'}</span>
          </div>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">📊</div>
            <h3>${stats.totalBookings || 0}</h3>
            <p>Total Bookings</p>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">🏨</div>
            <h3>${stats.occupancyRate || 0}%</h3>
            <p>Occupancy Rate</p>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">⏳</div>
            <h3>${stats.pendingBookings || 0}</h3>
            <p>Pending Reservations</p>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">✅</div>
            <h3>${stats.confirmedBookings || 0}</h3>
            <p>Confirmed Bookings</p>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">📦</div>
            <h3>${stats.packagesCount || 0}</h3>
            <p>Available Packages</p>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">👥</div>
            <h3>${stats.usersCount || 0}</h3>
            <p>Active Users</p>
          </div>
        </div>
        
        <div class="admin-section">
          <div class="section-header">
            <h2>Quick Actions</h2>
          </div>
          <div class="actions-grid">
            <a href="#/admin/bookings" class="action-card">
              <div class="action-icon">📋</div>
              <h3>Manage Bookings</h3>
              <p>View, edit, and manage all bookings</p>
            </a>
            
            <a href="#/admin/users" class="action-card">
              <div class="action-icon">👥</div>
              <h3>Manage Users</h3>
              <p>Create staff accounts and manage users</p>
            </a>
            
            <a href="#/admin/audit" class="action-card">
              <div class="action-icon">📜</div>
              <h3>Audit Logs</h3>
              <p>View system activity and audit trail</p>
            </a>
            
            <a href="#/packages" class="action-card">
              <div class="action-icon">🏖️</div>
              <h3>View Packages</h3>
              <p>Browse available packages</p>
            </a>
          </div>
        </div>
        
        <div class="admin-section">
          <div class="section-header">
            <h2>Recent Activity</h2>
            <a href="#/admin/audit" class="view-all-link">View All →</a>
          </div>
          <div id="recent-activity-list" class="activity-list">
            <p>Loading recent activity...</p>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Admin dashboard error:', error);
    showToast('Failed to load dashboard', 'error');
    await setBusy(false);
    return '';
  }
}

// Initialize admin dashboard data
export async function initAdminDashboard() {
  // This will be called after the page HTML is rendered
  // Load additional data or bind events here
  
  const activityList = document.getElementById('recent-activity-list');
  if (!activityList) return;
  
  try {
    const data = await apiRequest('/admin/audit-logs?limit=5');
    
    if (data.success && data.logs && data.logs.length > 0) {
      activityList.innerHTML = data.logs.map(log => `
        <div class="activity-item">
          <div class="activity-icon">📝</div>
          <div class="activity-content">
            <p class="activity-action">${log.action}</p>
            <p class="activity-meta">
              ${log.user?.name || 'System'} • ${new Date(log.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      `).join('');
    } else {
      activityList.innerHTML = '<p class="no-data">No recent activity</p>';
    }
  } catch (error) {
    console.error('Failed to load activity:', error);
    activityList.innerHTML = '<p class="error">Failed to load activity</p>';
  }
}

