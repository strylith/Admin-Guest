import { fetchWeatherSummary } from '../utils/api.js';
import { showToast } from '../components/toast.js';
import { generateCalendarHTML } from '../utils/calendarShared.js';
import { openAvailabilityModal } from '../components/availabilityModal.js';

// Calendar page state (separate from modal state)
let calendarPageState = {
  packageCategory: 'rooms', // Default to rooms
  packageTitle: '',
  selectedCheckin: null,
  selectedCheckout: null,
  editBookingId: null,
  constraintStartDate: null,
  constraintEndDate: null
};

// Calendar page cache (shared with modal but separate instance)
let calendarPageCache = {
  availabilityCache: new Map(),
  loadedMonths: new Set()
};

export async function WeatherPage(){
  try{
    const w = await fetchWeatherSummary();
    const weekdays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const next = (w.nextDays || []).slice(0,7);
    const map = Object.fromEntries(next.map(d => [d.d, d]));
    const seven = weekdays.map(lbl => map[lbl] || { d: lbl, t: '--', c: '—' });
    const list = seven.map(d => `<li class="forecast-item">${d.d}: ${d.t}°C · ${d.c}</li>`).join('');
    
    return `
      <div class="header-spacer"></div>
      <section class="container">
        <div class="weather" role="region" aria-label="Current weather">
          <div class="current">
            <div class="temp">${w.current.tempC}°C</div>
            <div class="weather-info">
              <div class="condition">${w.current.icon} ${w.current.condition}</div>
              <div class="location">📍 ${w.location}</div>
              <div class="suggestion">💡 ${w.suggestion}</div>
            </div>
          </div>
          <div class="future">
            ${seven.map(d => `
              <div class="chip">
                <div class="day">${d.d}</div>
                <div class="temp">${d.t}°C</div>
                <div class="condition">${d.c}</div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="section-head">
          <h2>7-Day Forecast</h2>
          <p>Extended weather outlook for planning</p>
        </div>
        
        <div class="forecast-container">
          <ul class="forecast-list">${list}</ul>
        </div>
        
        <!-- Calendar Section with Filters -->
        <div class="section-head">
          <h2>Reservation Calendar</h2>
          <p>View availability and book your stay</p>
        </div>
        
        <div class="calendar-page-container">
          <!-- Filter Buttons -->
          <div class="calendar-filter-tabs">
            <button class="filter-tab active" data-category="rooms" onclick="window.switchCalendarFilter('rooms')">
              Rooms
            </button>
            <button class="filter-tab" data-category="cottages" onclick="window.switchCalendarFilter('cottages')">
              Cottages
            </button>
            <button class="filter-tab" data-category="function-halls" onclick="window.switchCalendarFilter('function-halls')">
              Function Halls
            </button>
          </div>
          
          <!-- Calendar Container -->
          <div class="calendar-page-wrapper">
            <div class="calendar-container" id="calendar-page-content">
              <div style="text-align: center; padding: 40px;">Loading calendar...</div>
            </div>
            
            <!-- Calendar Legend -->
            <div class="calendar-legend" id="calendar-page-legend"></div>
          </div>
        </div>
        
        <style>
          .weather {
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
            margin-bottom: 30px;
          }
          
          .current {
            display: flex;
            align-items: center;
            gap: 24px;
            margin-bottom: 24px;
          }
          
          .temp {
            font-size: 48px;
            font-weight: 700;
            color: var(--color-accent);
          }
          
          .weather-info {
            flex: 1;
          }
          
          .condition {
            font-weight: 600;
            font-size: 20px;
            color: var(--color-text);
            margin-bottom: 8px;
          }
          
          .location {
            color: var(--color-muted);
            margin-bottom: 4px;
          }
          
          .suggestion {
            color: var(--color-muted);
            font-style: italic;
          }
          
          .future {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 12px;
          }
          
          .chip {
            background: var(--color-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 16px;
            text-align: center;
            transition: transform 0.2s ease;
          }
          
          .chip:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.1);
          }
          
          .chip .day {
            font-weight: 600;
            color: var(--color-text);
            margin-bottom: 8px;
          }
          
          .chip .temp {
            font-size: 18px;
            font-weight: 600;
            color: var(--color-accent);
            margin-bottom: 4px;
          }
          
          .chip .condition {
            font-size: 12px;
            color: var(--color-muted);
          }
          
          .forecast-container {
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          }
          
          .forecast-list {
            list-style: none;
            padding: 0;
            display: grid;
            gap: 12px;
          }
          
          .forecast-item {
            padding: 12px;
            background: var(--color-bg);
            border-radius: 8px;
            border: 1px solid var(--border);
          }
          
          .calendar-page-container {
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
            margin-bottom: 30px;
          }
          
          .calendar-filter-tabs {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
            border-bottom: 2px solid var(--border);
          }
          
          .filter-tab {
            padding: 12px 24px;
            background: transparent;
            border: none;
            border-bottom: 3px solid transparent;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            color: var(--color-muted);
            transition: all 0.2s ease;
            margin-bottom: -2px;
          }
          
          .filter-tab:hover {
            color: var(--color-text);
          }
          
          .filter-tab.active {
            color: var(--color-accent);
            border-bottom-color: var(--color-accent);
          }
          
          .calendar-page-wrapper {
            margin-top: 20px;
          }
          
          @media (max-width: 768px) {
            .current {
              flex-direction: column;
              text-align: center;
              gap: 16px;
            }
            
            .future {
              grid-template-columns: repeat(2, 1fr);
            }
            
            .calendar-filter-tabs {
              flex-wrap: wrap;
            }
            
            .filter-tab {
              flex: 1;
              min-width: 100px;
              padding: 10px 16px;
              font-size: 14px;
            }
          }
        </style>
      </section>`;
  }catch(e){
    showToast('Weather unavailable','error');
    return `
      <div class="header-spacer"></div>
      <section class="container">
        <div class="section-head">
          <h2>Weather</h2>
          <p>Try again later.</p>
        </div>
      </section>`;
  }
}

// Initialize calendar page
window.initCalendarPage = async function() {
  console.log('[CalendarPage] Initializing calendar page');
  
  // Reset state to default
  calendarPageState.packageCategory = 'rooms';
  calendarPageState.packageTitle = 'Room Booking';
  
  // Load initial calendar
  await updateCalendarPageDisplay();
  updateCalendarLegend();
  
  console.log('[CalendarPage] Calendar page initialized');
};

// Switch calendar filter
window.switchCalendarFilter = async function(category) {
  console.log('[CalendarPage] Switching filter to:', category);
  
  // Update active tab
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.category === category) {
      tab.classList.add('active');
    }
  });
  
  // Clear cache when switching categories to prevent cache pollution
  const previousCategory = calendarPageState.packageCategory;
  if (previousCategory && previousCategory !== category) {
    console.log(`[CalendarPage] Category changed from '${previousCategory}' to '${category}', clearing cache`);
    calendarPageCache.availabilityCache.clear();
    calendarPageCache.loadedMonths.clear();
  }
  
  // Update state
  calendarPageState.packageCategory = category;
  calendarPageState.packageTitle = category === 'rooms' ? 'Room Booking' :
                                   category === 'cottages' ? 'Cottage Booking' :
                                   'Function Hall Booking';
  
  // Reload calendar
  await updateCalendarPageDisplay();
  updateCalendarLegend();
};

// Update calendar page display
async function updateCalendarPageDisplay(year = null, month = null) {
  const calendarContainer = document.getElementById('calendar-page-content');
  if (!calendarContainer) {
    console.warn('[CalendarPage] Calendar container not found');
    return;
  }
  
  const today = new Date();
  
  // If no year/month provided, use current date
  if (year === null || month === null) {
    const monthSelect = calendarContainer.querySelector('.calendar-month-select');
    const yearSelect = calendarContainer.querySelector('.calendar-year-select');
    
    if (monthSelect && yearSelect) {
      year = parseInt(yearSelect.value);
      month = parseInt(monthSelect.value);
    } else {
      year = today.getFullYear();
      month = today.getMonth();
    }
  }
  
  // Show loading
  calendarContainer.innerHTML = '<div style="text-align: center; padding: 40px;">Loading calendar...</div>';
  
  try {
    const html = await generateCalendarHTML(
      year, 
      month, 
      calendarPageState.packageTitle, 
      1, // packageId
      calendarPageState,
      calendarPageCache,
      true // isPageView - pass true to indicate page view mode
    );
    
    calendarContainer.innerHTML = html;
    
    console.log('[CalendarPage] Calendar rendered successfully');
  } catch (error) {
    console.error('[CalendarPage] Error generating calendar:', error);
    const errorMessage = error.message.includes('backend server') 
      ? error.message 
      : 'Error loading calendar. Please try again.';
    calendarContainer.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #d32f2f; background: #ffebee; border-radius: 8px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 16px;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h3 style="margin: 0 0 8px 0;">Unable to Load Calendar</h3>
        <p style="margin: 0;">${errorMessage}</p>
      </div>
    `;
  }
}

