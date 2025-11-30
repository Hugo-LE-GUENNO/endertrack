// modules/ui/get-button-events.js - Event handlers for get button updates

// Initialize get button event listeners after DOM is ready
function initializeGetButtonEvents() {
  setTimeout(() => {
    const inputs = ['inputX', 'inputY', 'inputXSep', 'inputYSep', 'inputZ'];
    
    inputs.forEach(inputId => {
      const input = document.getElementById(inputId);
      if (input) {
        input.addEventListener('input', () => {
          if (window.updateGetButtonStates) {
            window.updateGetButtonStates();
          }
        });
      }
    });
    
    // Initial update of button states
    if (window.updateGetButtonStates) {
      window.updateGetButtonStates();
    }
  }, 1000);
}

// Auto-initialize when script loads
initializeGetButtonEvents();