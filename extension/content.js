// FrontendAI OS — Content Script
// Injects floating orb into any page, opens OS as overlay or side panel

(function() {
  if (window.__FRONTENDAI_INJECTED__) return;
  window.__FRONTENDAI_INJECTED__ = true;

  const EXT_ORIGIN = (typeof chrome !== 'undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL('').replace(/\/$/, '') : '';
  const OS_URL = EXT_ORIGIN ? `${EXT_ORIGIN}/sidepanel.html` : 'https://frontendai-os.pages.dev'; // fallback to PWA URL

  let isOpen = false;
  let iframeContainer = null;
  let backdrop = null;
  let orb = null;

  function createOrb() {
    if (document.getElementById('frontendai-orb')) return;

    orb = document.createElement('button');
    orb.id = 'frontendai-orb';
    orb.title = 'FrontendAI OS (Ctrl+Shift+O)';
    orb.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a10 10 0 0 0-9.95 9h11.64L9.74 7.05a10 10 0 0 0 2.26-5.05z"/>
        <path d="M12 2a10 10 0 0 1 9.95 9h-11.64L14.26 7.05A10 10 0 0 0 12 2z"/>
        <path d="M2.05 11a10 10 0 0 0 9.95 11v-11H2.05z"/>
        <path d="M21.95 11a10 10 0 0 1-9.95 11v-11h9.95z"/>
      </svg>
    `;
    orb.addEventListener('click', toggleOS);
    document.documentElement.appendChild(orb);
  }

  function createUI() {
    if (document.getElementById('frontendai-iframe-container')) return;

    backdrop = document.createElement('div');
    backdrop.id = 'frontendai-backdrop';
    backdrop.addEventListener('click', closeOS);
    document.documentElement.appendChild(backdrop);

    iframeContainer = document.createElement('div');
    iframeContainer.id = 'frontendai-iframe-container';
    
    const iframe = document.createElement('iframe');
    iframe.id = 'frontendai-iframe';
    iframe.src = OS_URL + '?embedded=1';
    iframe.allow = 'clipboard-read; clipboard-write; microphone; camera; display-capture';
    iframeContainer.appendChild(iframe);
    document.documentElement.appendChild(iframeContainer);
  }

  function openOS() {
    createUI();
    requestAnimationFrame(() => {
      iframeContainer.classList.add('open');
      backdrop.classList.add('open');
      isOpen = true;
      document.body.style.overflow = 'hidden';
    });
  }

  function closeOS() {
    if (!iframeContainer) return;
    iframeContainer.classList.remove('open');
    backdrop.classList.remove('open');
    isOpen = false;
    document.body.style.overflow = '';
  }

  function toggleOS() {
    if (isOpen) closeOS();
    else {
      // Try side panel first if available
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' }, (res) => {
          if (chrome.runtime.lastError || !res?.ok) {
            openOS();
          }
        });
      } else {
        openOS();
      }
    }
  }

  // Listen for toggle events
  window.addEventListener('frontendai-toggle', toggleOS);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      toggleOS();
    }
    if (e.key === 'Escape' && isOpen) {
      closeOS();
    }
  });

  chrome.runtime?.onMessage?.addListener((msg) => {
    if (msg.type === 'TOGGLE_OS') toggleOS();
    if (msg.type === 'OPEN_OS') openOS();
    if (msg.type === 'CLOSE_OS') closeOS();
  });

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createOrb);
  } else {
    createOrb();
  }

  console.log('[FrontendAI OS] Content script injected — orb ready');
})();
