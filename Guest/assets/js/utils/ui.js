import { showToast } from '../components/toast.js';

export function showSuccess(message) {
  if (typeof showToast === 'function') {
    showToast(message, 'success');
  } else {
    alert(message);
  }
}

export function showError(message) {
  if (typeof showToast === 'function') {
    showToast(message, 'error');
  } else {
    alert(message);
  }
}



