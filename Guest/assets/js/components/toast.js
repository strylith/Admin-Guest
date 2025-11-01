export function showToast(message, variant = 'info', timeoutMs = 3000){
  const root = document.getElementById('toast-root');
  if(!root) return;
  const el = document.createElement('div');
  el.className = `toast ${variant}`;
  el.role = 'status';
  el.innerText = message;
  root.appendChild(el);
  window.setTimeout(() => el.remove(), timeoutMs);
}


