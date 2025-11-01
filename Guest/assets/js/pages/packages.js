import { createLuxuryCard, createPackagesGrid, samplePackages, allPackages, createCategoryCard } from '../components/luxuryCard.js';
import { initPackagesSlider } from '../components/packagesSlider.js';
import { openCalendarModal } from '../components/calendarModal.js';
import { openBookingModal } from '../components/bookingModal.js';
import { bookingState } from '../utils/bookingState.js';
import { normalizeDateInputToYMD } from '../utils/calendarUtils.js';

export async function PackagesPage(){
  const data = [
    { id:'lux-rooms', title:'Luxury Rooms', img:'images/kina1.jpg', price:'₱6,500+/night', desc:'Spacious rooms with ocean views, modern bath, and breakfast.' },
    { id:'infinity-pool', title:'Infinity Pool Access', img:'images/kina2.jpg', price:'Included', desc:'Sweeping horizon pool perfect for sunny afternoons.' },
    { id:'beach-cottages', title:'Beachfront Cottages', img:'images/kina3.jpg', price:'₱7,500+/night', desc:'Private veranda, direct beach access, ideal for couples.' },
    { id:'dining', title:'Gourmet Dining Options', img:'images/kina1.jpg', price:'Varies', desc:'Seafood-forward menus and tropical cocktails.' },
    { id:'water-sports', title:'Water Sports', img:'images/kina2.jpg', price:'₱800+/hour', desc:'Kayaks, paddleboards, and snorkeling gear.' },
    { id:'day-pass', title:'Day Pass', img:'images/kina3.jpg', price:'₱1,200', desc:'Pool + facilities access for day visitors.' },
  ];

  function card(p){
    return `
    <article class="package-card" data-id="${p.id}">
      <div class="package-media" style="background-image:url('${p.img}')"></div>
      <div class="package-meta">
        <div class="package-title">${p.title}</div>
        <div class="package-price">${p.price}</div>
      </div>
      <div class="package-overlay">
        <h4>${p.title}</h4>
        <p>${p.desc}</p>
        <small>💡 Perfect for clear weather days</small>
        <div class="package-cta">
          <a class="btn primary" href="#/rooms">Book Now</a>
          <a class="btn" href="#/rooms">Learn More</a>
        </div>
      </div>
    </article>`;
  }

  window.kinaFilterPackages = (q) => {
    const val = (q||'').toLowerCase();
    document.querySelectorAll('.package-card').forEach(node => {
      const id = node.getAttribute('data-id')||'';
      node.style.display = id.includes(val) ? '' : 'none';
    });
  };

      return `
        <section class="packages-section">
          <!-- Header spacer to prevent overlap -->
          <div class="header-spacer"></div>
          
          <div class="container">
            <!-- Modern Search and Filter Controls -->
            <div class="search-filter-wrapper" style="background: linear-gradient(135deg, var(--color-accent) 0%, #2c5aa0 100%); position: relative; overflow: hidden; margin: -20px -20px 40px -20px; border-radius: 0 0 20px 20px; padding: 20px 0;">
              <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('images/kina1.jpg') center/cover; opacity: 0.1; z-index: 0;"></div>
              <div style="position: relative; z-index: 1;">
            <div class="search-filter-container">
              <div class="search-box">
                <div class="search-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                </div>
                <input 
                  type="text" 
                  id="package-search" 
                  placeholder="Search packages..." 
                  class="search-input"
                  onkeyup="filterPackages()"
                />
                <button class="clear-search" onclick="clearSearch()" style="display: none;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              
              <div class="filter-tabs">
                <button class="filter-tab active" data-category="" onclick="setActiveFilter(this, '')">All</button>
                <button class="filter-tab" data-category="rooms" onclick="setActiveFilter(this, 'rooms')">Rooms</button>
                <button class="filter-tab" data-category="cottages" onclick="setActiveFilter(this, 'cottages')">Cottages</button>
                <button class="filter-tab" data-category="function-halls" onclick="setActiveFilter(this, 'function-halls')">Function Halls</button>
              </div>
            </div>
              </div>
            </div>
        
        <!-- Rooms Section -->
        <div class="package-section" id="rooms-section">
          <h3 class="section-title">Rooms & Suites</h3>
          <div class="category-card-container" id="rooms-container">
            <!-- Category card will be inserted here -->
          </div>
        </div>
        
        <!-- Cottages Section -->
        <div class="package-section" id="cottages-section">
          <h3 class="section-title">Cottage</h3>
          <div class="category-cards-grid" id="cottages-container">
            <!-- Cottage cards will be inserted here -->
          </div>
        </div>
        
        <!-- Function Halls Section -->
        <div class="package-section" id="function-halls-section">
          <h3 class="section-title">Function Hall Services</h3>
          <div class="category-card-container" id="function-halls-container">
            <!-- Category card will be inserted here -->
          </div>
        </div>
      </div>
      
      <style>
        .packages-hero {
          background: linear-gradient(135deg, var(--color-accent) 0%, #2c5aa0 100%);
          padding: 120px 0 40px 0;
          margin: 0 -20px 0 -20px;
          border-radius: 0 0 20px 20px;
          position: relative;
          overflow: hidden;
        }
        
        .packages-hero .container {
          max-width: 1000px;
          position: relative;
          z-index: 1;
        }
        
        .packages-hero::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('images/kina2.jpg') center/cover;
          opacity: 0.1;
          z-index: 0;
        }
        
        .packages-hero h2 {
          color: white;
          font-size: 42px;
          font-weight: 700;
          margin: 0 0 24px 0;
          text-align: center;
        }
        
        .search-filter-container {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 0;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          border: none;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .search-box {
          position: relative;
          margin-bottom: 16px;
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          color: #64748b;
          pointer-events: none;
          z-index: 2;
        }
        
        .search-input {
          width: 100%;
          height: 40px;
          padding: 0 40px 0 36px;
          border: 1px solid #d1d5db;
          border-radius: 20px;
          font-size: 14px;
          background: #f9fafb;
          transition: all 0.2s ease;
          outline: none;
          font-weight: 400;
        }
        
        .search-input:focus {
          background: white;
          border-color: #38b6ff;
          box-shadow: 0 0 0 3px rgba(56, 182, 255, 0.1);
        }
        
        .search-input::placeholder {
          color: #9ca3af;
          font-weight: 400;
        }
        
        .clear-search {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 2;
        }
        
        .clear-search:hover {
          color: #64748b;
          transform: translateY(-50%) scale(1.1);
        }
        
        .filter-tabs {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: center;
        }
        
        .filter-tab {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          border-radius: 16px;
          background: #f9fafb;
          color: #6b7280;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
          white-space: nowrap;
        }
        
        .filter-tab:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }
        
        .filter-tab.active {
          background: #38b6ff;
          border-color: #38b6ff;
          color: white;
          box-shadow: 0 2px 8px rgba(56, 182, 255, 0.2);
        }
        
        .filter-tab.active:hover {
          background: #2a9ce8;
          border-color: #2a9ce8;
        }
        
        @media (max-width: 768px) {
          .search-filter-container {
            padding: 16px;
            margin-bottom: 20px;
            margin-left: 16px;
            margin-right: 16px;
          }
          
          .search-box {
            max-width: 100%;
          }
          
          .search-input {
            height: 38px;
            font-size: 14px;
          }
          
          .filter-tabs {
            gap: 4px;
          }
          
          .filter-tab {
            padding: 6px 12px;
            font-size: 12px;
          }
        }
        
        .package-section {
          margin-bottom: 60px;
          background: transparent;
          border-radius: 0;
          padding: 0;
          box-shadow: none;
        }
        
        .section-title {
          font-size: 36px;
          font-weight: 700;
          color: var(--color-text);
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
        }
        
        .section-title::after {
          content: '';
          position: absolute;
          bottom: -6px;
          left: 0;
          width: 100px;
          height: 3px;
          background: linear-gradient(90deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%);
          border-radius: 2px;
          box-shadow: 0 2px 4px rgba(255, 215, 0, 0.3);
        }
        
        
        .packages-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 24px;
          margin: 30px 0;
        }
        
        .package-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          position: relative;
          min-height: 320px;
        }
        
        .package-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }
        
        .package-media {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          transition: filter 0.4s ease, transform 0.4s ease;
        }
        
        .package-card:hover .package-media {
          filter: blur(2px) brightness(0.9);
          transform: scale(1.05);
        }
        
        .package-meta {
          position: absolute;
          left: 16px;
          bottom: 16px;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(8px);
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.2);
        }
        
        .package-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 4px;
          color: var(--color-text);
        }
        
        .package-price {
          color: var(--color-accent);
          font-weight: 600;
          font-size: 16px;
        }
        
        .package-overlay {
          position: absolute;
          top: 0;
          right: -100%;
          bottom: 0;
          width: 100%;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(8px);
          transition: right 0.4s ease;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 20px;
          border-left: 1px solid rgba(255,255,255,0.2);
        }
        
        .package-card:hover .package-overlay {
          right: 0;
        }
        
        .package-overlay h4 {
          margin: 0;
          font-size: 22px;
          color: var(--color-text);
          font-weight: 600;
        }
        
        .package-overlay p {
          color: var(--color-muted);
          margin: 0;
          line-height: 1.5;
          flex: 1;
        }
        
        .package-overlay small {
          color: var(--color-muted);
          font-style: italic;
        }
        
        .package-cta {
          display: flex;
          gap: 8px;
          margin-top: auto;
        }
        
        .package-cta .btn {
          flex: 1;
          text-align: center;
        }
        
        .package-cta .btn.primary {
          font-weight: 600;
        }
        
        @media (max-width: 768px) {
          .packages-grid {
            grid-template-columns: 1fr;
          }
          
          .package-section {
            padding: 20px;
            margin-bottom: 40px;
          }
          
          .package-overlay {
            position: static;
            right: auto;
            width: auto;
            background: white;
            backdrop-filter: none;
            border-left: 0;
            padding: 16px;
            transition: none;
          }
          
          .package-card:hover .package-media {
            filter: none;
            transform: none;
          }
          
          .package-card:hover .package-overlay {
            right: auto;
          }
        }

        /* Category Card Styles */
        .category-card-container {
          display: flex;
          justify-content: center;
          margin: 30px 0;
        }

        .category-card-container .category-card {
          max-width: 800px;
        }

        #rooms-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }

        .category-cards-grid {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin: 30px 0;
          align-items: flex-start;
        }

        .category-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          padding: 0;
          max-width: 100%;
          width: 100%;
          transition: box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1), flex-grow 0.4s ease;
          cursor: pointer;
          position: relative;
          overflow: visible;
          display: flex;
          flex-direction: column;
        }

        .category-card.selected {
          box-shadow: 0 12px 40px rgba(56, 182, 255, 0.25);
          outline: 3px solid #38b6ff;
          outline-offset: 0px;
        }

        .category-card:hover {
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        /* Cottages grid - allow horizontal expansion */
        .category-cards-grid .category-card {
          flex: 1;
          min-width: 300px;
          max-width: 400px;
          transition: box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .category-cards-grid .category-card:hover {
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
          z-index: 10;
        }

        .category-content {
          display: flex;
          flex-direction: column;
          gap: 0;
          padding: 20px;
        }

        .category-image {
          width: 100%;
          height: 250px;
          border-radius: 12px 12px 0 0;
          overflow: hidden;
          flex-shrink: 0;
        }

        .category-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }

        .category-card:hover .category-image img {
          transform: scale(1.05);
        }

        .category-info-collapsed {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .category-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .category-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--color-text);
          margin: 0;
          flex: 1;
        }

        .category-price {
          font-size: 24px;
          font-weight: 600;
          color: var(--color-accent);
          white-space: nowrap;
          position: relative;
          z-index: 1;
        }

        .category-meta {
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
          margin-top: 4px;
          line-height: 1.5;
        }

        .category-capacity,
        .category-count,
        .category-discount {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--color-muted);
          font-size: 14px;
          white-space: nowrap;
          height: 24px;
        }

        .category-capacity svg,
        .category-count svg {
          color: var(--color-accent);
        }

        .category-discount {
          color: #b8860b;
          font-weight: 600;
        }

        .category-discount svg {
          color: #b8860b;
        }

        .category-info-expanded {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #e7efef;
          opacity: 0;
          max-height: 0;
          overflow: hidden;
          transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .category-card:hover .category-info-expanded {
          opacity: 1;
          max-height: 800px;
        }

        .category-description {
          color: var(--color-muted);
          line-height: 1.6;
          margin: 0 0 20px 0;
          font-size: 15px;
        }

        .discount-details h4 {
          font-size: 16px;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 12px 0;
        }

        .discount-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          color: var(--color-muted);
          font-size: 14px;
        }

        .discount-item svg {
          color: var(--color-accent);
          flex-shrink: 0;
        }

        .discount-item strong {
          color: var(--color-text);
          font-weight: 600;
        }

        .category-book-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 24px;
          background: var(--color-accent);
          color: white;
          border: none;
          border-radius: 999px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 16px;
        }

        .category-book-btn:hover {
          background: #2a9ce8;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(56, 182, 255, 0.4);
        }

        .category-book-btn:active {
          transform: translateY(0);
        }

        @media (max-width: 1200px) {
          .category-cards-grid .category-card {
            min-width: 280px;
            max-width: 350px;
          }
        }

        @media (max-width: 768px) {
          .category-card {
            padding: 20px;
          }

          .category-image {
            height: 180px;
          }

          .category-cards-grid {
            flex-direction: column;
          }

          .category-title {
            font-size: 22px;
          }

          .category-price {
            font-size: 20px;
          }

          .category-info-expanded {
            max-height: none !important;
            opacity: 1 !important;
            margin-top: 20px;
          }
        }

        /* Room Selection Styles */
        .back-to-calendar-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: var(--color-accent);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .back-to-calendar-btn:hover {
          background: #2a9ce8;
          transform: translateY(-2px);
        }

        .exit-selection-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .exit-selection-btn:hover {
          background: #dc2626;
          transform: translateY(-2px);
        }

        .room-selection-header {
          width: 100%;
          margin-bottom: 30px;
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          justify-content: space-between;
        }

        .room-selection-header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .room-selection-header-right {
          display: flex;
          gap: 12px;
        }

        .room-selection-header > div {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .room-selection-header h4 {
          font-size: 24px;
          font-weight: 700;
          color: var(--color-text);
          margin: 0;
        }

        .room-selection-header p {
          color: var(--color-muted);
          font-size: 14px;
          margin: 0;
        }

        .room-selection-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin: 30px auto;
          max-width: 100%;
        }

        .room-selection-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .room-selection-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }

        .room-selection-card.selected {
          border-color: var(--color-accent);
          background: #f0f9ff;
          box-shadow: 0 8px 24px rgba(56, 182, 255, 0.2);
        }

        .room-card-image {
          position: relative;
          width: 100%;
          height: 200px;
          overflow: hidden;
        }

        .room-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .room-selection-card:hover .room-card-image img {
          transform: scale(1.05);
        }

        .room-selection-indicator {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          background: var(--color-accent);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .room-selection-card.selected .room-selection-indicator {
          opacity: 1;
        }

        .room-selection-indicator svg {
          color: white;
        }

        .room-card-content {
          padding: 20px;
        }

        .room-card-content h4 {
          font-size: 20px;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 8px 0;
        }

        .room-price {
          font-size: 18px;
          font-weight: 600;
          color: var(--color-accent);
          margin: 0 0 16px 0;
        }

        .room-select-btn {
          width: 100%;
          padding: 12px 24px;
          background: var(--color-accent);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .room-select-btn:hover {
          background: #2a9ce8;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(56, 182, 255, 0.4);
        }

        .room-selection-card.selected .room-select-btn {
          background: #2a9ce8;
        }

        .floating-continue-btn {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 16px 32px;
          background: var(--color-accent);
          color: white;
          border: none;
          border-radius: 999px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(56, 182, 255, 0.4);
          transition: all 0.3s ease;
          z-index: 999;
          display: none;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .floating-continue-btn:hover:not(:disabled) {
          background: #2a9ce8;
          transform: translateX(-50%) translateY(-4px);
          box-shadow: 0 12px 32px rgba(56, 182, 255, 0.5);
        }

        .floating-continue-btn:disabled {
          background: #94a3b8;
          cursor: not-allowed;
          transform: translateX(-50%);
        }

        .no-rooms-available {
          text-align: center;
          padding: 60px 20px;
          background: #f8fafc;
          border-radius: 12px;
        }

        .no-rooms-available p {
          font-size: 16px;
          color: var(--color-muted);
          margin-bottom: 24px;
        }

        @media (max-width: 1024px) {
          .room-selection-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .room-selection-grid {
            grid-template-columns: 1fr;
          }

          .room-selection-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .room-selection-header-left,
          .room-selection-header-right {
            width: 100%;
          }

          .floating-continue-btn {
            bottom: 20px;
            left: 20px;
            right: 20px;
            width: auto;
            transform: none;
          }
        }
      </style>
    </section>`;
}

