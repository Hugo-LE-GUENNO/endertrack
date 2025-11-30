// modules/ui/history-settings.js - Contrôles d'affichage

// Onglets visibles
function toggleNavigationTab() {
  const show = document.getElementById('showNavigationTab').checked;
  const tab = document.getElementById('navigationTab');
  if (tab) tab.style.display = show ? 'block' : 'none';
}

function toggleOthersTab() {
  const show = document.getElementById('showOthersTab').checked;
  const tab = document.getElementById('othersTab');
  if (tab) tab.style.display = show ? 'block' : 'none';
}

// Navigation - Contrôle seulement la visibilité des boutons de mode
function toggleRelativeMode() {
  const show = document.getElementById('showRelativeMode').checked;
  const relativeTab = document.getElementById('relativeTab');
  
  if (relativeTab) {
    relativeTab.style.display = show ? 'block' : 'none';
    // Si on cache le relatif et qu'il était actif, basculer vers absolu
    if (!show && relativeTab.classList.contains('active')) {
      const absoluteTab = document.getElementById('absoluteTab');
      if (absoluteTab && absoluteTab.style.display !== 'none') {
        absoluteTab.click();
      }
    }
  }
}

function toggleControllerMode() {
  const show = document.getElementById('showControllerMode').checked;
  const toggle = document.getElementById('keyboardMode');
  if (toggle) toggle.style.display = show ? 'block' : 'none';
}

function toggleAbsoluteMode() {
  const show = document.getElementById('showAbsoluteMode').checked;
  const absoluteTab = document.getElementById('absoluteTab');
  
  if (absoluteTab) {
    absoluteTab.style.display = show ? 'block' : 'none';
    // Si on cache l'absolu et qu'il était actif, basculer vers relatif
    if (!show && absoluteTab.classList.contains('active')) {
      const relativeTab = document.getElementById('relativeTab');
      if (relativeTab && relativeTab.style.display !== 'none') {
        relativeTab.click();
      }
    }
  }
}

// Données de sortie
function toggleStatusPanel() {
  const show = document.getElementById('showStatusPanel').checked;
  const panel = document.querySelector('.status-section');
  if (panel) panel.style.display = show ? 'block' : 'none';
}

function toggleControllerLog() {
  const show = document.getElementById('showControllerLog').checked;
  const log = document.getElementById('navigationLog');
  if (log) log.style.display = show ? 'block' : 'none';
}

// Historique
function toggleHistoryXY() {
  const show = document.getElementById('showHistoryXY').checked;
  if (window.EnderTrack?.State) {
    EnderTrack.State.update({ showHistoryXY: show });
  }
  if (window.EnderTrack?.Canvas) {
    EnderTrack.Canvas.requestRender();
  }
}

function toggleHistoryPanel() {
  const show = document.getElementById('showHistoryPanel').checked;
  const panel = document.querySelector('.history-section');
  if (panel) panel.style.display = show ? 'block' : 'none';
}

function toggleTrackFree() {
  const show = document.getElementById('showTrackFree').checked;
  const snakeControls = document.querySelector('.snake-mode-controls');
  
  if (snakeControls) {
    snakeControls.style.display = show ? 'block' : 'none';
  }
  
  if (window.EnderTrack?.State) {
    EnderTrack.State.update({ showTrackFree: show });
  }
  if (window.EnderTrack?.Canvas) {
    EnderTrack.Canvas.requestRender();
  }
}

function toggleTrackPositions() {
  const show = document.getElementById('showTrackPositions').checked;
  if (window.EnderTrack?.State) {
    EnderTrack.State.update({ showTrackPositions: show });
  }
  if (window.EnderTrack?.Canvas) {
    EnderTrack.Canvas.requestRender();
  }
}

function toggleHistoryZ() {
  const show = document.getElementById('showHistoryZ').checked;
  if (window.EnderTrack?.State) {
    EnderTrack.State.update({ showHistoryZ: show });
  }
  if (window.EnderTrack?.ZVisualization) {
    EnderTrack.ZVisualization.render();
  }
}

function toggleGraphs() {
  const show = document.getElementById('showGraphs').checked;
  const graphsSection = document.querySelector('.graphs-section');
  if (graphsSection) graphsSection.style.display = show ? 'block' : 'none';
  
  if (window.EnderTrack?.State) {
    EnderTrack.State.update({ showGraphs: show });
  }
}

