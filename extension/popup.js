// Popup logic
document.getElementById('openSidePanel')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (chrome.sidePanel && tab?.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
    window.close();
  } else {
    // Fallback: inject
    chrome.tabs.sendMessage(tab.id, { type: 'OPEN_OS' });
    window.close();
  }
});

document.getElementById('injectOrb')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OS' }).catch(() => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.dispatchEvent(new CustomEvent('frontendai-toggle'))
      });
    });
    window.close();
  }
});

document.getElementById('openPWA')?.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') });
});

// Load memory count from storage
try {
  chrome.storage.local.get(['frontendai_settings'], (res) => {
    // Try to get from IDB? For now show placeholder
  });
  // Try to query IDB via content script?
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { type: 'GET_MEM_COUNT' }, (res) => {
      if (res?.count) {
        document.getElementById('memCount').textContent = res.count;
      }
    });
  });
} catch {}