// Initialize category cards after page loads
export function initLuxuryPackages() {
  // Wait for DOM to be ready
  setTimeout(() => {
    // Initialize each section
    initializeCategorySection('rooms', allPackages.rooms);
    initializeCottagesSection('cottages', allPackages.cottages);
    initializeCategorySection('function-halls', allPackages.functionHalls);
    // Prepare function hall container for dynamic availability cards
    if (typeof window.showAvailableFunctionHalls !== 'function') {
      window.showAvailableFunctionHalls = async function(checkin, checkout) {
        const container = document.getElementById('function-halls-container');
        if (!container) return;
        
        console.log('[showAvailableFunctionHalls] 🏛️ Called with checkin:', checkin, 'checkout:', checkout);
        
        // Reset all category states and button before entering function hall selection
        resetFloatingContinueButton();
        
        // Loading state
        container.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--color-muted);">Checking availability...</div>';

        const visitDate = checkin || null; // single day
        window.functionHallVisitDate = visitDate;
        console.log('[showAvailableFunctionHalls] 🏛️ Visit date set to:', visitDate);
        
        let available = [];
        const halls = bookingState.allFunctionHalls || ['Grand Function Hall','Intimate Function Hall'];
        console.log('[showAvailableFunctionHalls] 🏛️ All halls:', halls);
        
        try {
          available = visitDate ? await bookingState.getAvailableFunctionHalls(visitDate) : bookingState.allFunctionHalls;
          console.log('[showAvailableFunctionHalls] ✅ Available halls from API:', available);
        } catch (err) {
          console.error('[showAvailableFunctionHalls] ❌ Error fetching availability:', err);
          available = bookingState.allFunctionHalls || ['Grand Function Hall','Intimate Function Hall'];
          console.log('[showAvailableFunctionHalls] ⚠️ Falling back to all halls:', available);
        }
        container.innerHTML = `
          <div class="fh-wrap" style="width:100%; max-width:1100px; margin:0 auto;">
          <div class="room-selection-header" style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
            <div style="min-width:240px; flex:1 1 auto;">
              <h4 style="margin:0; text-align:left;">Select Your Function Hall</h4>
              <p style="margin:4px 0 0 0; text-align:left;">${visitDate ? `Date: ${visitDate}` : 'Pick a date to view availability'}</p>
            </div>
            <div style="display:flex; gap:10px; flex:0 0 auto;">
              <button class="back-to-calendar-btn" onclick="openCalendarModal('Function Hall Booking', 5, 'function-halls')">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                Change Dates
              </button>
              <button id="fh-exit-btn" class="exit-selection-btn" onclick="handleHallExitOrCancel()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                ${window.selectedHallId ? 'Cancel Selection' : 'Exit'}
              </button>
            </div>
          </div>
          <div class="room-selection-grid" style="grid-template-columns: repeat(2, 1fr);">
            ${halls.filter(hall => {
              const isAvailable = Array.isArray(available) && available.includes(hall);
              console.log(`[showAvailableFunctionHalls] 🏛️ Hall "${hall}": isAvailable=${isAvailable} (available array:`, available, ')');
              if (!isAvailable) {
                console.log(`[showAvailableFunctionHalls] ❌ Filtering out unavailable hall: ${hall}`);
              }
              return isAvailable; // Only include available halls
            }).map(hall => {
              console.log(`[showAvailableFunctionHalls] ✅ Rendering available hall: ${hall}`);
              return `
              <div class="room-selection-card" data-hall-id="${hall}" onclick="toggleHallSelection('${hall}')">
                <div class="room-card-image">
                  <img src="images/Function Hall.JPG" alt="${hall}">
                  <div class="room-selection-indicator">
                    <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\"><path d=\"M20 6L9 17l-5-5\"></path></svg>
                  </div>
                </div>
                <div class="room-card-content">
                  <h4>${hall}</h4>
                  <div class="room-price">${hall.includes('Grand') ? '₱15,000/day' : '₱10,000/day'}</div>
                  <button class="room-select-btn">Select</button>
                </div>
              </div>`;
            }).join('')}
          </div>
          </div>`;

        renderFunctionHallsContinueCTA();
      };
      window.toggleHallSelection = function(hallId) {
        console.log('[toggleHallSelection] 🏛️ Called with hallId:', hallId);
        const cards = document.querySelectorAll('.room-selection-card[data-hall-id]');
        let newlySelected = null;
        cards.forEach(card => {
          const id = card.getAttribute('data-hall-id');
          if (id === hallId) {
            console.log('[toggleHallSelection] ✅ Processing selection for hall:', hallId);
            // Enforce single selection: deselect all first
            cards.forEach(other => other.classList.remove('selected'));
            // Toggle current
            const willSelect = !card.classList.contains('selected');
            if (willSelect) {
              card.classList.add('selected');
              newlySelected = hallId;
              console.log('[toggleHallSelection] ✅ Hall selected:', hallId);
            }
          } else {
            card.classList.remove('selected');
          }
        });
        // Update button labels
        cards.forEach(card => {
          const btn = card.querySelector('.room-select-btn');
          if (btn) btn.textContent = card.classList.contains('selected') ? 'Selected' : 'Select';
        });
        window.selectedHallId = newlySelected;
        console.log('[toggleHallSelection] 🏛️ Final selectedHallId:', window.selectedHallId);
        renderFunctionHallsContinueCTA();
      };

      window.renderFunctionHallsContinueCTA = function() {
        let cta = document.getElementById('floating-continue-btn');
        if (!cta) {
          cta = document.createElement('button');
          cta.id = 'floating-continue-btn';
          cta.className = 'floating-continue-btn';
          document.body.appendChild(cta);
        }
        // Always update button properties (in case it was used by another category)
        console.log('[renderFunctionHallsContinueCTA] Setting function hall handler and text');
        cta.textContent = 'Continue Booking';
        cta.onclick = continueFunctionHallBooking;
        cta.style.display = 'flex';
        cta.disabled = !window.selectedHallId || !window.functionHallVisitDate;
        const exitBtn = document.getElementById('fh-exit-btn');
        if (exitBtn) {
          exitBtn.innerHTML = `
            <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"></line><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"></line></svg>
            ${window.selectedHallId ? 'Cancel Selection' : 'Exit'}
          `;
        }
      };

      window.continueFunctionHallBooking = function() {
        if (!window.selectedHallId || !window.functionHallVisitDate) return;
        if (window.openBookingModal) {
          const preFill = { 
            date: window.functionHallVisitDate,
            hallId: window.selectedHallId,
            hallName: window.selectedHallId // Hall ID is currently the name
          };
          window.openBookingModal('function-hall', 'Function Hall Booking', preFill, false, null, 'function-halls');
        }
      };

      window.cancelHallSelection = function() {
        // Clear selection state and UI
        window.selectedHallId = null;
        const cards = document.querySelectorAll('.room-selection-card[data-hall-id]');
        cards.forEach(card => card.classList.remove('selected'));
        cards.forEach(card => {
          const btn = card.querySelector('.room-select-btn');
          if (btn && !card.classList.contains('unavailable')) btn.textContent = 'Select';
        });
        renderFunctionHallsContinueCTA();
      };

      window.exitHallSelection = function() {
        // Use centralized reset to clear all states
        resetFloatingContinueButton();
        
        // Reset hall view back to category card
        const container = document.getElementById('function-halls-container');
        if (container) {
          container.innerHTML = '<!-- Category card will be inserted here -->';
          setTimeout(() => initializeCategorySection('function-halls', allPackages.functionHalls), 50);
        }
      };

      window.handleHallExitOrCancel = function() {
        if (window.selectedHallId) {
          cancelHallSelection();
        } else {
          exitHallSelection();
        }
      };
    }
  }, 100);
}

