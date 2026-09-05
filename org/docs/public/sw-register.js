// Service worker registration — progressive enhancement only. The page is
// complete without it (plan §6b). Kept as a static same-origin file so the CSP
// stays `script-src 'self'` with no nonce and no hash.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/service-worker.js', { scope: '/', updateViaCache: 'none' })
    .catch(() => {});
}