// Handle date click on calendar page
window.handleCalendarPageDateClick = async function(dateString, category) {
  console.log('[CalendarPage] Date clicked:', dateString, 'category:', category);
  
  // Show availability modal
  const { openAvailabilityModal } = await import('../components/availabilityModal.js');
  openAvailabilityModal(dateString, category);
};

// Navigate month for calendar page
window.calendarPageNavigateMonth = function(direction) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  const calendarContainer = document.getElementById('calendar-page-content');
  if (!calendarContainer) return;
  
  const monthSelect = calendarContainer.querySelector('.calendar-month-select');
  const yearSelect = calendarContainer.querySelector('.calendar-year-select');
  
  if (!monthSelect || !yearSelect) return;
  
  let newMonth = parseInt(monthSelect.value) + direction;
  let newYear = parseInt(yearSelect.value);
  
  // Handle month overflow
  if (newMonth < 0) {
    newMonth = 11;
    newYear--;
  } else if (newMonth > 11) {
    newMonth = 0;
    newYear++;
  }
  
  // Check bounds (one year limit)
  const maxYear = currentYear + 1;
  const maxMonth = currentMonth;
  
  if (newYear < currentYear || (newYear === currentYear && newMonth < currentMonth)) {
    return; // Can't go before current month
  }
  
  if (newYear > maxYear || (newYear === maxYear && newMonth > maxMonth)) {
    return; // Can't go beyond one year
  }
  
  // Update display with debounce
  clearTimeout(window.calendarPageNavTimer);
  window.calendarPageNavTimer = setTimeout(() => {
    updateCalendarPageDisplay(newYear, newMonth);
  }, 150);
};

