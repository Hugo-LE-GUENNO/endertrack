// Force Z panel visibility - Execute immediately
(function() {
  'use strict';
  
  console.log('🔧 Force Z-panel script starting...');
  
  function forceZPanelVisible() {
    const zPanel = document.querySelector('.z-visualization-panel');
    if (zPanel) {
      zPanel.style.display = 'flex';
      zPanel.style.visibility = 'visible';
      zPanel.classList.remove('hidden');
      zPanel.removeAttribute('hidden');
      
      console.log('✅ Z-panel visible:', zPanel.offsetWidth > 0);
      return true;
    }
    return false;
  }
  
  // Try immediately
  if (forceZPanelVisible()) {
    console.log('✅ Z-panel visible immediately');
  } else {
    console.log('⏳ Z-panel not found, waiting...');
  }
  
  // Try every 100ms for 5 seconds
  let attempts = 0;
  const maxAttempts = 50;
  
  const interval = setInterval(() => {
    attempts++;
    
    if (forceZPanelVisible()) {
      console.log(`✅ Z-panel visible after ${attempts} attempts`);
      clearInterval(interval);
    } else if (attempts >= maxAttempts) {
      console.error('❌ Failed to make Z-panel visible after 50 attempts');
      clearInterval(interval);
    }
  }, 100);
  
  // Also try on DOM events
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forceZPanelVisible);
  }
  
  window.addEventListener('load', forceZPanelVisible);
  
  // Export function globally for debugging
  window.forceZPanelVisible = forceZPanelVisible;
  
})();