// Initialize a specific category section (for single cards)
function initializeCategorySection(sectionId, packages) {
  const container = document.getElementById(`${sectionId}-container`);
  if (!container || !packages || packages.length === 0) return;
  
  // Clear existing content
  container.innerHTML = '';
  
  // Create category data based on section
  let categoryData;
  
  if (sectionId === 'rooms') {
    categoryData = {
      title: 'Standard Room',
      price: '₱5,500/night',
      capacity: 4,
      availableCount: '4 rooms',
      description: 'Comfortable rooms with air conditioning, family-sized bed and private bathroom. All 4 rooms are identically designed with modern amenities and stunning garden views.',
      category: 'rooms',
      image: 'images/kina1.jpg'
    };
  } else if (sectionId === 'function-halls') {
    const hallCount = packages.length;
    const minCapacity = Math.min(...packages.map(p => p.capacity || 100));
    const maxCapacity = Math.max(...packages.map(p => p.capacity || 200));
    
    categoryData = {
      title: 'Function Hall',
      price: '₱10,000 - ₱15,000/day',
      capacity: maxCapacity,
      availableCount: `${hallCount} halls`,
      description: 'Spacious function halls perfect for weddings, conferences, and large events. Includes tables, chairs, sound system, and air conditioning.',
      category: 'function-halls',
      image: 'images/Function Hall.JPG'
    };
  }
  
  // Create and append category card
  const categoryCard = createCategoryCard(categoryData);
  container.appendChild(categoryCard);
}

