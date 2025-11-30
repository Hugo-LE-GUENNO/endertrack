// enderscope/connection.js - Enderscope hardware connection

class EnderscopeConnection {
  constructor() {
    this.isConnected = false;
    this.serverUrl = 'http://localhost:5000';
    this.currentPort = null;
    this.position = { x: 0, y: 0, z: 0 };
    this.serverSimulationMode = false;
    this.connectionError = null;
    this.connectionMonitor = null;
    this.lastConnectionCheck = Date.now();
  }

  async init() {
    this.setupUI();
    await this.checkServerStatus();
    await this.refreshPorts();
    this.updateMainModeIndicator();
    this.startConnectionMonitor();
    return true;
  }

  setupUI() {
    this.refreshPorts();
    this.updateConnectionStatus();
  }

  async checkServerStatus() {
    try {
      const response = await fetch(`${this.serverUrl}/api/status`);
      const status = await response.json();
      this.serverSimulationMode = status.simulation_mode || false;
      
      if (this.serverSimulationMode) {
        console.warn('⚠️ Serveur Enderscope en MODE SIMULATION (enderscope.py non trouvé)');
      }
    } catch (error) {
      // Serveur non disponible
    }
  }

  async refreshPorts() {
    try {
      const response = await fetch(`${this.serverUrl}/api/ports`);
      const ports = await response.json();
      
      const select = document.getElementById('serialPort');
      const currentValue = select.value; // Sauvegarder la sélection actuelle
      
      select.innerHTML = '';
      
      // Ajouter /dev/ttyUSB0 par défaut s'il n'est pas dans la liste
      if (!ports.includes('/dev/ttyUSB0')) {
        const defaultOption = document.createElement('option');
        defaultOption.value = '/dev/ttyUSB0';
        defaultOption.textContent = '/dev/ttyUSB0';
        select.appendChild(defaultOption);
      }
      
      ports.forEach(port => {
        const option = document.createElement('option');
        option.value = port;
        option.textContent = port;
        if (port === '/dev/ttyUSB0') {
          option.selected = true; // Sélectionner par défaut
        }
        select.appendChild(option);
      });
      
      // Restaurer la sélection précédente si elle existe
      if (currentValue && ports.includes(currentValue)) {
        select.value = currentValue;
      } else {
        select.value = '/dev/ttyUSB0'; // Défaut
      }

    } catch (error) {
      // Serveur non disponible - mode silencieux
    }
  }

