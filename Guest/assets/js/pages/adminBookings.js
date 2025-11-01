import { showToast } from '../components/toast.js';
import { setBusy } from '../components/loader.js';
import { apiRequest } from '../utils/api.js';

export async function AdminBookingsPage() {
  // Check if user is logged in and has admin/staff role
  if (!window.kinaAuth || !window.kinaAuth.isLoggedIn()) {
    showToast('Please log in to access the admin dashboard', 'error');
    location.hash = '#/auth';
    return '';
  }

  await setBusy(true);
  
  try {
    await setBusy(false);
    
    return `
      <div class="admin-bookings">
        <div class="admin-header">
          <h1>Booking Management</h1>
          <div class="header-actions">
            <select id="status-filter" class="filter-select">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
            <button id="refresh-bookings" class="btn btn-secondary">Refresh</button>
          </div>
        </div>
        
        <div id="bookings-container" class="bookings-container">
          <p>Loading bookings...</p>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Admin bookings page error:', error);
    showToast('Failed to load bookings page', 'error');
    await setBusy(false);
    return '';
  }
}

export async function initAdminBookings() {
  const bookingsContainer = document.getElementById('bookings-container');
  if (!bookingsContainer) return;
  
  await loadBookings();
  
  // Bind filter change event
  const statusFilter = document.getElementById('status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', loadBookings);
  }
  
  // Bind refresh button
  const refreshBtn = document.getElementById('refresh-bookings');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadBookings);
  }
}

async function loadBookings() {
  const bookingsContainer = document.getElementById('bookings-container');
  if (!bookingsContainer) return;
  
  const statusFilter = document.getElementById('status-filter');
  const status = statusFilter?.value || 'all';
  
  bookingsContainer.innerHTML = '<p>Loading bookings...</p>';
  
  try {
    const endpoint = status === 'all' 
      ? '/admin/bookings'
      : `/admin/bookings?status=${status}`;
    
    const data = await apiRequest(endpoint);
    
    if (!data.success) {
      showToast('Failed to load bookings', 'error');
      bookingsContainer.innerHTML = '<p class="error">Failed to load bookings</p>';
      return;
    }
    
    const bookings = data.bookings || [];
    
    if (bookings.length === 0) {
      bookingsContainer.innerHTML = '<p class="no-data">No bookings found</p>';
      return;
    }
    
    bookingsContainer.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Guest</th>
            <th>Package</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Guests</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${bookings.map(booking => `
            <tr>
              <td>#${booking.id}</td>
              <td>${booking.users ? `${booking.users.first_name} ${booking.users.last_name}` : 'N/A'}</td>
              <td>${booking.packages?.title || 'N/A'}</td>
              <td>${new Date(booking.check_in).toLocaleDateString()}</td>
              <td>${new Date(booking.check_out).toLocaleDateString()}</td>
              <td>${booking.guests || 1}</td>
              <td>
                <span class="status-badge status-${booking.status}">${booking.status}</span>
              </td>
              <td>
                <button class="btn-small btn-view" onclick="viewBooking(${booking.id})">View</button>
                <button class="btn-small btn-edit" onclick="editBooking(${booking.id})">Edit</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    console.error('Failed to load bookings:', error);
    showToast('Failed to load bookings', 'error');
    bookingsContainer.innerHTML = '<p class="error">Failed to load bookings</p>';
  }
}

// Global functions for booking actions
window.viewBooking = async (bookingId) => {
  showToast(`Viewing booking #${bookingId}`, 'info');
  // TODO: Implement view booking modal
};

window.editBooking = async (bookingId) => {
  showToast(`Editing booking #${bookingId}`, 'info');
  // TODO: Implement edit booking modal
};