// Initialize cottages section with individual expandable cards
function initializeCottagesSection(sectionId, packages) {
  const container = document.getElementById(`${sectionId}-container`);
  if (!container || !packages || packages.length === 0) return;
  
  // Clear existing content
  container.innerHTML = '';
  
  // Create individual cards for each cottage
  packages.forEach((cottageData) => {
    const categoryData = {
      title: cottageData.title,
      price: cottageData.price,
      capacity: cottageData.capacity || 6,
      availableCount: '1 cottage',
      description: cottageData.description,
      category: cottageData.category,
      image: cottageData.image
    };
    
    const cottageCard = createCategoryCard(categoryData);
    container.appendChild(cottageCard);
  });

  // Selection UX: click to select, click outside to clear
  const cards = Array.from(container.querySelectorAll('.category-card'));
  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      // Ignore clicks on Book Now button
      if (e.target.closest('.category-book-btn')) return;
      // Toggle selected state on this card; clear others
      cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      // Store selected cottage type
      const title = card.querySelector('.category-title')?.textContent || '';
      window.selectedCottageType = title;
    });
  });

  // Outside click clears selection for cottage cards
  function handleOutsideClick(e) {
    if (!container.contains(e.target)) {
      cards.forEach(c => c.classList.remove('selected'));
      window.selectedCottageType = null;
    }
  }
  // Attach once; remove on hashchange/navigation if needed
  document.addEventListener('click', handleOutsideClick, { capture: true });
}