// Change month for calendar page
window.calendarPageChangeMonth = function(monthValue) {
  const yearSelect = document.querySelector('#calendar-page-content .calendar-year-select');
  if (!yearSelect) return;
  
  const newYear = parseInt(yearSelect.value);
  const newMonth = parseInt(monthValue);
  
  updateCalendarPageDisplay(newYear, newMonth);
};

// Change year for calendar page
window.calendarPageChangeYear = function(yearValue) {
  const monthSelect = document.querySelector('#calendar-page-content .calendar-month-select');
  if (!monthSelect) return;
  
  const newYear = parseInt(yearValue);
  const newMonth = parseInt(monthSelect.value);
  
  updateCalendarPageDisplay(newYear, newMonth);
};

// Update calendar legend based on selected filter
function updateCalendarLegend() {
  const legendContainer = document.getElementById('calendar-page-legend');
  if (!legendContainer) return;
  
  const category = calendarPageState.packageCategory;
  
  let legendHTML = '';
  
  if (category === 'rooms') {
    legendHTML = `
      <div class="legend-item">
        <div class="legend-color past"></div>
        <span>Past Dates</span>
      </div>
      <div class="legend-item">
        <div class="legend-color today"></div>
        <span>Today</span>
      </div>
      <div class="legend-item">
        <div class="legend-color available-all"></div>
        <span>All Available</span>
      </div>
      <div class="legend-item">
        <div class="legend-color available-2"></div>
        <span>Partial</span>
      </div>
      <div class="legend-item">
        <div class="legend-color available-1"></div>
        <span>Limited</span>
      </div>
      <div class="legend-item">
        <div class="legend-color booked-all"></div>
        <span>Fully Booked</span>
      </div>
    `;
  } else if (category === 'cottages' || category === 'function-halls') {
    const typeLabel = category === 'cottages' ? 'Cottage' : 'Function Hall';
    legendHTML = `
      <div class="legend-item">
        <div class="legend-color past"></div>
        <span>Past Dates</span>
      </div>
      <div class="legend-item">
        <div class="legend-color today"></div>
        <span>Today</span>
      </div>
      <div class="legend-item">
        <div class="legend-color cottage-available"></div>
        <span>Available</span>
      </div>
      <div class="legend-item">
        <div class="legend-color cottage-partial"></div>
        <span>Partially Booked</span>
      </div>
      <div class="legend-item">
        <div class="legend-color cottage-booked"></div>
        <span>Fully Booked</span>
      </div>
    `;
  }
  
  legendContainer.innerHTML = legendHTML;
}


