// FrontendAI OS — Background Service Worker (MV3)
// Handles side panel, commands, install

const isChrome = typeof chrome !== 'undefined';

if (isChrome && chrome.sidePanel) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[FrontendAI OS] Installed');
  // Set side panel enabled
  if (chrome.sidePanel) {
    try {
      await chrome.sidePanel.setOptions({ enabled: true });
    } catch {}
  }
});

chrome.commands?.onCommand.addListener(async (command) => {
  if (command === 'toggle-os') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    // Try side panel first
    if (chrome.sidePanel) {
      try {
        await chrome.sidePanel.open({ tabId: tab.id });
        return;
      } catch {}
    }
    // Fallback: inject toggle
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OS' }).catch(() => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.dispatchEvent(new CustomEvent('frontendai-toggle'))
      }).catch(() => {});
    });
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  // If sidePanel behavior is openPanelOnActionClick, this won't fire when sidePanel exists
  // But as fallback, toggle content script
  if (!tab.id) return;
  if (chrome.sidePanel) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
      return;
    } catch {}
  }
  chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OS' }).catch(() => {});
});

// Handle messages from content/popup/sidepanel
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'OPEN_SIDE_PANEL') {
    if (chrome.sidePanel && sender.tab?.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id }).then(() => sendResponse({ ok: true })).catch(e => sendResponse({ ok: false, error: e.message }));
      return true;
    }
  }
  if (msg.type === 'GET_SETTINGS') {
    chrome.storage.local.get(['frontendai_settings']).then(res => sendResponse(res.frontendai_settings || {})).catch(() => sendResponse({}));
    return true;
  }
  if (msg.type === 'SET_SETTINGS') {
    chrome.storage.local.set({ frontendai_settings: msg.settings }).then(() => sendResponse({ ok: true }));
    return true;
  }
});