// Contrôles de sensibilité
function toggleSensitivityControls() {
  const show = document.getElementById('showSensitivityControls').checked;
  const stepControls = document.getElementById('stepControls');
  if (stepControls) stepControls.style.display = show ? 'block' : 'none';
}

// Panneau Z
function toggleZPanel() {
  const show = document.getElementById('showZPanel').checked;
  const panel = document.getElementById('zVisualizationPanel');
  if (panel) panel.style.display = show ? 'block' : 'none';
}

function toggleSnakeMode() {
  const isEnabled = document.getElementById('enableSnakeMode').checked;
  const slider = document.getElementById('snakeSliderContainer');
  
  if (slider) {
    slider.style.display = isEnabled ? 'flex' : 'none';
  }
  
  if (window.EnderTrack?.State) {
    EnderTrack.State.update({ enableSnakeMode: isEnabled });
  }
}

function updateSnakePoints() {
  const slider = document.getElementById('snakePointsSlider');
  const valueSpan = document.getElementById('snakePointsValue');
  const points = parseInt(slider.value);
  
  if (valueSpan) {
    valueSpan.textContent = `${points} pts`;
  }
  
  if (window.EnderTrack?.State) {
    const state = EnderTrack.State.get();
    if (state.continuousTrack && state.continuousTrack.length > points) {
      const newTrack = state.continuousTrack.slice(-points);
      EnderTrack.State.update({ 
        maxContinuousTrackPoints: points,
        continuousTrack: newTrack
      });
    } else {
      EnderTrack.State.update({ maxContinuousTrackPoints: points });
    }
  }
}

function toggleSnakeMode() {
  const isEnabled = document.getElementById('enableSnakeMode').checked;
  const slider = document.getElementById('snakeSliderContainer');
  
  if (slider) {
    slider.style.display = isEnabled ? 'flex' : 'none';
  }
  
  if (window.EnderTrack?.State) {
    EnderTrack.State.update({ enableSnakeMode: isEnabled });
  }
}

function updateSnakePoints() {
  const slider = document.getElementById('snakePointsSlider');
  const valueSpan = document.getElementById('snakePointsValue');
  const points = parseInt(slider.value);
  
  if (valueSpan) {
    valueSpan.textContent = `${points} pts`;
  }
  
  if (window.EnderTrack?.State) {
    const state = EnderTrack.State.get();
    if (state.continuousTrack && state.continuousTrack.length > points) {
      const newTrack = state.continuousTrack.slice(-points);
      EnderTrack.State.update({ 
        maxContinuousTrackPoints: points,
        continuousTrack: newTrack
      });
    } else {
      EnderTrack.State.update({ maxContinuousTrackPoints: points });
    }
  }
}

function toggleTrackPositions() {
  const showTrack = document.getElementById('showTrackPositions').checked;
  if (window.EnderTrack?.State) {
    EnderTrack.State.update({ showTrackPositions: showTrack });
  }
  if (window.EnderTrack?.Canvas) {
    EnderTrack.Canvas.requestRender();
  }
}

// Panneau Z
function toggleZPanel() {
  const showPanel = document.getElementById('showZPanel').checked;
  const zPanel = document.getElementById('zVisualizationPanel');
  
  if (zPanel) {
    zPanel.style.display = showPanel ? 'block' : 'none';
  }
  
  if (window.EnderTrack?.State) {
    EnderTrack.State.update({ showZPanel: showPanel });
  }
}

function toggleHistoryZ() {
  const showHistory = document.getElementById('showHistoryZ').checked;
  if (window.EnderTrack?.State) {
    EnderTrack.State.update({ showHistoryZ: showHistory });
  }
  if (window.EnderTrack?.ZVisualization) {
    EnderTrack.ZVisualization.render();
  }
}

// Panneau droit
function toggleStatusPanel() {
  const showPanel = document.getElementById('showStatusPanel').checked;
  const statusSection = document.querySelector('.status-section');
  
  if (statusSection) {
    statusSection.style.display = showPanel ? 'block' : 'none';
  }
  
  if (window.EnderTrack?.State) {
    EnderTrack.State.update({ showStatusPanel: showPanel });
  }
}

