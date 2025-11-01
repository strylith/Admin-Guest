import { showToast } from '../components/toast.js';
import { setBusy } from '../components/loader.js';
import { apiRequest } from '../utils/api.js';

export async function AdminAuditPage() {
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
      <div class="admin-audit">
        <div class="admin-header">
          <h1>Audit Logs</h1>
          <div class="header-actions">
            <button id="refresh-logs" class="btn btn-secondary">Refresh</button>
          </div>
        </div>
        
        <div id="audit-logs-container" class="audit-logs-container">
          <p>Loading audit logs...</p>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Admin audit page error:', error);
    showToast('Failed to load audit logs page', 'error');
    await setBusy(false);
    return '';
  }
}

export async function initAdminAudit() {
  const logsContainer = document.getElementById('audit-logs-container');
  if (!logsContainer) return;
  
  await loadAuditLogs();
  
  // Bind refresh button
  const refreshBtn = document.getElementById('refresh-logs');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadAuditLogs);
  }
}

async function loadAuditLogs() {
  const logsContainer = document.getElementById('audit-logs-container');
  if (!logsContainer) return;
  
  logsContainer.innerHTML = '<p>Loading audit logs...</p>';
  
  try {
    const data = await apiRequest('/admin/audit-logs');
    
    if (!data.success) {
      showToast('Failed to load audit logs', 'error');
      logsContainer.innerHTML = '<p class="error">Failed to load audit logs</p>';
      return;
    }
    
    const logs = data.logs || [];
    
    if (logs.length === 0) {
      logsContainer.innerHTML = '<p class="no-data">No audit logs found</p>';
      return;
    }
    
    logsContainer.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>User</th>
            <th>Action</th>
            <th>Details</th>
            <th>IP Address</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(log => `
            <tr>
              <td>${new Date(log.created_at).toLocaleString()}</td>
              <td>${log.user?.name || log.user?.email || 'System'}</td>
              <td><code>${log.action}</code></td>
              <td>${log.details || '-'}</td>
              <td>${log.ip_address || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    console.error('Failed to load audit logs:', error);
    showToast('Failed to load audit logs', 'error');
    logsContainer.innerHTML = '<p class="error">Failed to load audit logs</p>';
  }
}

