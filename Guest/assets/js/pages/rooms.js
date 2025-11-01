import { showToast } from '../components/toast.js';
import { openModal } from '../components/modal.js';

const mockRooms = [
  { id:'r1', title:'Deluxe King', price:6500, img:'images/kina1.jpg', amenities:['King bed','Sea view','Breakfast'] },
  { id:'r2', title:'Twin Garden', price:5200, img:'images/kina2.jpg', amenities:['Twin beds','Garden view','Wi‑Fi'] },
  { id:'r3', title:'Suite Oceanfront', price:9800, img:'images/kina3.jpg', amenities:['Suite','Oceanfront','Balcony'] },
];

export async function RoomsPage(){
  window.kinaSearchRooms = (e) => {
    e?.preventDefault?.();
    const checkIn = document.querySelector('input[name="checkin"]').value;
    const checkOut = document.querySelector('input[name="checkout"]').value;
    if(checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)){
      showToast('Checkout must be after check-in','error');
      return;
    }
    showToast('Availability updated', 'success');
  };

  window.kinaBookRoom = (id) => {
    const room = mockRooms.find(r => r.id===id);
    if(!room) return;
    openModal(`
      <h3 style=\"margin-top:0\">Book ${room.title}</h3>
      <p style=\"color:var(--color-muted)\">₱${room.price.toLocaleString()} / night</p>
      <form onsubmit=\"event.preventDefault();document.querySelector('.modal').remove();location.hash='#/checkout'\">
        <div class=\"form-row\">
          <div><label>Check-in</label><input class=\"input\" type=\"date\" required></div>
          <div><label>Check-out</label><input class=\"input\" type=\"date\" required></div>
          <div><label>Guests</label><input class=\"input\" type=\"number\" min=\"1\" value=\"2\" required></div>
        </div>
        <div style=\"margin-top:12px;display:flex;gap:8px\"><button class=\"btn primary\" type=\"submit\">Proceed to Checkout</button><button class=\"btn\" type=\"button\" onclick=\"document.querySelector('.modal').remove()\">Cancel</button></div>
      </form>
    `);
  };

  const search = `
    <div class=\"search-section\" style=\"padding: 40px 0; margin: -20px -20px 40px -20px; border-radius: 0 0 20px 20px; background: linear-gradient(135deg, var(--color-accent) 0%, #2c5aa0 100%); position: relative; overflow: hidden;\">
      <div style=\"position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('images/kina1.jpg') center/cover; opacity: 0.1; z-index: 0;\"></div>
      <div class=\"container\" style=\"max-width: 800px; position: relative; z-index: 1;\">
        <form class=\"form\" onsubmit=\"kinaSearchRooms(event)\" style=\"background: white; border-radius: 16px; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);\">
          <div class=\"form-row\">
            <div class=\"form-group\">
              <label>Check-in</label>
              <input class=\"input\" type=\"date\" name=\"checkin\" min=\"${new Date().toISOString().split('T')[0]}\" required>
            </div>
            <div class=\"form-group\">
              <label>Check-out</label>
              <input class=\"input\" type=\"date\" name=\"checkout\" min=\"${new Date().toISOString().split('T')[0]}\" required>
            </div>
          </div>
          <div class=\"form-row\">
            <div class=\"form-group\">
              <label>Guests</label>
              <input class=\"input\" type=\"number\" name=\"guests\" placeholder=\"2\" min=\"1\" max=\"8\" required>
            </div>
            <div class=\"form-group search-group\">
              <button class=\"btn primary search-btn\" type=\"submit\">Search Availability</button>
            </div>
          </div>
        </form>
      </div>
    </div>`;

  const cards = mockRooms.map(r => `
    <article class=\"room-card\" style=\"background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); transition: transform 0.3s ease, box-shadow 0.3s ease; position: relative;\">
      <div style=\"aspect-ratio:16/10;background:url('${r.img}') center/cover; position: relative; overflow: hidden;\">
        <div style=\"position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,0.9); backdrop-filter: blur(8px); padding: 6px 12px; border-radius: 20px; font-weight: 600; color: var(--color-text);\">₱${r.price.toLocaleString()}/night</div>
      </div>
      <div style=\"padding: 20px;\">
        <h3 style=\"margin: 0 0 12px; font-size: 24px; color: var(--color-text); position: relative;\">${r.title}</h3>
        <div style=\"color: var(--color-muted); margin-bottom: 16px; line-height: 1.5;\">${r.amenities.join(' • ')}</div>
        <div style=\"display: flex; flex-direction: column; gap: 16px; margin-top: 16px;\">
          <div style=\"display: flex; gap: 8px; flex-wrap: wrap;\">
            ${r.amenities.map(amenity => `<span style=\"background: var(--color-bg); color: var(--color-text); padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;\">${amenity}</span>`).join('')}
          </div>
          <button class=\"btn primary room-book-btn\" onclick=\"kinaBookRoom('${r.id}')\">Book Now</button>
        </div>
      </div>
    </article>`).join('');

  return `
    <section class=\"container\">
      ${search}
      <div class=\"section-head\" style=\"text-align: center; margin: 40px 0 30px;\">
        <h2 style=\"font-size: 36px; margin: 0; color: var(--color-text);\">Available Rooms</h2>
        <p style=\"color: var(--color-muted); margin: 8px 0 0; font-size: 18px;\">Choose from our selection of premium accommodations</p>
      </div>
      <div class=\"rooms-grid\" style=\"display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 24px; margin-top: 30px;\">
        ${cards}
      </div>
      <style>
        .room-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }
        .room-book-btn {
          font-weight: 600;
          padding: 12px 24px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          text-align: center;
        }
        .room-card .btn.primary:hover {
          background-color: #ffed4e;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        .search-section {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, var(--color-accent) 0%, #2c5aa0 100%);
        }
        .search-section .input {
          height: 40px;
          padding: 8px 12px;
          font-size: 14px;
          border-radius: 6px;
          border: 1px solid var(--border);
          transition: all 0.2s ease;
        }
        .search-section .input:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px rgba(56, 182, 255, 0.1);
          outline: none;
        }
        .search-section .btn.primary {
          height: 40px;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 500;
          border-radius: 6px;
          min-width: 140px;
        }
        
        /* Dashboard form styling */
        .search-section .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        
        .search-section .form-group {
          display: flex;
          flex-direction: column;
        }
        
        .search-section .form-group label {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text);
          margin-bottom: 8px;
        }
        
        .search-section .search-group {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }
        
        .search-section .search-btn {
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

        /* Mobile responsiveness for search form */
        @media (max-width: 768px) {
          .search-section .form-row {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .search-section .form-group input {
            font-size: 16px; /* Prevents zoom on iOS */
          }

          .search-section .search-btn {
            height: 44px;
            font-size: 16px;
          }
        }

        @media (max-width: 480px) {
          .search-section {
            padding: 20px 0;
            margin: -20px -12px 20px -12px;
          }

          .search-section .form {
            padding: 16px;
            margin: 0 8px;
          }

          .search-section .form-group input {
            padding: 12px;
            font-size: 16px;
          }

          .search-section .search-btn {
            height: 48px;
            font-size: 16px;
          }
        }
        .search-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('assets/images/kina1.jpg') center/cover;
          opacity: 0.1;
          z-index: 0;
        }
        .search-section .container {
          position: relative;
          z-index: 1;
        }
        @media (max-width: 768px) {
          .rooms-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </section>`;
}