function toggleGraphsPanel() {
  const showPanel = document.getElementById('showGraphsPanel').checked;
  const graphsSection = document.querySelector('.graphs-section');
  
  if (graphsSection) {
    graphsSection.style.display = showPanel ? 'block' : 'none';
  }
  
  if (window.EnderTrack?.State) {
    EnderTrack.State.update({ showGraphsPanel: showPanel });
  }
}

function toggleHistoryPanel() {
  const showPanel = document.getElementById('showHistoryPanel').checked;
  const historySection = document.querySelector('.history-section');
  
  if (historySection) {
    historySection.style.display = showPanel ? 'block' : 'none';
  }
  
  if (window.EnderTrack?.State) {
    EnderTrack.State.update({ showHistoryPanel: showPanel });
  }
}

// Initialisation
function initDisplaySettings() {
  if (!window.EnderTrack?.State) {
    setTimeout(initDisplaySettings, 100);
    return;
  }
  
  const state = EnderTrack.State.get();
  
  // Initialiser toutes les checkboxes
  const elements = [
    ['showGrid', state.showGrid !== false],
    ['showHistoryXY', state.showHistoryXY !== false],
    ['showTrackFree', state.showTrackFree !== false],
    ['enableSnakeMode', state.enableSnakeMode !== false],
    ['showTrackPositions', state.showTrackPositions !== false],
    ['showZPanel', state.showZPanel !== false],
    ['showHistoryZ', state.showHistoryZ !== false],
    ['showStatusPanel', state.showStatusPanel !== false],

    ['showHistoryPanel', state.showHistoryPanel !== false],
    ['showGraphs', state.showGraphs !== false],
    ['showSensitivityControls', state.showSensitivityControls !== false]
  ];
  
  elements.forEach(([id, checked]) => {
    const checkbox = document.getElementById(id);
    if (checkbox) checkbox.checked = checked;
  });
  
  // Snake slider
  const snakeSlider = document.getElementById('snakePointsSlider');
  const snakeValue = document.getElementById('snakePointsValue');
  if (snakeSlider && snakeValue) {
    const points = state.maxContinuousTrackPoints || 2000;
    snakeSlider.value = points;
    snakeValue.textContent = `${points} pts`;
  }
  
  // Appliquer la visibilité initiale
  applyVisibilitySettings(state);
}

function applyVisibilitySettings(state) {
  // Panneau Z
  const zPanel = document.getElementById('zVisualizationPanel');
  if (zPanel) zPanel.style.display = (state.showZPanel !== false) ? 'block' : 'none';
  
  // Panneau droit
  const statusSection = document.querySelector('.status-section');
  if (statusSection) statusSection.style.display = (state.showStatusPanel !== false) ? 'block' : 'none';
  
  const graphsSection = document.querySelector('.graphs-section');
  if (graphsSection) graphsSection.style.display = (state.showGraphs !== false) ? 'block' : 'none';
  
  const historySection = document.querySelector('.history-section');
  if (historySection) historySection.style.display = (state.showHistoryPanel !== false) ? 'block' : 'none';
  
  // Contrôles de sensibilité
  const stepControls = document.getElementById('stepControls');
  if (stepControls) stepControls.style.display = (state.showSensitivityControls !== false) ? 'block' : 'none';
  
  // Snake controls
  const snakeControls = document.querySelector('.snake-mode-controls');
  if (snakeControls) snakeControls.style.display = (state.showTrackFree !== false) ? 'block' : 'none';
  
  const snakeSlider = document.getElementById('snakeSliderContainer');
  if (snakeSlider) snakeSlider.style.display = (state.enableSnakeMode !== false) ? 'flex' : 'none';
}

// Initialiser quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initDisplaySettings, 200);
});

// Gestion de la fenêtre modale d'affichage
function openDisplayModal() {
  const modal = document.getElementById('displayModal');
  if (modal) {
    modal.style.display = 'block';
    setupModalDrag();
  }
}

// Rendre la modal déplaçable
function setupModalDrag() {
  const modal = document.querySelector('.draggable-modal');
  const header = document.querySelector('.draggable-header');
  
  if (!modal || !header) return;
  
  let isDragging = false;
  let startX, startY, startLeft, startTop;
  
  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = modal.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
  
  function onMouseMove(e) {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    modal.style.left = (startLeft + deltaX) + 'px';
    modal.style.top = (startTop + deltaY) + 'px';
    modal.style.transform = 'none';
  }
  
  function onMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
}

