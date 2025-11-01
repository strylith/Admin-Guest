import { showToast } from '../components/toast.js';
import { setBusy } from '../components/loader.js';
import { apiRequest } from '../utils/api.js';

export async function AdminUsersPage() {
  // Check if user is logged in and has admin role
  if (!window.kinaAuth || !window.kinaAuth.isLoggedIn()) {
    showToast('Please log in to access the admin dashboard', 'error');
    location.hash = '#/auth';
    return '';
  }

  await setBusy(true);
  
  try {
    await setBusy(false);
    
    return `
      <div class="admin-users">
        <div class="admin-header">
          <h1>User Management</h1>
          <div class="header-actions">
            <button id="create-user-btn" class="btn btn-primary">Create Staff Account</button>
            <button id="refresh-users" class="btn btn-secondary">Refresh</button>
          </div>
        </div>
        
        <div class="admin-section">
          <h2>Staff & Admin Users</h2>
          <div id="users-container" class="users-container">
            <p>Loading users...</p>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Admin users page error:', error);
    showToast('Failed to load users page', 'error');
    await setBusy(false);
    return '';
  }
}

export async function initAdminUsers() {
  const usersContainer = document.getElementById('users-container');
  if (!usersContainer) return;
  
  await loadUsers();
  
  // Bind refresh button
  const refreshBtn = document.getElementById('refresh-users');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadUsers);
  }
  
  // Bind create user button
  const createBtn = document.getElementById('create-user-btn');
  if (createBtn) {
    createBtn.addEventListener('click', showCreateUserModal);
  }
}

async function loadUsers() {
  const usersContainer = document.getElementById('users-container');
  if (!usersContainer) return;
  
  usersContainer.innerHTML = '<p>Loading users...</p>';
  
  try {
    const data = await apiRequest('/admin/users');
    
    if (!data.success) {
      showToast('Failed to load users', 'error');
      usersContainer.innerHTML = '<p class="error">Failed to load users</p>';
      return;
    }
    
    const users = data.users || [];
    
    if (users.length === 0) {
      usersContainer.innerHTML = '<p class="no-data">No users found</p>';
      return;
    }
    
    usersContainer.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Member Since</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(user => `
            <tr>
              <td>${user.full_name || `${user.first_name} ${user.last_name}`}</td>
              <td>${user.email}</td>
              <td>
                <span class="role-badge role-${user.role}">${user.role}</span>
              </td>
              <td>
                <span class="status-badge ${user.is_active ? 'status-active' : 'status-inactive'}">
                  ${user.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td>${new Date(user.member_since).toLocaleDateString()}</td>
              <td>
                <button class="btn-small btn-edit" onclick="editUser('${user.id}')">Edit</button>
                <button class="btn-small btn-delete" onclick="deleteUser('${user.id}', '${user.email}')">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    console.error('Failed to load users:', error);
    showToast('Failed to load users', 'error');
    usersContainer.innerHTML = '<p class="error">Failed to load users</p>';
  }
}

function showCreateUserModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Create Staff Account</h2>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <form id="create-user-form">
        <div class="form-group">
          <label>First Name</label>
          <input type="text" name="firstName" required>
        </div>
        <div class="form-group">
          <label>Last Name</label>
          <input type="text" name="lastName" required>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="email" required>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" name="password" required>
        </div>
        <div class="form-group">
          <label>Role</label>
          <select name="role" required>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Account</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const form = document.getElementById('create-user-form');
  form.addEventListener('submit', handleCreateUser);
}

async function handleCreateUser(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  
  const userData = {
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role')
  };
  
  try {
    const data = await apiRequest('/auth/admin/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    if (data.success) {
      showToast('Staff account created successfully', 'success');
      event.target.closest('.modal-overlay').remove();
      loadUsers();
    } else {
      showToast(data.error || 'Failed to create account', 'error');
    }
  } catch (error) {
    console.error('Create user error:', error);
    showToast('Failed to create account', 'error');
  }
}

// Global functions for user actions
window.editUser = async (userId) => {
  showToast(`Editing user ${userId}`, 'info');
  // TODO: Implement edit user modal
};

window.deleteUser = async (userId, userEmail) => {
  if (!confirm(`Are you sure you want to delete ${userEmail}?`)) {
    return;
  }
  
  try {
    const data = await apiRequest(`/admin/users/${userId}`, {
      method: 'DELETE'
    });
    
    if (data.success) {
      showToast('User deleted successfully', 'success');
      loadUsers();
    } else {
      showToast(data.error || 'Failed to delete user', 'error');
    }
  } catch (error) {
    console.error('Delete user error:', error);
    showToast('Failed to delete user', 'error');
  }
};