// Modern search and filter functions
window.filterPackages = function() {
  const searchTerm = document.getElementById('package-search')?.value.toLowerCase() || '';
  const activeTab = document.querySelector('.filter-tab.active');
  const categoryFilter = activeTab?.getAttribute('data-category') || '';
  
  // Show/hide clear button
  const clearBtn = document.querySelector('.clear-search');
  if (clearBtn) {
    clearBtn.style.display = searchTerm ? 'block' : 'none';
  }
  
  // Get all package sections
  const sections = ['rooms', 'cottages', 'function-halls'];
  
  sections.forEach(sectionId => {
    const section = document.getElementById(`${sectionId}-section`);
    const card = section?.querySelector('.category-card');
    
    if (!card) return;
    
    const title = card.querySelector('.category-title')?.textContent.toLowerCase() || '';
    const description = card.querySelector('.category-description')?.textContent.toLowerCase() || '';
    const category = card.getAttribute('data-category') || '';
    
    const matchesSearch = !searchTerm || title.includes(searchTerm) || description.includes(searchTerm);
    const matchesCategory = !categoryFilter || category === categoryFilter;
    
    if (matchesSearch && matchesCategory) {
      section.style.display = 'block';
    } else {
      section.style.display = 'none';
    }
  });
};

// Set active filter tab
window.setActiveFilter = function(button, category) {
  // Remove active class from all tabs
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Add active class to clicked tab
  button.classList.add('active');
  
  // Trigger filter
  filterPackages();
};

// Clear search function
window.clearSearch = function() {
  const searchInput = document.getElementById('package-search');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
    filterPackages();
  }
};

// Centralized function to reset floating continue button and all category states
function resetFloatingContinueButton() {
  console.log('[resetFloatingContinueButton] Resetting all category states and button');
  
  // Clear all category selections
  bookingState.selectedRooms = [];
  bookingState.selectedCottages = [];
  window.selectedHallId = null;
  window.functionHallVisitDate = null;
  
  // Reset button
  const btn = document.getElementById('floating-continue-btn');
  if (btn) {
    btn.style.display = 'none';
    btn.textContent = '';
    btn.onclick = null;
    btn.disabled = false;
    console.log('[resetFloatingContinueButton] Button reset complete');
  }
}

// Show available rooms after date selection
window.showAvailableRooms = async function(checkinDate, checkoutDate) {
  console.log('[showAvailableRooms] Starting with dates:', checkinDate, checkoutDate);
  
  // Reset all category states and button before entering room selection
  resetFloatingContinueButton();
  
  // Exit cottage selection mode if active (only one selection mode at a time)
  const cottagesContainer = document.getElementById('cottages-container');
  const cottagesSection = document.getElementById('cottages-section');
  if (cottagesContainer && cottagesSection) {
    // Check if cottages are in selection mode (showing selection grid)
    const isInSelectionMode = cottagesContainer.querySelector('.cottage-selection-grid');
    if (isInSelectionMode) {
      console.log('[showAvailableRooms] Exiting cottage selection mode');
      
      // Reset to category cards view
      cottagesContainer.innerHTML = '<!-- Category cards will be inserted here -->';
      setTimeout(() => {
        initializeCottagesSection('cottages', allPackages.cottages);
      }, 100);
    }
  }
  
  // Set dates in booking state (now async)
  await bookingState.setDates(checkinDate, checkoutDate);
  
  // Get available rooms from database
  const availableRooms = await bookingState.getAvailableRooms(checkinDate, checkoutDate);
  
  console.log('[showAvailableRooms] Available rooms count:', availableRooms.length, 'Rooms:', availableRooms);
  
  // Find rooms section and replace with room selection view
  const roomsSection = document.getElementById('rooms-section');
  const roomsContainer = document.getElementById('rooms-container');
  
  if (!roomsSection || !roomsContainer) return;
  
  // Build wrapper with header (left message, right actions) and grid below
  roomsContainer.innerHTML = `
    <div class="rooms-wrap" style="width:100%; max-width:1100px; margin:0 auto;">
      <div class="room-selection-header" style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
        <div style="min-width:240px; flex:1 1 auto;">
          <h4 style="margin:0; text-align:left;">Select Your Rooms</h4>
          <p style="margin:4px 0 0 0; text-align:left;">Check-in: ${checkinDate} | Check-out: ${checkoutDate}</p>
        </div>
        <div style="display:flex; gap:10px; flex:0 0 auto;">
          <button class="back-to-calendar-btn" data-action="rooms-change-dates">
            <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><line x1=\"19\" y1=\"12\" x2=\"5\" y2=\"12\"></line><polyline points=\"12 19 5 12 12 5\"></polyline></svg>
            Change Dates
          </button>
          <button id="rooms-exit-btn" class="exit-selection-btn" data-action="rooms-exit">
            <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"></line><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"></line></svg>
            ${(bookingState.selectedRooms||[]).length>0 ? 'Cancel Selection' : 'Exit'}
          </button>
        </div>
      </div>
      <div class="room-selection-grid" id="room-selection-grid" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 20px;"></div>
    </div>
  `;
  
  const roomsGrid = document.getElementById('room-selection-grid');
  
  if (availableRooms.length === 0) {
    // No rooms available
    console.log('[showAvailableRooms] No rooms available, showing message');
    roomsGrid.innerHTML = `
      <div class="no-rooms-available" style="grid-column: 1 / -1; padding: 40px; text-align: center; background: #fff3cd; border-radius: 12px; margin: 20px 0;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#f57c00" stroke-width="2" style="margin: 0 auto 16px;">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        <h3 style="color: #d84315; margin-bottom: 12px;">No Rooms Available</h3>
        <p style="color: #666; margin-bottom: 20px;">All rooms are fully booked for the selected dates (${checkinDate} to ${checkoutDate}).</p>
        <button class="btn" data-action="rooms-change-dates" style="background: #1976d2; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">Try Different Dates</button>
      </div>
    `;
  } else {
    // Create room cards
    availableRooms.forEach(roomId => {
      const roomCard = createRoomSelectionCard(roomId);
      roomsGrid.appendChild(roomCard);
    });
  }
  
  // Bind header buttons
  const changeBtns = roomsContainer.querySelectorAll('[data-action="rooms-change-dates"]');
  changeBtns.forEach(btn => btn.addEventListener('click', () => openCalendarModal('Standard Room', 4, 'rooms')));
  const exitBtn = document.getElementById('rooms-exit-btn');
  if (exitBtn) exitBtn.addEventListener('click', () => handleRoomsExitOrCancel());

  // Add floating continue button
  addFloatingContinueButton();
};

