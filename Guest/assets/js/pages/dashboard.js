import { showToast } from '../components/toast.js';

export async function DashboardPage() {
  // Check if user is logged in
  if (!window.kinaAuth || !window.kinaAuth.isLoggedIn()) {
    showToast('Please log in to access your dashboard', 'error');
    location.hash = '#/auth';
    return '';
  }

  const user = window.kinaAuth.getCurrentUser();
  
  // Mock booking data for the user
  const mockBookings = [
    {
      id: 'b1',
      room: 'Deluxe Ocean View',
      checkIn: '2024-12-15',
      checkOut: '2024-12-18',
      status: 'Confirmed',
      guests: 2,
      total: 450
    },
    {
      id: 'b2',
      room: 'Garden Villa',
      checkIn: '2025-01-20',
      checkOut: '2025-01-25',
      status: 'Pending',
      guests: 4,
      total: 750
    }
  ];

  // Mock activity data
  const recentActivity = [
    {
      type: 'booking',
      message: 'Booking confirmed for Dec 15-18',
      time: '2 days ago',
      icon: '✅'
    },
    {
      type: 'email',
      message: 'Welcome email sent',
      time: '1 week ago',
      icon: '📧'
    },
    {
      type: 'points',
      message: 'Earned 100 loyalty points',
      time: '2 weeks ago',
      icon: '⭐'
    }
  ];

  window.kinaViewBooking = (bookingId) => {
    showToast('Viewing booking details for ' + bookingId, 'info');
  };

  window.kinaModifyBooking = (bookingId) => {
    showToast('Modify booking feature coming soon!', 'info');
  };

  window.kinaCancelBooking = (bookingId) => {
    if (confirm('Are you sure you want to cancel this booking?')) {
      showToast('Booking cancelled successfully', 'success');
      // In a real app, this would update the booking status
    }
  };

  window.kinaSearchAvailability = () => {
    const checkin = document.getElementById('checkin-date').value;
    const checkout = document.getElementById('checkout-date').value;
    const guests = document.getElementById('guests-count').value;
    
    if (!checkin || !checkout || !guests) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    
    if (new Date(checkout) <= new Date(checkin)) {
      showToast('Check-out date must be after check-in date', 'error');
      return;
    }
    
    showToast('Searching for available rooms...', 'info');
    setTimeout(() => {
      location.hash = '#/rooms';
    }, 1000);
  };

  const bookingRows = mockBookings.map(booking => `
    <div class="booking-item ${booking.status === 'Confirmed' ? 'confirmed' : ''}">
      <div class="booking-info">
        <h4>${booking.room}</h4>
        <div class="booking-details">
          <span class="booking-date">
            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            ${booking.checkIn} - ${booking.checkOut}
          </span>
          <span class="booking-guests">
            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            ${booking.guests} Guests
          </span>
        </div>
      </div>
      <button class="btn outline" onclick="kinaViewBooking('${booking.id}')">View</button>
    </div>
  `).join('');

  const activityItems = recentActivity.map(activity => `
    <div class="activity-item">
      <svg class="activity-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12,6 12,12 16,14"></polyline>
      </svg>
      <span class="activity-time">${activity.time}</span>
      <span class="activity-text">${activity.message}</span>
    </div>
  `).join('');

  return `
    <section class="dashboard-container">
      <!-- Main Dashboard Grid -->
      <div class="dashboard-grid">
        <!-- Your Reservations Card -->
        <div class="dashboard-card reservations-card">
          <div class="card-header">
            <h3>Your Reservations</h3>
            <p class="card-subtitle">Manage your upcoming stays</p>
          </div>
          <div class="bookings-list">
            ${bookingRows}
          </div>
        </div>

        <!-- Quick Stats Card -->
        <div class="dashboard-card stats-card">
          <h3>Quick Stats</h3>
          <div class="stats-list">
            <div class="stat-item">
              <div class="stat-number">${user.totalBookings || 0}</div>
              <div class="stat-label">Active Bookings</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${(user.totalBookings || 0) * 3}</div>
              <div class="stat-label">Total Nights</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${user.loyaltyPoints || 0}</div>
              <div class="stat-label">Loyalty Points</div>
            </div>
          </div>
        </div>

        <!-- New Reservation Card -->
        <div class="dashboard-card new-reservation-card">
          <div class="card-header">
            <h3>New Reservation</h3>
            <p class="card-subtitle">Book your next stay with us</p>
          </div>
          <div class="reservation-form">
            <div class="form-row">
              <div class="form-group">
                <label>Check-in</label>
                <input type="date" id="checkin-date" min="${new Date().toISOString().split('T')[0]}">
              </div>
              <div class="form-group">
                <label>Check-out</label>
                <input type="date" id="checkout-date" min="${new Date().toISOString().split('T')[0]}">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Guests</label>
                <input type="number" placeholder="2" min="1" max="8" id="guests-count">
              </div>
              <div class="form-group search-group">
                <button class="btn primary search-btn" onclick="kinaSearchAvailability()">Search Availability</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Featured Rooms Card -->
        <div class="dashboard-card featured-rooms-card">
          <h3>Featured Rooms</h3>
          <div class="rooms-list">
            <div class="room-item" onclick="location.hash='#/rooms'">
              <h4>Deluxe Suite</h4>
              <p>From $299/night</p>
            </div>
            <div class="room-item" onclick="location.hash='#/rooms'">
              <h4>Ocean View</h4>
              <p>From $399/night</p>
            </div>
            <div class="room-item" onclick="location.hash='#/rooms'">
              <h4>Garden Villa</h4>
              <p>From $499/night</p>
            </div>
          </div>
        </div>

        <!-- Recent Activity Card -->
        <div class="dashboard-card activity-card">
          <h3>Recent Activity</h3>
          <div class="activity-list">
            ${activityItems}
          </div>
        </div>
      </div>
    </section>

    <style>
      .dashboard-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 32px 24px;
      }

      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
      }

      .dashboard-card {
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        border: 1px solid var(--border);
        transition: all 0.2s ease;
      }

      .dashboard-card:hover {
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }

      .dashboard-card h3 {
        margin: 0 0 8px;
        font-size: 20px;
        font-weight: 600;
        color: var(--color-text);
      }

      .card-subtitle {
        margin: 0 0 20px;
        font-size: 14px;
        color: var(--color-muted);
      }

      /* Reservations Card - spans 2 columns */
      .reservations-card {
        grid-column: span 2;
      }

      .booking-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 12px;
        transition: all 0.2s ease;
      }

      .booking-item.confirmed {
        background: rgba(56, 182, 255, 0.1);
        border: 1px solid rgba(56, 182, 255, 0.3);
      }

      .booking-item:not(.confirmed) {
        border: 1px solid var(--border);
      }

      .booking-item:hover {
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }

      .booking-info h4 {
        margin: 0 0 8px;
        font-size: 16px;
        font-weight: 600;
        color: var(--color-text);
      }

      .booking-details {
        display: flex;
        gap: 16px;
        font-size: 14px;
        color: var(--color-muted);
      }

      .booking-date, .booking-guests {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .icon {
        width: 16px;
        height: 16px;
        color: var(--color-muted);
      }

      /* Stats Card */
      .stats-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .stat-item {
        text-align: center;
      }

      .stat-number {
        display: block;
        font-size: 32px;
        font-weight: 700;
        color: var(--color-accent);
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 14px;
        color: var(--color-muted);
      }

      /* New Reservation Card - spans 2 columns */
      .new-reservation-card {
        grid-column: span 2;
      }

      .reservation-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .form-group {
        display: flex;
        flex-direction: column;
      }

      .form-group label {
        font-size: 14px;
        font-weight: 500;
        color: var(--color-text);
        margin-bottom: 8px;
      }

      .form-group input {
        padding: 8px 12px;
        border: 1px solid var(--border);
        border-radius: 6px;
        font-size: 14px;
        transition: all 0.2s ease;
        height: 40px;
      }

      .form-group input:focus {
        outline: none;
        border-color: var(--color-accent);
        box-shadow: 0 0 0 3px rgba(56, 182, 255, 0.1);
      }

      .search-group {
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }

      .search-group .search-btn {
        height: 40px;
        width: 100%;
        margin-top: 0;
        padding: 8px 16px;
        box-sizing: border-box;
        text-align: center;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* Featured Rooms Card */
      .rooms-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .room-item {
        padding: 12px;
        border: 1px solid var(--border);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .room-item:hover {
        border-color: var(--color-accent);
        background: var(--color-bg);
      }

      .room-item h4 {
        margin: 0 0 4px;
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text);
      }

      .room-item p {
        margin: 0;
        font-size: 12px;
        color: var(--color-muted);
      }

      /* Activity Card - spans all 3 columns */
      .activity-card {
        grid-column: span 3;
      }

      .activity-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .activity-item {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
      }

      .activity-icon {
        width: 16px;
        height: 16px;
        color: var(--color-muted);
        flex-shrink: 0;
      }

      .activity-time {
        color: var(--color-muted);
        font-size: 14px;
        min-width: 80px;
      }

      .activity-text {
        color: var(--color-text);
        font-size: 14px;
      }

      /* Button Styles */
      .btn {
        padding: 10px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .btn.primary {
        background: var(--color-accent);
        color: white;
      }

      .btn.primary:hover {
        background: #2c5aa0;
      }

      .btn.outline {
        background: white;
        color: var(--color-accent);
        border: 1px solid var(--color-accent);
      }

      .btn.outline:hover {
        background: var(--color-accent);
        color: white;
      }

      /* Responsive Design */
      @media (max-width: 1024px) {
        .dashboard-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        
        .reservations-card,
        .new-reservation-card {
          grid-column: span 2;
        }
        
        .activity-card {
          grid-column: span 2;
        }
      }

      @media (max-width: 768px) {
        .dashboard-container {
          padding: 16px;
        }

        .dashboard-grid {
          grid-template-columns: 1fr;
        }

        .reservations-card,
        .new-reservation-card,
        .activity-card {
          grid-column: span 1;
        }

        .form-row {
          grid-template-columns: 1fr;
        }

        .booking-item {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }

        .booking-details {
          flex-direction: column;
          gap: 8px;
        }

        .action-buttons {
          grid-template-columns: 1fr;
        }

        .stats-list {
          flex-direction: row;
          justify-content: space-around;
        }

        .stat-item {
          text-align: center;
          flex: 1;
        }
      }

      @media (max-width: 480px) {
        .dashboard-container {
          padding: 12px;
        }

        .dashboard-card {
          padding: 16px;
        }

        .booking-item {
          padding: 12px;
        }

        .form-group input {
          font-size: 16px; /* Prevents zoom on iOS */
        }

        .btn {
          width: 100%;
          padding: 12px;
        }

        .stats-list {
          flex-direction: column;
          gap: 12px;
        }

        .stat-number {
          font-size: 24px;
        }

        .stat-label {
          font-size: 12px;
        }
      }
    </style>
  `;
}