function closeDisplayModal() {
  const modal = document.getElementById('displayModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Fermer la modale en cliquant à l'extérieur
document.addEventListener('click', (event) => {
  const modal = document.getElementById('displayModal');
  if (event.target === modal) {
    closeDisplayModal();
  }
});

// Fonctions pour le mode snake
function toggleSnakeMode() {
  const checkbox = document.getElementById('enableSnakeMode');
  const slider = document.getElementById('snakeSliderContainer');
  const isEnabled = checkbox.checked;
  
  // Afficher/masquer le slider
  if (slider) {
    slider.style.display = isEnabled ? 'flex' : 'none';
  }
  
  // Mettre à jour l'état
  if (window.EnderTrack?.State) {
    EnderTrack.State.update({ enableSnakeMode: isEnabled });
    
    // Si on désactive le snake mode, ne pas limiter le track
    if (!isEnabled) {
      console.log('Mode snake désactivé - track libre illimité');
    } else {
      console.log('Mode snake activé - limitation à', EnderTrack.State.get().maxContinuousTrackPoints || 2000, 'points');
    }
  }
}

function applyDisplaySettings() {
  // Appliquer tous les paramètres
  toggleNavigationTab();
  toggleOthersTab();
  toggleRelativeMode();
  toggleControllerMode();
  toggleAbsoluteMode();
  toggleSensitivityControls();
  toggleZPanel();
  toggleStatusPanel();
  toggleControllerLog();
  toggleHistoryXY();
  toggleHistoryPanel();
  toggleTrackFree();
  toggleSnakeMode();
  updateSnakePoints();
  toggleTrackPositions();
  toggleHistoryZ();
  toggleGraphs();
  
  // Sauvegarder dans l'état
  if (window.EnderTrack?.State) {
    EnderTrack.State.saveState();
  }
  
  // Fermer la modale
  closeDisplayModal();
}

function updateSnakePoints() {
  const slider = document.getElementById('snakePointsSlider');
  const valueSpan = document.getElementById('snakePointsValue');
  const points = parseInt(slider.value);
  
  if (valueSpan) {
    valueSpan.textContent = `${points} pts`;
  }
  
  // Mettre à jour l'état et tronquer immédiatement si nécessaire
  if (window.EnderTrack?.State) {
    const state = EnderTrack.State.get();
    
    console.log('Mise à jour limite snake:', points, 'points. Track actuel:', state.continuousTrack?.length || 0, 'points');
    
    // Tronquer le track existant si trop long
    if (state.continuousTrack && state.continuousTrack.length > points) {
      const newTrack = state.continuousTrack.slice(-points);
      console.log('Troncature du track de', state.continuousTrack.length, 'à', newTrack.length, 'points');
      EnderTrack.State.update({ 
        maxContinuousTrackPoints: points,
        continuousTrack: newTrack
      });
    } else {
      EnderTrack.State.update({ maxContinuousTrackPoints: points });
    }
  }
}

// Fonctions globales pour l'HTML
window.toggleNavigationTab = toggleNavigationTab;
window.toggleOthersTab = toggleOthersTab;
window.toggleRelativeMode = toggleRelativeMode;
window.toggleControllerMode = toggleControllerMode;
window.toggleAbsoluteMode = toggleAbsoluteMode;
window.toggleStatusPanel = toggleStatusPanel;
window.toggleControllerLog = toggleControllerLog;
window.toggleHistoryXY = toggleHistoryXY;
window.toggleHistoryPanel = toggleHistoryPanel;
window.toggleTrackFree = toggleTrackFree;
window.toggleTrackPositions = toggleTrackPositions;
window.toggleHistoryZ = toggleHistoryZ;
window.toggleGraphs = toggleGraphs;
window.toggleSnakeMode = toggleSnakeMode;
window.updateSnakePoints = updateSnakePoints;
window.toggleSensitivityControls = toggleSensitivityControls;
window.toggleZPanel = toggleZPanel;
window.openDisplayModal = openDisplayModal;
window.closeDisplayModal = closeDisplayModal;
window.applyDisplaySettings = applyDisplaySettings;