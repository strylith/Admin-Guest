export function setBusy(isBusy){
  const root = document.getElementById('loader-root');
  if(!root) return;
  if(isBusy){
    root.setAttribute('aria-busy', 'true');
    root.removeAttribute('hidden');
    root.innerHTML = '<div class="spinner" role="status" aria-label="Loading"></div>';
  } else {
    root.setAttribute('aria-busy', 'false');
    root.setAttribute('hidden', '');
    root.innerHTML = '';
  }
}