// Create individual room selection card
function createRoomSelectionCard(roomId) {
  const card = document.createElement('div');
  card.className = 'room-selection-card';
  card.setAttribute('data-room-id', roomId);
  card.addEventListener('click', () => toggleRoomSelection(roomId));
  
  card.innerHTML = `
    <div class="room-card-image">
      <img src="images/kina1.jpg" alt="${roomId}" loading="lazy">
      <div class="room-selection-indicator">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <path d="M20 6L9 17l-5-5"></path>
        </svg>
      </div>
    </div>
    <div class="room-card-content">
      <h4>${roomId}</h4>
      <p class="room-price">₱1,500/night</p>
      <button class="room-select-btn">Select Room</button>
    </div>
  `;
  const btn = card.querySelector('.room-select-btn');
  if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); toggleRoomSelection(roomId); });
  
  return card;
}

// Toggle room selection
window.toggleRoomSelection = function(roomId) {
  bookingState.toggleRoom(roomId);
  
  // Update visual state
  const card = document.querySelector(`.room-selection-card[data-room-id="${roomId}"]`);
  if (card) {
    if (bookingState.selectedRooms.includes(roomId)) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  }
  
  // Update continue button
  updateFloatingContinueButton();
};

// Cancel only the current room selections, stay in view
window.cancelRoomSelection = function() {
  bookingState.selectedRooms = [];
  const cards = document.querySelectorAll('.room-selection-card[data-room-id]');
  cards.forEach(card => card.classList.remove('selected'));
  // Reset button labels
  cards.forEach(card => {
    const btn = card.querySelector('.room-select-btn');
    if (btn) btn.textContent = 'Select Room';
  });
  updateFloatingContinueButton();
};

// Handle Exit/Cancel behavior based on selection
window.handleRoomsExitOrCancel = function() {
  if ((bookingState.selectedRooms || []).length > 0) {
    cancelRoomSelection();
  } else {
    exitRoomSelection();
  }
};

// Add floating continue button
function addFloatingContinueButton() {
  // Check if button already exists
  let btn = document.getElementById('floating-continue-btn');
  
  if (!btn) {
    // Create button only once
    btn = document.createElement('button');
    btn.id = 'floating-continue-btn';
    btn.className = 'floating-continue-btn';
    document.body.appendChild(btn);
  }
  
  // Always update the onclick handler for room selection mode
  console.log('[addFloatingContinueButton] Setting onclick handler for ROOM selection mode');
  btn.onclick = function() {
    console.log('[Continue Button] Clicked in ROOM mode with', bookingState.selectedRooms.length, 'rooms');
    if (bookingState.selectedRooms.length > 0) {
      // Open booking modal with selected rooms
      openBookingModal('room', 'Room Booking', {
        checkin: bookingState.dates.checkin,
        checkout: bookingState.dates.checkout,
        selectedRooms: bookingState.selectedRooms,
        fromDateSelection: true
      });
    }
  };
  
  // Show button and update its state
  btn.style.display = 'flex';
  updateFloatingContinueButton();
}

// Update floating continue button text
function updateFloatingContinueButton() {
  const btn = document.getElementById('floating-continue-btn');
  if (btn) {
    const count = bookingState.selectedRooms.length;
    btn.textContent = count > 0 
      ? `Continue with ${count} room${count > 1 ? 's' : ''}` 
      : 'Select at least one room';
    btn.disabled = count === 0;
  }
  const exitBtn = document.getElementById('rooms-exit-btn');
  if (exitBtn) {
    const svgIcon = `<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"></line><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"></line></svg>`;
    exitBtn.innerHTML = `${svgIcon} ${bookingState.selectedRooms.length > 0 ? 'Cancel Selection' : 'Exit'}`;
    // Ensure onclick is still attached
    if (!exitBtn.onclick) {
      exitBtn.onclick = handleRoomsExitOrCancel;
    }
  }
}

// Exit room selection mode and return to standard room card
window.exitRoomSelection = function() {
  // Use centralized reset to clear all states
  resetFloatingContinueButton();
  
  // Reset rooms section to show Standard Room card
  const roomsSection = document.getElementById('rooms-section');
  const roomsContainer = document.getElementById('rooms-container');
  
  if (roomsSection && roomsContainer) {
    roomsContainer.innerHTML = '<!-- Category card will be inserted here -->';
    
    // Re-initialize the section
    setTimeout(() => {
      initializeCategorySection('rooms', allPackages.rooms);
    }, 100);
  }
};

// ==================== COTTAGE SELECTION (SINGLE-DAY BOOKING) ====================

// Fetch detailed availability for cottage selection
async function fetchCottageAvailability(visitDate) {
  try {
    // Normalize date to YYYY-MM-DD format to ensure consistency
    const normalizedDate = normalizeDateInputToYMD(visitDate);
    if (!normalizedDate) {
      console.error('[fetchCottageAvailability] Failed to normalize date:', visitDate);
      throw new Error('Invalid date format');
    }
    
    console.log('[fetchCottageAvailability] Fetching availability for date:', visitDate, '-> normalized:', normalizedDate);
    const { checkAvailability } = await import('../utils/api.js');
    const result = await checkAvailability(1, normalizedDate, normalizedDate, 'cottages', null);
    
    console.log('[fetchCottageAvailability] API Response:', result);
    console.log('[fetchCottageAvailability] dateAvailability:', result?.dateAvailability);
    console.log('[fetchCottageAvailability] Keys in dateAvailability:', result?.dateAvailability ? Object.keys(result.dateAvailability) : 'N/A');
    
    if (result && result.dateAvailability) {
      // Use normalized date as key for lookup
      const dayData = result.dateAvailability[normalizedDate];
      
      if (dayData) {
        console.log('[fetchCottageAvailability] Day Data for', normalizedDate, ':', dayData);
        console.log('[fetchCottageAvailability] Available:', dayData.availableCottages);
        console.log('[fetchCottageAvailability] Booked:', dayData.bookedCottages);
        
        return {
          availableCottages: dayData.availableCottages || [],
          bookedCottages: dayData.bookedCottages || [],
          status: dayData.status,
          availableCount: dayData.availableCount,
          bookedCount: dayData.bookedCount
        };
      } else {
        console.warn('[fetchCottageAvailability] No dayData for', normalizedDate, 'in dateAvailability. Available dates:', Object.keys(result.dateAvailability).join(', '));
      }
    }
    
    // Default: all available (only if no data from API)
    console.warn('[fetchCottageAvailability] No data from API, defaulting to all available');
    return {
      availableCottages: ['Standard Cottage', 'Open Cottage', 'Family Cottage'],
      bookedCottages: [],
      status: 'cottage-available'
    };
  } catch (error) {
    console.error('[fetchCottageAvailability] Error:', error);
    return {
      availableCottages: ['Standard Cottage', 'Open Cottage', 'Family Cottage'],
      bookedCottages: [],
      status: 'cottage-available'
    };
  }
}

