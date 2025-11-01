export async function AboutPage() {
  return `
    <section class="about-hero">
      <div class="container">
        <h1>About Kina Resort</h1>
      </div>
    </section>

    <section class="about-content">
      <div class="container">
        <h2>Our Story</h2>
        <p>Nestled along the pristine shores of the Island Province, Kina Resort has been welcoming guests to experience the perfect blend of tropical serenity and modern comfort since our founding. We believe that every guest deserves an authentic island experience that rejuvenates the soul while providing all the conveniences of contemporary living.</p>
      </div>
    </section>

    <section class="about-content">
      <div class="container">
        <h2>What you can expect at Kina Resort</h2>
        
        <div class="about-features">
          <div class="feature-item">
            <h3>🏖️ Beachfront Access</h3>
            <p>Direct access to pristine beaches with crystal-clear waters</p>
          </div>
          <div class="feature-item">
            <h3>🏊 Infinity Pool</h3>
            <p>Our signature infinity pool offers panoramic ocean views</p>
          </div>
          <div class="feature-item">
            <h3>🏠 Beachfront Cottages</h3>
            <p>Modern accommodations with direct beach access</p>
          </div>
          <div class="feature-item">
            <h3>🌴 Tropical Gardens</h3>
            <p>Lush native palms and tropical vegetation throughout</p>
          </div>
        </div>
      </div>
    </section>

    <section class="about-content">
      <div class="container">
        <h2>Guest Experience</h2>
        <p>We believe that exceptional hospitality is about creating moments that matter. From the moment you arrive, our dedicated team is committed to ensuring your stay exceeds expectations.</p>
      </div>
    </section>

    <section class="about-content">
      <div class="container">
        <h2>Our Commitment to Sustainability</h2>
        <p>Kina Resort is committed to preserving the natural beauty of our island home. We implement eco-friendly practices throughout our operations and work closely with local communities to ensure sustainable tourism.</p>
      </div>
    </section>

    <section class="about-content">
      <div class="container">
        <h2>Plan Your Visit</h2>
        <p>Ready to experience the magic of Kina Resort? We're here to help you plan the perfect tropical getaway.</p>
        
        <div class="cta-buttons">
          <a class="btn primary" href="#/rooms">Book Your Stay</a>
          <a class="btn hollow" href="#/packages">View Packages</a>
        </div>
      </div>
    </section>

    <style>
      .about-hero {
        padding: 100px 20px 0px 20px;
        text-align: center;
        background: white;
        padding-block: 0 !important;
        margin: 0;
      }

      .about-hero .container {
        max-width: 800px;
        margin: 0 auto;
        margin-bottom: 40px;
      }

      .about-hero h1 {
        font-size: clamp(36px, 6vw, 56px);
        font-weight: 700;
        margin: 0 0 20px 0;
        color: var(--color-text);
        position: relative;
        display: inline-block;
      }

      .about-hero h1::after {
        content: '';
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 100px;
        height: 3px;
        background: #ffd700;
        border-radius: 2px;
      }

      .about-subtitle {
        font-size: clamp(16px, 2.5vw, 20px);
        margin: 0;
        opacity: 0.9;
        font-weight: 400;
      }

      .about-content {
        padding: 0 20px;
        margin-bottom: 12px;
        background: #f8f9fa;
        position: relative;
        z-index: 1;
      }

      .about-content .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 0;
      }

      .about-content h2 {
        font-size: clamp(20px, 3vw, 28px);
        margin: 0 0 15px;
        color: var(--color-text);
        position: relative;
        display: block;
        text-align: left;
        width: 100%;
      }

      .about-content h2::after {
        content: '';
        position: absolute;
        bottom: -8px;
        left: 0;
        width: 100px;
        height: 3px;
        background: #ffd700;
        border-radius: 2px;
      }

      .about-content p {
        font-size: 16px;
        line-height: 1.6;
        margin: 0 0 20px;
        color: var(--color-text-secondary);
        text-align: left;
      }

      .about-features {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 15px;
        margin: 20px 0;
      }

      .feature-item {
        background: white;
        padding: 20px;
        border-radius: 12px;
        border: 2px solid #e2e8f0;
        text-align: left;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
      }

      .feature-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border-color: var(--color-accent);
      }

      .feature-item h3 {
        font-size: 16px;
        margin: 0 0 8px;
        color: var(--color-accent);
      }

      .feature-item p {
        margin: 0;
        color: var(--color-muted);
        font-size: 14px;
        line-height: 1.4;
      }

      .cta-buttons {
        display: flex;
        gap: 12px;
        justify-content: center;
        margin: 20px 0;
        flex-wrap: wrap;
      }

      .cta-buttons .btn {
        min-width: 140px;
      }

      @media (max-width: 768px) {
        .about-hero {
          padding: 80px 15px 0px 15px;
        }

        .about-content {
          padding: 0 15px;
          margin-bottom: 12px;
        }

        .about-features {
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .cta-buttons {
          flex-direction: column;
          align-items: center;
        }

        .cta-buttons .btn {
          width: 100%;
          max-width: 250px;
        }
      }
    </style>
  `;
}
