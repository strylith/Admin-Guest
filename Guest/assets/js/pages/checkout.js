export async function CheckoutPage(){
  return `
    <section class=\"container\">
      <div class=\"section-head\"><h2>Checkout</h2></div>
      <form class=\"form\" onsubmit=\"event.preventDefault();showToast('Payment successful (demo)', 'success');location.hash='#/rooms'\">
        <div class=\"form-row\">
          <div style=\"min-width:260px\"><label>Full Name</label><input class=\"input\" required></div>
          <div style=\"min-width:260px\"><label>Email</label><input class=\"input\" type=\"email\" required></div>
        </div>
        <div class=\"form-row\">
          <div style=\"min-width:260px\"><label>Card Number</label><input class=\"input\" inputmode=\"numeric\" placeholder=\"4242 4242 4242 4242\" required></div>
          <div><label>Expiry</label><input class=\"input\" placeholder=\"MM/YY\" required></div>
          <div><label>CVC</label><input class=\"input\" placeholder=\"CVC\" required></div>
        </div>
        <div style=\"margin-top:12px\"><button class=\"btn primary\" type=\"submit\">Pay Now</button></div>
      </form>
    </section>`;
}


