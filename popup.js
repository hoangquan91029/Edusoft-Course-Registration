'use strict';
document.getElementById('open').addEventListener('click', async () => {
  try { await chrome.tabs.create({url: chrome.runtime.getURL('dashboard.html')}); window.close(); }
  catch { document.getElementById('status').textContent = 'Không mở được tab. Hãy thử lại.'; }
});
