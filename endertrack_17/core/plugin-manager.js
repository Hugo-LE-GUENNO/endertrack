// core/plugin-manager.js - Plugin system manager
// Manages loading, activation, and communication with plugins

class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.activePlugins = new Set();
    this.pluginPaths = {
      core: 'plugins/core-plugins/',
      user: 'plugins/user-plugins/'
    };
    this.isInitialized = false;
    this.loadingQueue = [];
    this.dependencies = new Map();
  }
  
  // Static properties
  static plugins = new Map();
  static activePlugins = new Set();
  static pluginPaths = {
    core: 'plugins/core-plugins/',
    user: 'plugins/user-plugins/'
  };
  static isInitialized = false;

  static async init() {
    console.log('🔌 Initializing Plugin Manager...');
    
    // Setup plugin system
    this.setupPluginSystem();
    
    // Load core plugins
    await this.loadCorePlugins();
    
    this.isInitialized = true;
    console.log('✅ Plugin Manager initialized');
    
    return true;
  }

  static setupPluginSystem() {
    // Create plugin API
    this.createPluginAPI();
    
    // Setup event listeners
    this.setupEventListeners();
  }

  static createPluginAPI() {
    // Global plugin API
    window.EnderTrackPluginAPI = {
      version: '2.0.0',
      
      // Core API access
      call: (name, ...args) => EnderTrack.API?.call?.(name, ...args),
      
      // State access
      getState: () => EnderTrack.State?.get?.(),
      updateState: (changes) => EnderTrack.State?.update?.(changes),
      
      // Event system
      on: (event, callback) => EnderTrack.Events?.on?.(event, callback),
      emit: (event, ...args) => EnderTrack.Events?.emit?.(event, ...args),
      
      // UI utilities
      showNotification: (message, type, options) => 
        EnderTrack.UI?.showNotification?.(message, type, options),
      showModal: (options) => EnderTrack.UI?.showModal?.(options),
      
      // Canvas utilities
      drawCircle: (x, y, radius, color, fill) => 
        EnderTrack.API?.call?.('drawCircle', x, y, radius, color, fill),
      drawLine: (x1, y1, x2, y2, color, width) => 
        EnderTrack.API?.call?.('drawLine', x1, y1, x2, y2, color, width),
      drawText: (x, y, text, color, font) => 
        EnderTrack.API?.call?.('drawText', x, y, text, color, font),
      
      // Movement utilities
      moveAbsolute: (x, y, z) => EnderTrack.API?.call?.('moveAbsolute', x, y, z),
      moveRelative: (dx, dy, dz) => EnderTrack.API?.call?.('moveRelative', dx, dy, dz),
      getCurrentPosition: () => EnderTrack.API?.call?.('getCurrentPosition'),
      
      // Plugin registration
      registerPlugin: (manifest, implementation) => 
        this.registerPlugin(manifest, implementation),
      
      // Tab management
      createTab: (tabId, tabConfig) => this.createPluginTab(tabId, tabConfig),
      removeTab: (tabId) => this.removePluginTab(tabId)
    };
  }

  static setupEventListeners() {
    // Listen to application events
    EnderTrack.Events?.on?.('app:started', () => {
      this.onApplicationStarted();
    });
    
    // Listen to state changes
    EnderTrack.Events?.on?.('state:changed', (newState, oldState) => {
      this.notifyPlugins('state:changed', newState, oldState);
    });
  }

  static async loadCorePlugins() {
    console.log('🔌 Loading core plugins...');
    
    const corePlugins = [
      'lists',
      'sequences', 
      'drivers',
      'enderman',
      'settings'
    ];
    
    const loadPromises = corePlugins.map(pluginName => 
      this.loadPlugin(pluginName, 'core')
    );
    
    const results = await Promise.allSettled(loadPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`🔌 Core plugins loaded: ${successful} successful, ${failed} failed`);
    
    return results;
  }

  static async loadPlugin(pluginName, type = 'user') {
    try {
      console.log(`🔌 Loading plugin: ${pluginName} (${type})`);
      
      // Initialize pluginPaths if not set
      if (!this.pluginPaths) {
        this.pluginPaths = {
          core: 'plugins/core-plugins/',
          user: 'plugins/user-plugins/'
        };
      }
      
      const pluginPath = `${this.pluginPaths[type]}${pluginName}/`;
      
      // Load plugin manifest
      const manifest = await this.loadPluginManifest(pluginPath);
      
      // Validate manifest
      this.validatePluginManifest(manifest);
      
      // Check dependencies
      const missingDeps = this.checkPluginDependencies(manifest);
      if (missingDeps.length > 0) {
        throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
      }
      
      // Load plugin files
      const pluginFiles = await this.loadPluginFiles(pluginPath, manifest);
      
      // Create plugin instance
      const plugin = this.createPluginInstance(manifest, pluginFiles, pluginPath);
      
      // Register plugin
      this.plugins.set(pluginName, plugin);
      
      // Auto-activate core plugins
      if (type === 'core') {
        await this.activatePlugin(pluginName);
      }
      
      // Emit plugin loaded event
      EnderTrack.Events?.emit?.('plugin:loaded', {
        name: pluginName,
        type,
        manifest
      });
      
      console.log(`✅ Plugin loaded: ${manifest.displayName || pluginName}`);
      return plugin;
      
    } catch (error) {
      console.error(`❌ Failed to load plugin ${pluginName}:`, error);
      
      // Emit plugin error event
      EnderTrack.Events?.emit?.('plugin:error', {
        name: pluginName,
        type,
        error: error.message,
        phase: 'loading'
      });
      
      throw error;
    }
  }

  static async loadPluginManifest(pluginPath) {
    const response = await fetch(`${pluginPath}plugin.json`);
    if (!response.ok) {
      throw new Error(`Failed to load plugin manifest: ${response.status}`);
    }
    return await response.json();
  }

  static validatePluginManifest(manifest) {
    const required = ['name', 'version', 'main'];
    
    for (const field of required) {
      if (!manifest[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Validate version format
    if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      throw new Error('Invalid version format (expected x.y.z)');
    }
    
    // Validate plugin name
    if (!/^[a-z0-9-_]+$/.test(manifest.name)) {
      throw new Error('Invalid plugin name (only lowercase letters, numbers, hyphens, and underscores allowed)');
    }
  }

  static checkPluginDependencies(manifest) {
    const dependencies = manifest.dependencies || [];
    const missing = [];
    
    for (const dep of dependencies) {
      // Check if dependency is a core module
      if (this.isCoreModule(dep)) {
        if (!this.isCoreModuleAvailable(dep)) {
          missing.push(dep);
        }
      } else {
        // Check if dependency is another plugin
        if (!this.plugins.has(dep)) {
          missing.push(dep);
        }
      }
    }
    
    return missing;
  }

  static isCoreModule(moduleName) {
    const coreModules = [
      'canvas', 'navigation', 'state', 'ui', 'utils', 'movement'
    ];
    return coreModules.includes(moduleName);
  }

  static isCoreModuleAvailable(moduleName) {
    const moduleMap = {
      'canvas': () => !!EnderTrack.Canvas,
      'navigation': () => !!EnderTrack.Navigation,
      'state': () => !!EnderTrack.State,
      'ui': () => !!EnderTrack.UI,
      'utils': () => !!EnderTrack.Math,
      'movement': () => !!EnderTrack.Movement
    };
    
    const checker = moduleMap[moduleName];
    return checker ? checker() : false;
  }

  static async loadPluginFiles(pluginPath, manifest) {
    const files = {
      main: null,
      ui: null,
      styles: null
    };
    
    // Load main JavaScript file
    if (manifest.main) {
      files.main = await this.loadScript(`${pluginPath}${manifest.main}`);
    }
    
    // Load UI template if specified
    if (manifest.ui) {
      try {
        const response = await fetch(`${pluginPath}${manifest.ui}`);
        if (response.ok) {
          files.ui = await response.text();
        }
      } catch (error) {
        console.warn(`Failed to load UI template for plugin: ${error.message}`);
      }
    }
    
    // Load styles if specified
    if (manifest.styles) {
      try {
        files.styles = await this.loadStylesheet(`${pluginPath}${manifest.styles}`);
      } catch (error) {
        console.warn(`Failed to load styles for plugin: ${error.message}`);
      }
    }
    
    return files;
  }

  static async loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => resolve(script);
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      document.head.appendChild(script);
    });
  }

  static async loadStylesheet(url) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = () => resolve(link);
      link.onerror = () => reject(new Error(`Failed to load stylesheet: ${url}`));
      document.head.appendChild(link);
    });
  }

  static createPluginInstance(manifest, files, pluginPath) {
    return {
      manifest,
      files,
      pluginPath,
      isActive: false,
      isLoaded: true,
      loadTime: Date.now(),
      instance: null,
      tabElement: null,
      contentElement: null,
      
      // Plugin lifecycle methods
      activate: async () => {
        return await this.activatePlugin(manifest.name);
      },
      
      deactivate: () => {
        return this.deactivatePlugin(manifest.name);
      },
      
      unload: () => {
        return this.unloadPlugin(manifest.name);
      }
    };
  }

  static async activatePlugin(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginName}`);
    }
    
    if (plugin.isActive) {
      return true; // Already active
    }
    
    try {
      console.log(`🔌 Activating plugin: ${pluginName}`);
      
      // Check dependencies again
      const missingDeps = this.checkPluginDependencies(plugin.manifest);
      if (missingDeps.length > 0) {
        throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
      }
      
      // Create plugin tab if needed
      if (plugin.manifest.ui || plugin.files.ui) {
        this.createPluginTab(pluginName, plugin);
      }
      
      // Initialize plugin instance
      await this.initializePluginInstance(plugin);
      
      // Mark as active
      plugin.isActive = true;
      this.activePlugins.add(pluginName);
      
      // Emit activation event
      EnderTrack.Events?.emit?.('plugin:activated', {
        name: pluginName,
        displayName: plugin.manifest.displayName,
        version: plugin.manifest.version
      });
      
      console.log(`✅ Plugin activated: ${plugin.manifest.displayName || pluginName}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to activate plugin ${pluginName}:`, error);
      
      // Emit plugin error event
      EnderTrack.Events?.emit?.('plugin:error', {
        name: pluginName,
        error: error.message,
        phase: 'activation'
      });
      
      throw error;
    }
  }

  static async initializePluginInstance(plugin) {
    const pluginName = plugin.manifest.name;
    
    // Look for plugin class in global scope
    const pluginClass = this.findPluginClass(pluginName);
    
    if (pluginClass) {
      // Create instance
      plugin.instance = new pluginClass();
      
      // Initialize if method exists
      if (typeof plugin.instance.init === 'function') {
        await plugin.instance.init();
      }
      
      // Activate if method exists
      if (typeof plugin.instance.activate === 'function') {
        await plugin.instance.activate();
      }
    }
  }

  static findPluginClass(pluginName) {
    // Try different naming conventions
    const possibleNames = [
      `${pluginName}Plugin`,
      `${pluginName.charAt(0).toUpperCase() + pluginName.slice(1)}Plugin`,
      `${pluginName}`,
      `${pluginName.charAt(0).toUpperCase() + pluginName.slice(1)}`
    ];
    
    for (const name of possibleNames) {
      if (window[name] && typeof window[name] === 'function') {
        return window[name];
      }
      
      // Check in EnderTrack.Plugins namespace
      if (window.EnderTrack?.Plugins?.[name] && typeof window.EnderTrack.Plugins[name] === 'function') {
        return window.EnderTrack.Plugins[name];
      }
    }
    
    return null;
  }

  static createPluginTab(pluginName, plugin) {
    const manifest = plugin.manifest;
    
    // Create tab button
    const tabButton = document.createElement('button');
    tabButton.id = `${pluginName}Tab`;
    tabButton.className = 'mode-btn plugin-tab';
    tabButton.innerHTML = `${manifest.icon || '🔌'} ${manifest.displayName || pluginName}`;
    tabButton.onclick = () => {
      if (EnderTrack.UI?.Tabs) {
        EnderTrack.UI.Tabs.switchTab(pluginName);
      }
    };
    
    // Create tab content
    const tabContent = document.createElement('div');
    tabContent.id = `${pluginName}TabContent`;
    tabContent.className = 'tab-panel';
    
    // Add UI content if available
    if (plugin.files.ui) {
      tabContent.innerHTML = plugin.files.ui;
    } else {
      tabContent.innerHTML = `
        <div class="plugin-placeholder">
          <h4>${manifest.displayName || pluginName}</h4>
          <p>${manifest.description || 'Plugin loaded successfully'}</p>
          <p><small>Version: ${manifest.version}</small></p>
        </div>
      `;
    }
    
    // Add to DOM
    const dynamicTabsContainer = document.getElementById('dynamicTabsContainer');
    const tabContentContainer = document.querySelector('.tab-content');
    
    if (dynamicTabsContainer) {
      // Insert before the "Add" button
      const addButton = document.getElementById('addPluginTab');
      if (addButton) {
        dynamicTabsContainer.insertBefore(tabButton, addButton);
      } else {
        dynamicTabsContainer.appendChild(tabButton);
      }
    }
    
    if (tabContentContainer) {
      tabContentContainer.appendChild(tabContent);
    }
    
    // Store references
    plugin.tabElement = tabButton;
    plugin.contentElement = tabContent;
  }

  static deactivatePlugin(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin || !plugin.isActive) {
      return false;
    }
    
    try {
      console.log(`🔌 Deactivating plugin: ${pluginName}`);
      
      // Deactivate plugin instance
      if (plugin.instance && typeof plugin.instance.deactivate === 'function') {
        plugin.instance.deactivate();
      }
      
      // Hide plugin tab
      if (plugin.tabElement) {
        plugin.tabElement.style.display = 'none';
      }
      
      // Mark as inactive
      plugin.isActive = false;
      this.activePlugins.delete(pluginName);
      
      // Emit deactivation event
      EnderTrack.Events?.emit?.('plugin:deactivated', {
        name: pluginName,
        displayName: plugin.manifest.displayName
      });
      
      console.log(`✅ Plugin deactivated: ${plugin.manifest.displayName || pluginName}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to deactivate plugin ${pluginName}:`, error);
      return false;
    }
  }

  static unloadPlugin(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      return false;
    }
    
    try {
      console.log(`🔌 Unloading plugin: ${pluginName}`);
      
      // Deactivate first
      if (plugin.isActive) {
        this.deactivatePlugin(pluginName);
      }
      
      // Cleanup plugin instance
      if (plugin.instance && typeof plugin.instance.destroy === 'function') {
        plugin.instance.destroy();
      }
      
      // Remove from DOM
      if (plugin.tabElement) {
        plugin.tabElement.remove();
      }
      if (plugin.contentElement) {
        plugin.contentElement.remove();
      }
      
      // Remove from registry
      this.plugins.delete(pluginName);
      
      // Emit unload event
      EnderTrack.Events?.emit?.('plugin:unloaded', {
        name: pluginName,
        displayName: plugin.manifest.displayName
      });
      
      console.log(`✅ Plugin unloaded: ${plugin.manifest.displayName || pluginName}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to unload plugin ${pluginName}:`, error);
      return false;
    }
  }

  // Plugin discovery and management
  static async discoverPlugins() {
    const discovered = {
      core: [],
      user: [],
      available: []
    };
    
    // This would scan the plugin directories
    // For now, return the known core plugins
    discovered.core = ['lists', 'sequences', 'drivers', 'enderman', 'settings'];
    
    return discovered;
  }

  static getPluginInfo(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) return null;
    
    return {
      name: plugin.manifest.name,
      displayName: plugin.manifest.displayName,
      version: plugin.manifest.version,
      description: plugin.manifest.description,
      author: plugin.manifest.author,
      isActive: plugin.isActive,
      isLoaded: plugin.isLoaded,
      loadTime: plugin.loadTime,
      dependencies: plugin.manifest.dependencies || [],
      permissions: plugin.manifest.permissions || []
    };
  }

  static getAllPlugins() {
    const plugins = {};
    
    this.plugins.forEach((plugin, name) => {
      plugins[name] = this.getPluginInfo(name);
    });
    
    return plugins;
  }

  static getActivePlugins() {
    return Array.from(this.activePlugins);
  }

  // Plugin communication
  static notifyPlugins(event, ...args) {
    this.activePlugins.forEach(pluginName => {
      const plugin = this.plugins.get(pluginName);
      if (plugin?.instance && typeof plugin.instance.onEvent === 'function') {
        try {
          plugin.instance.onEvent(event, ...args);
        } catch (error) {
          console.error(`Plugin ${pluginName} event handler error:`, error);
        }
      }
    });
  }

  // UI integration
  static showPluginSelector() {
    const availablePlugins = [];
    
    // Add inactive plugins
    this.plugins.forEach((plugin, name) => {
      if (!plugin.isActive) {
        availablePlugins.push({
          name,
          displayName: plugin.manifest.displayName || name,
          description: plugin.manifest.description || 'No description',
          version: plugin.manifest.version,
          icon: plugin.manifest.icon || '🔌'
        });
      }
    });
    
    if (availablePlugins.length === 0) {
      EnderTrack.UI?.showNotification?.('Tous les plugins sont déjà activés', 'info');
      return;
    }
    
    // Create plugin selector modal
    let content = '<div class="plugin-selector">';
    
    availablePlugins.forEach(plugin => {
      content += `
        <div class="plugin-card">
          <div class="plugin-info">
            <span class="plugin-icon">${plugin.icon}</span>
            <div class="plugin-details">
              <h5>${plugin.displayName}</h5>
              <p>${plugin.description}</p>
              <small>v${plugin.version}</small>
            </div>
          </div>
          <button class="btn" onclick="EnderTrack.PluginManager.activatePlugin('${plugin.name}').then(() => document.querySelector('.modal').remove())">
            Activer
          </button>
        </div>
      `;
    });
    
    content += '</div>';
    
    EnderTrack.UI?.showModal?.({
      title: 'Sélectionner un Plugin',
      content,
      size: 'large'
    });
  }

  // Event handlers
  static onApplicationStarted() {
    // Notify all active plugins that the application has started
    this.notifyPlugins('app:started');
  }

  // Debug and monitoring
  static getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      pluginCount: this.plugins.size,
      activePluginCount: this.activePlugins.size,
      plugins: this.getAllPlugins(),
      activePlugins: this.getActivePlugins(),
      pluginPaths: this.pluginPaths
    };
  }

  static printStatus() {
    console.log('🔌 Plugin Manager Status:');
    console.log(`📊 Plugins: ${this.activePlugins.size}/${this.plugins.size} active`);
    
    if (this.plugins.size > 0) {
      console.log('📋 Plugin List:');
      this.plugins.forEach((plugin, name) => {
        const status = plugin.isActive ? '✅' : '⏸️';
        const displayName = plugin.manifest.displayName || name;
        console.log(`  ${status} ${displayName} (v${plugin.manifest.version})`);
      });
    }
  }
}

// Global registration
window.EnderTrack = window.EnderTrack || {};
window.EnderTrack.PluginManager = PluginManager;

// Expose for HTML onclick handlers
window.showPluginSelector = () => PluginManager.showPluginSelector();