// Show available cottages after date selection
window.showAvailableCottages = async function(visitDate) {
  console.log('[showAvailableCottages] Starting with date:', visitDate);
  
  // Reset all category states and button before entering cottage selection
  resetFloatingContinueButton();
  
  // Exit room selection mode if active (only one selection mode at a time)
  const roomsContainer = document.getElementById('rooms-container');
  const roomsSection = document.getElementById('rooms-section');
  if (roomsContainer && roomsSection) {
    // Check if rooms are in selection mode (not showing category card)
    const isInSelectionMode = roomsContainer.querySelector('.room-selection-grid');
    if (isInSelectionMode) {
      console.log('[showAvailableCottages] Exiting room selection mode');
      
      // Reset to category card view
      roomsContainer.innerHTML = '<!-- Category card will be inserted here -->';
      setTimeout(() => {
        initializeCategorySection('rooms', allPackages.rooms);
      }, 100);
      
      // Hide floating button if present
      const floatingBtn = document.getElementById('floating-continue-btn');
      if (floatingBtn) {
        floatingBtn.style.display = 'none';
      }
    }
  }
  
  // Set dates in booking state (use same date for check-in/check-out for single-day bookings)
  await bookingState.setDates(visitDate, visitDate);
  
  // Fetch full availability data (both available and booked)
  const availabilityData = await fetchCottageAvailability(visitDate);
  const availableCottages = availabilityData.availableCottages || [];
  const bookedCottages = availabilityData.bookedCottages || [];
  const allCottages = ['Standard Cottage', 'Open Cottage', 'Family Cottage'];
  
  console.log('='.repeat(60));
  console.log('[showAvailableCottages] RENDERING COTTAGE SELECTION');
  console.log('[showAvailableCottages] Visit Date:', visitDate);
  console.log('[showAvailableCottages] Available Cottages:', availableCottages);
  console.log('[showAvailableCottages] Booked Cottages:', bookedCottages);
  console.log('[showAvailableCottages] Will render', availableCottages.length, 'cards');
  console.log('='.repeat(60));
  
  // Find cottages section and replace with cottage selection view
  const cottagesSection = document.getElementById('cottages-section');
  const cottagesContainer = document.getElementById('cottages-container');
  
  if (!cottagesSection || !cottagesContainer) return;
  
  // Build wrapper with header (left message, right actions) and grid below
  cottagesContainer.innerHTML = `
    <div class="cottages-wrap" style="width:100%; max-width:1100px; margin:0 auto;">
      <div class="cottage-selection-header" style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
        <div style="min-width:240px; flex:1 1 auto;">
          <h4 style="margin:0; text-align:left;">Select Your Cottages</h4>
          <p style="margin:4px 0 0 0; text-align:left;">Visit Date: ${visitDate}</p>
        </div>
        <div style="display:flex; gap:10px; flex:0 0 auto;">
          <button class="back-to-calendar-btn" onclick="openCalendarModal('Cottage Booking', 8, 'cottages')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Change Date
          </button>
          <button id="cottages-exit-btn" class="exit-selection-btn" onclick="handleCottagesExitOrCancel()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ${(bookingState.selectedCottages||[]).length>0 ? 'Cancel Selection' : 'Exit'}
          </button>
        </div>
      </div>
      <div class="cottage-selection-grid room-selection-grid" id="cottage-selection-grid" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 20px;"></div>
    </div>
  `;
  
  const cottagesGrid = document.getElementById('cottage-selection-grid');
  
  if (availableCottages.length === 0) {
    // No cottages available
    console.log('[showAvailableCottages] No cottages available, showing message');
    cottagesGrid.innerHTML = `
      <div class="no-cottages-available" style="grid-column: 1 / -1; padding: 40px; text-align: center; background: #fff3cd; border-radius: 12px; margin: 20px 0;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#f57c00" stroke-width="2" style="margin: 0 auto 16px;">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        <h3 style="color: #d84315; margin-bottom: 12px;">All Cottages Fully Booked</h3>
        <p style="color: #666; margin-bottom: 20px;">All cottages are fully booked for ${visitDate}.</p>
        <button class="btn" onclick="openCalendarModal('Cottage Booking', 8, 'cottages')" style="background: #1976d2; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">Try Different Date</button>
      </div>
    `;
  } else {
    // Add availability summary before cards if some cottages are booked
    if (bookedCottages.length > 0) {
      const summaryDiv = document.createElement('div');
      summaryDiv.className = 'availability-summary';
      summaryDiv.style.cssText = 'width: 100%; flex-basis: 100%; text-align: center; padding: 12px; background: #e3f2fd; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #2196f3;';
      summaryDiv.innerHTML = `
        <p style="margin: 0; color: #1976d2; font-weight: 500;">
          📊 ${availableCottages.length} of ${allCottages.length} cottages available for ${visitDate}
        </p>
      `;
      cottagesGrid.appendChild(summaryDiv);
    }
    
    // Check if there's a preselected cottage type
    const preselectedType = window.preselectedCottageType;
    
    // Create cottage cards for ONLY AVAILABLE cottages
    availableCottages.forEach((cottageId, index) => {
      console.log(`[showAvailableCottages] Rendering card ${index + 1}/${availableCottages.length}: ${cottageId}`);
      const cottageCard = createCottageSelectionCard(cottageId);
      cottagesGrid.appendChild(cottageCard);
      
      // Auto-select if this matches the preselected type
      if (preselectedType && cottageId === preselectedType) {
        console.log('[showAvailableCottages] Auto-selecting preselected cottage:', cottageId);
        setTimeout(() => {
          toggleCottageSelection(cottageId);
        }, 100);
      }
    });
    
    console.log('[showAvailableCottages] ✓ Rendered', availableCottages.length, 'cottage cards');
    
    // Clear the preselected type after processing
    if (preselectedType) {
      delete window.preselectedCottageType;
    }
  }
  
  // Add floating continue button
  addFloatingCottageContinueButton();
};

// Create individual cottage selection card
function createCottageSelectionCard(cottageId) {
  const card = document.createElement('div');
  card.className = 'cottage-selection-card room-selection-card';
  card.setAttribute('data-cottage-id', cottageId);
  card.setAttribute('onclick', `toggleCottageSelection('${cottageId}')`);
  
  // Determine image and price based on cottage type
  let imageUrl = 'images/cottage_1.JPG';
  let price = '₱9,500/day';
  
  if (cottageId.includes('Garden')) {
    imageUrl = 'images/cottage_2.JPG';
    price = '₱7,500/day';
  } else if (cottageId.includes('Family')) {
    imageUrl = 'images/kina1.jpg';
    price = '₱10,200/day';
  }
  
  card.innerHTML = `
    <div class="room-card-image">
      <img src="${imageUrl}" alt="${cottageId}" loading="lazy">
      <div class="room-selection-indicator">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <path d="M20 6L9 17l-5-5"></path>
        </svg>
      </div>
    </div>
    <div class="room-card-content">
      <h4>${cottageId}</h4>
      <p class="room-price">${price}</p>
      <button class="room-select-btn cottage-select-btn" onclick="event.stopPropagation(); toggleCottageSelection('${cottageId}')">Select Cottage</button>
    </div>
  `;
  
  return card;
}