  async connect() {
    const port = document.getElementById('serialPort').value;
    const baudRate = parseInt(document.getElementById('baudRate').value) || 115200;
    
    console.log('🔗 Attempting connection...', { port, baudRate });
    
    if (!port) {
      console.log('❌ No port selected');
      return;
    }

    // Show progress bar
    this.showProgress('Connexion en cours...');
    
    try {
      console.log('🚀 Sending fetch request to:', `${this.serverUrl}/api/connect`);
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(`${this.serverUrl}/api/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port, baudRate }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log('📦 Response received:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📝 Response data:', result);
      
      if (result.success) {
        console.log('✅ Connection successful');
        this.isConnected = true;
        this.currentPort = port;
        this.currentBaudRate = baudRate;
        this.hideProgress();
        this.updateConnectionStatus();
        // Synchroniser la position après connexion
        await this.syncPosition();
      } else {
        console.log('❌ Connection failed:', result.error);
        this.connectionError = result.error;
        this.hideProgress();
        this.updateConnectionStatus();
      }
    } catch (error) {
      console.log('💥 Connection error:', error);
      if (error.name === 'AbortError') {
        this.connectionError = 'Timeout de connexion';
      } else {
        this.connectionError = 'Serveur non disponible';
      }
      this.hideProgress();
      this.updateConnectionStatus();
    }
  }
  
  showProgress(text = 'Connexion en cours...') {
    const progress = document.getElementById('connectionProgress');
    const progressText = progress.querySelector('.progress-text');
    const statusIndicator = document.getElementById('connectionStatus');
    
    progressText.textContent = text;
    progress.style.display = 'block';
    statusIndicator.classList.add('connecting');
  }
  
  hideProgress() {
    const progress = document.getElementById('connectionProgress');
    const statusIndicator = document.getElementById('connectionStatus');
    
    progress.style.display = 'none';
    statusIndicator.classList.remove('connecting');
  }

  async disconnect() {
    try {
      await fetch(`${this.serverUrl}/api/disconnect`, { method: 'POST' });
      this.isConnected = false;
      this.currentPort = null;
      this.currentBaudRate = null;
      this.connectionError = null;
      this.updateConnectionStatus();
    } catch (error) {
      // Erreur de déconnexion - mode silencieux
    }
  }

  async home() {
    if (!this.isConnected) return;

    try {
      const response = await fetch(`${this.serverUrl}/api/home`, { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        // Synchroniser la position après le homing
        await this.syncPosition();
      }
    } catch (error) {
      // Erreur homing - mode silencieux
    }
  }

  async getPosition() {
    if (!this.isConnected) return;

    try {
      const response = await fetch(`${this.serverUrl}/api/position`);
      const result = await response.json();
      
      if (result.success) {
        this.position = result.position;
        this.updatePositionDisplay();
        
        if (window.EnderTrack?.State) {
          window.EnderTrack.State.update({ pos: this.position });
        }
      }
    } catch (error) {
      // Erreur lecture position - mode silencieux
    }
  }

  async syncPosition() {
    if (!this.isConnected) return;

    try {
      // Récupérer la position actuelle de l'interface
      const currentInterfacePos = window.EnderTrack?.State?.get()?.pos || { x: 0, y: 0, z: 0 };
      
      // Récupérer la position de l'Enderscope
      const response = await fetch(`${this.serverUrl}/api/position`);
      const result = await response.json();
      
      if (result.success) {
        const enderscopePos = result.position;
        
        // Synchroniser l'interface avec la position réelle de l'Enderscope
        this.position = enderscopePos;
        
        if (window.EnderTrack?.State) {
          window.EnderTrack.State.update({ 
            pos: enderscopePos,
            // Mettre à jour aussi les inputs absolus
            targetPosition: enderscopePos
          });
        }
        
        // Mettre à jour les inputs d'interface
        this.updateAbsoluteInputs(enderscopePos);
        this.updatePositionDisplay();
        
        console.log(`🔄 Position synchronisée: X:${enderscopePos.x} Y:${enderscopePos.y} Z:${enderscopePos.z}`);
      }
    } catch (error) {
      console.log('Erreur synchronisation position:', error);
    }
  }

  updateAbsoluteInputs(position) {
    // Mettre à jour tous les inputs de position absolue
    const inputs = [
      { id: 'inputX', value: position.x },
      { id: 'inputY', value: position.y },
      { id: 'inputZ', value: position.z },
      { id: 'inputXSep', value: position.x },
      { id: 'inputYSep', value: position.y }
    ];
    
    inputs.forEach(({ id, value }) => {
      const input = document.getElementById(id);
      if (input) {
        input.value = value.toFixed(2);
      }
    });
  }

  async moveAbsolute(x, y, z) {
    if (!this.isConnected) return false;

    try {
      const response = await fetch(`${this.serverUrl}/api/move/absolute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y, z })
      });

      const result = await response.json();
      
      if (result.success) {
        // Synchroniser la position après le mouvement
        await this.syncPosition();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async moveRelative(dx, dy, dz) {
    if (!this.isConnected) return false;

    try {
      const response = await fetch(`${this.serverUrl}/api/move/relative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dx, dy, dz })
      });

      const result = await response.json();
      
      if (result.success) {
        // Synchroniser la position après le mouvement
        await this.syncPosition();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  updateConnectionStatus() {
    const statusIndicator = document.getElementById('connectionStatus');
    const statusText = document.getElementById('connectionText');
    const connectBtn = document.getElementById('connectBtn');
    const controls = document.getElementById('enderscopeControls');

    if (this.isConnected) {
      statusIndicator.classList.add('connected');
      statusText.textContent = `Connecté (${this.currentPort})`;
      connectBtn.textContent = 'Déconnecter';
      connectBtn.onclick = () => this.disconnect();
      controls.style.display = 'block';
    } else {
      statusIndicator.classList.remove('connected');
      
      if (this.connectionError) {
        statusText.textContent = this.connectionError;
        statusText.style.color = '#ef4444';
      } else {
        statusText.textContent = 'Déconnecté';
        statusText.style.color = '';
      }
      
      connectBtn.textContent = 'Connecter';
      connectBtn.onclick = () => this.connect();
      controls.style.display = 'none';
    }
    
    // Update main mode indicator
    this.updateMainModeIndicator();
  }

  updatePositionDisplay() {
    const display = document.getElementById('enderscopePosition');
    if (display) {
      display.textContent = `X: ${this.position.x.toFixed(2)} Y: ${this.position.y.toFixed(2)} Z: ${this.position.z.toFixed(2)}`;
    }
  }

  startConnectionMonitor() {
    // Vérification toutes les 3 secondes
    this.connectionMonitor = setInterval(() => {
      if (this.isConnected) {
        this.checkConnectionHealth();
      }
    }, 3000);
  }

  async checkConnectionHealth() {
    try {
      const response = await fetch(`${this.serverUrl}/api/status`, {
        method: 'GET',
        timeout: 2000
      });
      
      if (!response.ok) {
        throw new Error('Serveur non disponible');
      }
      
      const status = await response.json();
      
      // Vérifier si la connexion série est toujours active
      if (status.connected === false && this.isConnected) {
        this.handleConnectionLost('Port série déconnecté');
      }
      
    } catch (error) {
      if (this.isConnected) {
        this.handleConnectionLost('Serveur Enderscope non disponible');
      }
    }
  }

  handleConnectionLost(reason) {
    console.log(`🔌 Connexion perdue: ${reason}`);
    this.isConnected = false;
    this.currentPort = null;
    this.connectionError = `Déconnecté: ${reason}`;
    this.updateConnectionStatus();
    
    // Notification visuelle
    if (window.EnderTrack?.UI?.showNotification) {
      window.EnderTrack.UI.showNotification(`⚠️ ${reason} - Retour en mode simulateur`, 'warning');
    }
  }

  updateMainModeIndicator() {
    // Update the existing status label in the right panel
    const statusLabel = document.getElementById('statusSectionTitle');
    const statusSection = document.querySelector('.status-section');
    
    if (statusLabel && statusSection) {
      if (this.isConnected) {
        if (this.serverSimulationMode) {
          statusLabel.textContent = '📍 État actuel - Enderscope SIMULATION';
          statusSection.style.background = 'linear-gradient(135deg, rgba(251, 191, 36, 0.8), rgba(245, 158, 11, 0.6))';
          statusSection.style.border = '2px solid rgba(245, 158, 11, 0.8)';
          statusSection.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
        } else {
          statusLabel.textContent = '📍 État actuel - Enderscope OK';
          statusSection.style.background = 'linear-gradient(135deg, rgba(6, 95, 70, 0.8), rgba(16, 185, 129, 0.6))';
          statusSection.style.border = '2px solid rgba(16, 185, 129, 0.8)';
          statusSection.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
        }
      } else {
        let statusText = '📍 État actuel - SIMULATEUR';
        if (this.connectionError && this.connectionError.includes('Déconnecté:')) {
          statusText = '📍 État actuel - SIMULATEUR (Déconnecté)';
        }
        statusLabel.textContent = statusText;
        statusSection.style.background = 'linear-gradient(135deg, rgba(194, 65, 12, 0.8), rgba(251, 146, 60, 0.6))';
        statusSection.style.border = '2px solid rgba(251, 146, 60, 0.8)';
        statusSection.style.boxShadow = '0 4px 12px rgba(251, 146, 60, 0.3)';
      }
      statusSection.style.borderRadius = '8px';
      statusSection.style.transition = 'all 0.3s ease';
    }
  }
}

// Global functions
function refreshSerialPorts() {
  window.EnderTrack?.Enderscope?.refreshPorts();
}

function toggleConnection() {
  if (window.EnderTrack?.Enderscope?.isConnected) {
    window.EnderTrack.Enderscope.disconnect();
  } else {
    window.EnderTrack.Enderscope.connect();
  }
}

function homeEnderscope() {
  window.EnderTrack?.Enderscope?.home();
}

function getEnderscopePosition() {
  window.EnderTrack?.Enderscope?.getPosition();
}

function testEnderscope() {
  if (window.EnderTrack?.Movement) {
    window.EnderTrack.Movement.moveRelative(1, 0, 0);
  }
}

// Emergency stop with G-code
async function emergencyStopGcode() {
  try {
    console.log('🛑 Arrêt d\'urgence avec G-code!');
    const response = await fetch('http://localhost:5000/api/emergency_stop', {
      method: 'POST'
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('✅ Arrêt d\'urgence exécuté');
    }
  } catch (error) {
    console.log(`💥 Erreur arrêt d'urgence: ${error}`);
  }
}

// G-code Direct
async function sendGcode() {
  const command = document.getElementById('gcodeInput').value.trim();
  if (!command) {
    alert('Veuillez entrer une commande G-code');
    return;
  }
  
  try {
    const response = await fetch('http://localhost:5000/api/gcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    
    const result = await response.json();
    if (result.success) {
      console.log(`✅ G-code envoyé: ${command}`);
      document.getElementById('gcodeInput').value = '';
    } else {
      console.log(`❌ Erreur G-code: ${result.error}`);
      alert(`Erreur: ${result.error}`);
    }
  } catch (error) {
    console.log(`💥 Erreur envoi G-code: ${error}`);
    alert(`Erreur: ${error.message}`);
  }
}

async function sendPresetGcode(command) {
  document.getElementById('gcodeInput').value = command;
  await sendGcode();
}

// Beep
async function sendBeep() {
  try {
    const response = await fetch('http://localhost:5000/api/beep', {
      method: 'POST'
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('🔊 Bip envoyé!');
    }
  } catch (error) {
    console.log(`💥 Erreur bip: ${error}`);
  }
}

// Debug functions
async function testConnection() {
  console.log('🔌 Test de connexion...');
  await sendPresetGcode('M115');
}

async function testMovement() {
  console.log('🎯 Test de mouvement (1mm en X)...');
  if (window.EnderTrack?.Movement) {
    window.EnderTrack.Movement.moveRelative(1, 0, 0);
  }
}

async function resetEnderscope() {
  console.log('🔄 Reset Enderscope...');
  await sendPresetGcode('M999');
}

// New interface functions
function resetSerialPort() {
  document.getElementById('serialPort').value = '/dev/ttyUSB0';
  refreshSerialPorts(); // Actualise aussi les ports série
}

function resetBaudRate() {
  document.getElementById('baudRate').value = '115200';
  refreshSerialPorts(); // Actualise aussi les ports série
}

function handleGcodeEnter(event) {
  if (event.key === 'Enter') {
    sendGcode();
  }
}

function showGcodeHelp() {
  document.getElementById('gcodeHelpModal').style.display = 'flex';
}

function closeGcodeHelp() {
  document.getElementById('gcodeHelpModal').style.display = 'none';
}

async function getEnderscopeInfo() {
  await sendPresetGcode('M115');
}

async function syncEnderscopePosition() {
  if (window.EnderTrack?.Enderscope) {
    await window.EnderTrack.Enderscope.syncPosition();
    console.log('🔄 Position synchronisée manuellement');
  }
}

window.EnderTrack = window.EnderTrack || {};
window.EnderTrack.Enderscope = new EnderscopeConnection();