// Toggle cottage selection
window.toggleCottageSelection = function(cottageId) {
  console.log('[toggleCottageSelection] Toggling:', cottageId);
  console.log('[toggleCottageSelection] Before toggle:', bookingState.selectedCottages);
  
  bookingState.toggleCottage(cottageId);
  
  console.log('[toggleCottageSelection] After toggle:', bookingState.selectedCottages);
  
  // Update visual state
  const card = document.querySelector(`.cottage-selection-card[data-cottage-id="${cottageId}"]`);
  if (card) {
    if (bookingState.selectedCottages.includes(cottageId)) {
      card.classList.add('selected');
      console.log('[toggleCottageSelection] Card marked as selected');
    } else {
      card.classList.remove('selected');
      console.log('[toggleCottageSelection] Card selection removed');
    }
  } else {
    console.warn('[toggleCottageSelection] Card element not found for:', cottageId);
  }
  
  // Update continue button
  console.log('[toggleCottageSelection] Calling updateFloatingCottageContinueButton()');
  updateFloatingCottageContinueButton();
};

// Cancel only the current cottage selections, stay in view
window.cancelCottageSelection = function() {
  console.log('='.repeat(60));
  console.log('[cancelCottageSelection] CLEARING SELECTIONS');
  console.log('[cancelCottageSelection] Date will be kept:', bookingState.dates.checkin);
  console.log('[cancelCottageSelection] Current selections before clear:', bookingState.selectedCottages);
  
  // Clear selection state
  bookingState.selectedCottages = [];
  console.log('[cancelCottageSelection] Selections cleared, now:', bookingState.selectedCottages);
  
  // Remove selection indicators from UI
  const cards = document.querySelectorAll('.cottage-selection-card[data-cottage-id]');
  console.log('[cancelCottageSelection] Updating', cards.length, 'cottage cards UI');
  cards.forEach(card => {
    card.classList.remove('selected');
    const btn = card.querySelector('.cottage-select-btn');
    if (btn) btn.textContent = 'Select Cottage';
  });
  
  // Hide floating continue button (don't remove it)
  const floatingBtn = document.getElementById('floating-continue-btn');
  if (floatingBtn) {
    console.log('[cancelCottageSelection] Hiding continue button');
    floatingBtn.style.display = 'none';
  } else {
    console.warn('[cancelCottageSelection] Continue button not found in DOM');
  }
  
  // Update exit button label (keep onclick handler intact)
  const exitBtn = document.getElementById('cottages-exit-btn');
  if (exitBtn) {
    const svgIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    exitBtn.innerHTML = `${svgIcon} Exit`;
    // Ensure onclick is still attached
    if (!exitBtn.onclick) {
      exitBtn.onclick = handleCottagesExitOrCancel;
    }
  }
  
  console.log('[cancelCottageSelection] ✓ Cancel complete, staying in selection view');
  console.log('='.repeat(60));
};

// Handle Exit/Cancel behavior based on selection
window.handleCottagesExitOrCancel = function() {
  const selectionCount = (bookingState.selectedCottages || []).length;
  console.log('[handleCottagesExitOrCancel] Current selections:', selectionCount);
  
  if (selectionCount > 0) {
    console.log('[handleCottagesExitOrCancel] -> Calling cancelCottageSelection() (clear selections, stay in view)');
    cancelCottageSelection();
  } else {
    console.log('[handleCottagesExitOrCancel] -> Calling exitCottageSelection() (return to calendar)');
    exitCottageSelection();
  }
};

// Add floating continue button for cottages
function addFloatingCottageContinueButton() {
  // Check if button already exists
  let btn = document.getElementById('floating-continue-btn');
  
  if (!btn) {
    // Create button only once
    btn = document.createElement('button');
    btn.id = 'floating-continue-btn';
    btn.className = 'floating-continue-btn';
    document.body.appendChild(btn);
  }
  
  // Always update the onclick handler for cottage selection mode
  console.log('[addFloatingCottageContinueButton] Setting onclick handler for COTTAGE selection mode');
  btn.onclick = function() {
    console.log('[Continue Button] Clicked in COTTAGE mode with', bookingState.selectedCottages.length, 'cottages');
    if (bookingState.selectedCottages.length > 0) {
      // Open booking modal with selected cottages
      openBookingModal('cottage', 'Cottage Booking', {
        date: bookingState.dates.checkin, // Single day booking
        selectedCottages: bookingState.selectedCottages,
        fromDateSelection: true
      });
    }
  };
  
  // Show button and update its state
  btn.style.display = 'flex';
  updateFloatingCottageContinueButton();
}

// Update floating continue button text for cottages
function updateFloatingCottageContinueButton() {
  console.log('[updateFloatingCottageContinueButton] Current selections:', bookingState.selectedCottages);
  
  const btn = document.getElementById('floating-continue-btn');
  if (btn) {
    const count = bookingState.selectedCottages.length;
    
    if (count > 0) {
      // Show button with selection count
      btn.textContent = `Continue with ${count} cottage${count > 1 ? 's' : ''}`;
      btn.disabled = false;
      btn.style.display = 'flex';
      console.log('[updateFloatingCottageContinueButton] Showing button with', count, 'selections');
    } else {
      // Hide button when no selections
      btn.style.display = 'none';
      console.log('[updateFloatingCottageContinueButton] Hiding button (no selections)');
    }
  } else {
    console.warn('[updateFloatingCottageContinueButton] Button element not found in DOM');
  }
  
  // Update exit button label (preserve onclick handler)
  const exitBtn = document.getElementById('cottages-exit-btn');
  if (exitBtn) {
    const svgIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    exitBtn.innerHTML = `${svgIcon} ${bookingState.selectedCottages.length > 0 ? 'Cancel Selection' : 'Exit'}`;
    // Ensure onclick is still attached
    if (!exitBtn.onclick) {
      exitBtn.onclick = handleCottagesExitOrCancel;
    }
  }
}

// Exit cottage selection mode and return to cottage category card
window.exitCottageSelection = function() {
  console.log('[exitCottageSelection] Exiting cottage selection, returning to category card');
  
  // Use centralized reset to clear all states
  resetFloatingContinueButton();
  
  // Reset cottages section to show category cards
  const cottagesSection = document.getElementById('cottages-section');
  const cottagesContainer = document.getElementById('cottages-container');
  
  if (cottagesSection && cottagesContainer) {
    cottagesContainer.innerHTML = '<!-- Category cards will be inserted here -->';
    
    // Re-initialize the cottages section (uses multiple cards, not single category card)
    setTimeout(() => {
      initializeCottagesSection('cottages', allPackages.cottages);
    }, 100);
  }
  
  console.log('[exitCottageSelection] ✓ Returned to cottage category cards');
};


