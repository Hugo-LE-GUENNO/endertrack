// core/coordinator.js - Module coordination and communication
// Coordinates communication between different modules

class ModuleCoordinator {
  constructor() {
    this.modules = new Map();
    this.dependencies = new Map();
    this.initializationOrder = [];
    this.isInitialized = false;
  }

  static init() {
    console.log('🔗 Initializing Module Coordinator...');
    
    // Register core modules
    this.registerCoreModules();
    
    // Setup inter-module communication
    this.setupCommunication();
    
    this.isInitialized = true;
    console.log('✅ Module Coordinator initialized');
    
    return true;
  }

  static registerCoreModules() {
    // Register modules with their dependencies
    this.registerModule('State', {
      instance: window.EnderTrack.State,
      dependencies: [],
      priority: 1
    });
    
    this.registerModule('Events', {
      instance: window.EnderTrack.Events,
      dependencies: [],
      priority: 1
    });
    
    this.registerModule('Math', {
      instance: window.EnderTrack.Math,
      dependencies: [],
      priority: 2
    });
    
    this.registerModule('Graphics', {
      instance: window.EnderTrack.Graphics,
      dependencies: [],
      priority: 2
    });
    
    this.registerModule('Validation', {
      instance: window.EnderTrack.Validation,
      dependencies: ['Math'],
      priority: 2
    });
    
    this.registerModule('Coordinates', {
      instance: window.EnderTrack.Coordinates,
      dependencies: ['Math'],
      priority: 3
    });
    
    this.registerModule('Canvas', {
      instance: window.EnderTrack.Canvas,
      dependencies: ['State', 'Events', 'Coordinates'],
      priority: 4
    });
    
    this.registerModule('CanvasRenderer', {
      instance: window.EnderTrack.CanvasRenderer,
      dependencies: ['Graphics', 'Coordinates'],
      priority: 4
    });
    
    this.registerModule('CanvasInteractions', {
      instance: window.EnderTrack.CanvasInteractions,
      dependencies: ['Events', 'Coordinates', 'KeyboardUtils'],
      priority: 5
    });
    
    this.registerModule('Movement', {
      instance: window.EnderTrack.Movement,
      dependencies: ['State', 'Events', 'Math'],
      priority: 5
    });
    
    this.registerModule('Navigation', {
      instance: window.EnderTrack.Navigation,
      dependencies: ['State', 'Movement'],
      priority: 6
    });
    
    this.registerModule('UI.Notifications', {
      instance: window.EnderTrack.UI?.Notifications,
      dependencies: ['Events'],
      priority: 6
    });
    
    this.registerModule('UI.Modals', {
      instance: window.EnderTrack.UI?.Modals,
      dependencies: ['Events'],
      priority: 6
    });
    
    this.registerModule('UI.Controls', {
      instance: window.EnderTrack.UI?.Controls,
      dependencies: ['State', 'Events'],
      priority: 7
    });
    
    this.registerModule('UI.Panels', {
      instance: window.EnderTrack.UI?.Panels,
      dependencies: ['Events'],
      priority: 7
    });
    
    this.registerModule('UI.Tabs', {
      instance: window.EnderTrack.UI?.Tabs,
      dependencies: ['Events'],
      priority: 7
    });
  }

  static registerModule(name, config) {
    const {
      instance,
      dependencies = [],
      priority = 5,
      optional = false
    } = config;

    this.modules.set(name, {
      name,
      instance,
      dependencies,
      priority,
      optional,
      isInitialized: false,
      initializationTime: null
    });

    this.dependencies.set(name, dependencies);
  }

  static setupCommunication() {
    // Setup cross-module event handlers
    this.setupStateCoordination();
    this.setupCanvasCoordination();
    this.setupNavigationCoordination();
    this.setupUICoordination();
  }

  static setupStateCoordination() {
    // Coordinate state changes across modules
    EnderTrack.Events?.on?.('state:changed', (newState, oldState) => {
      // Update coordinate system when map parameters change
      if (newState.mapSizeMm !== oldState.mapSizeMm ||
          newState.zoom !== oldState.zoom ||
          newState.panX !== oldState.panX ||
          newState.panY !== oldState.panY) {
        
        if (EnderTrack.Coordinates) {
          EnderTrack.Coordinates.updateParameters({
            mapSizeMm: newState.mapSizeMm,
            zoom: newState.zoom,
            panX: newState.panX,
            panY: newState.panY
          });
        }
      }
      
      // Update UI controls when state changes
      if (EnderTrack.UI?.Controls) {
        EnderTrack.UI.Controls.syncWithState();
      }
      
      // Request canvas render
      if (EnderTrack.Canvas) {
        EnderTrack.Canvas.requestRender();
      }
    });
  }

  static setupCanvasCoordination() {
    // Coordinate canvas interactions with other systems
    EnderTrack.Events?.on?.('canvas:clicked', (event) => {
      const { map } = event;
      
      // Handle click-to-move if enabled
      const state = EnderTrack.State?.get?.();
      if (state?.enableClickGo && state?.inputMode === 'absolute') {
        if (EnderTrack.Movement) {
          EnderTrack.Movement.moveAbsolute(map.x, map.y, state.pos.z);
        }
      }
    });
    
    // Setup canvas interactions when canvas is ready
    EnderTrack.Events?.on?.('canvas:initialized', (canvas) => {
      if (EnderTrack.CanvasInteractions) {
        EnderTrack.CanvasInteractions.init(canvas);
      }
    });
  }

  static setupNavigationCoordination() {
    // Coordinate navigation with movement system
    EnderTrack.Events?.on?.('navigation:move_requested', (direction) => {
      if (EnderTrack.Movement) {
        EnderTrack.Movement.moveDirection(direction);
      }
    });
    
    // Update position inputs when position changes
    EnderTrack.Events?.on?.('movement:completed', (result) => {
      if (result.success && EnderTrack.UI?.Controls) {
        const state = EnderTrack.State?.get?.();
        if (state) {
          EnderTrack.UI.Controls.setValue('inputX', state.pos.x);
          EnderTrack.UI.Controls.setValue('inputY', state.pos.y);
          EnderTrack.UI.Controls.setValue('inputZ', state.pos.z);
        }
      }
    });
  }

  static setupUICoordination() {
    // Coordinate UI updates
    EnderTrack.Events?.on?.('ui:notification', (notification) => {
      // Log important notifications
      if (notification.type === 'error') {
        console.error('UI Error:', notification.message);
      }
    });
    
    // Coordinate tab switching with state
    EnderTrack.Events?.on?.('tab:switched', (event) => {
      EnderTrack.State?.update?.({ activeTab: event.to });
    });
    
    // Handle plugin activation
    EnderTrack.Events?.on?.('plugin:activated', (pluginData) => {
      if (EnderTrack.UI?.Notifications) {
        EnderTrack.UI.Notifications.showPluginStatus(pluginData.name, 'activated');
      }
    });
  }

  // Module lifecycle management
  static async initializeModules() {
    console.log('🔄 Initializing modules in dependency order...');
    
    const initOrder = this.calculateInitializationOrder();
    const results = [];
    
    for (const moduleName of initOrder) {
      const result = await this.initializeModule(moduleName);
      results.push({ module: moduleName, success: result });
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Module initialization complete: ${successful} successful, ${failed} failed`);
    
    return results;
  }

  static async initializeModule(moduleName) {
    const moduleConfig = this.modules.get(moduleName);
    if (!moduleConfig) {
      console.warn(`Module not found: ${moduleName}`);
      return false;
    }
    
    if (moduleConfig.isInitialized) {
      return true; // Already initialized
    }
    
    // Check dependencies
    const missingDeps = this.checkDependencies(moduleName);
    if (missingDeps.length > 0) {
      console.error(`Missing dependencies for ${moduleName}:`, missingDeps);
      return false;
    }
    
    try {
      const startTime = performance.now();
      
      // Initialize module if it has an init method
      if (moduleConfig.instance && typeof moduleConfig.instance.init === 'function') {
        await moduleConfig.instance.init();
      }
      
      const endTime = performance.now();
      
      moduleConfig.isInitialized = true;
      moduleConfig.initializationTime = endTime - startTime;
      
      console.log(`✅ ${moduleName} initialized in ${moduleConfig.initializationTime.toFixed(1)}ms`);
      
      // Emit initialization event
      EnderTrack.Events?.emit?.('module:initialized', {
        name: moduleName,
        time: moduleConfig.initializationTime
      });
      
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to initialize ${moduleName}:`, error);
      
      if (!moduleConfig.optional) {
        throw error; // Re-throw for critical modules
      }
      
      return false;
    }
  }

  static calculateInitializationOrder() {
    const modules = Array.from(this.modules.keys());
    const visited = new Set();
    const visiting = new Set();
    const order = [];
    
    const visit = (moduleName) => {
      if (visited.has(moduleName)) return;
      if (visiting.has(moduleName)) {
        throw new Error(`Circular dependency detected involving ${moduleName}`);
      }
      
      visiting.add(moduleName);
      
      const moduleConfig = this.modules.get(moduleName);
      if (moduleConfig) {
        // Visit dependencies first
        moduleConfig.dependencies.forEach(dep => {
          if (this.modules.has(dep)) {
            visit(dep);
          }
        });
      }
      
      visiting.delete(moduleName);
      visited.add(moduleName);
      order.push(moduleName);
    };
    
    // Sort by priority first, then resolve dependencies
    const sortedModules = modules.sort((a, b) => {
      const priorityA = this.modules.get(a)?.priority || 5;
      const priorityB = this.modules.get(b)?.priority || 5;
      return priorityA - priorityB;
    });
    
    sortedModules.forEach(visit);
    
    return order;
  }

  static checkDependencies(moduleName) {
    const dependencies = this.dependencies.get(moduleName) || [];
    const missing = [];
    
    dependencies.forEach(dep => {
      const depModule = this.modules.get(dep);
      if (!depModule || !depModule.instance) {
        missing.push(dep);
      }
    });
    
    return missing;
  }

  // Communication helpers
  static broadcast(event, data) {
    EnderTrack.Events?.emit?.(event, data);
  }

  static request(moduleName, method, ...args) {
    const moduleConfig = this.modules.get(moduleName);
    if (!moduleConfig || !moduleConfig.instance) {
      throw new Error(`Module ${moduleName} not available`);
    }
    
    const instance = moduleConfig.instance;
    if (typeof instance[method] !== 'function') {
      throw new Error(`Method ${method} not found on module ${moduleName}`);
    }
    
    return instance[method](...args);
  }

  static async requestAsync(moduleName, method, ...args) {
    const result = this.request(moduleName, method, ...args);
    return Promise.resolve(result);
  }

  // Health monitoring
  static getModuleHealth() {
    const health = {
      total: this.modules.size,
      initialized: 0,
      failed: 0,
      modules: {}
    };
    
    this.modules.forEach((config, name) => {
      const status = {
        initialized: config.isInitialized,
        initTime: config.initializationTime,
        hasInstance: !!config.instance,
        dependencies: config.dependencies,
        optional: config.optional
      };
      
      if (config.isInitialized) {
        health.initialized++;
      } else if (!config.optional) {
        health.failed++;
      }
      
      health.modules[name] = status;
    });
    
    return health;
  }

  static diagnoseIssues() {
    const issues = [];
    
    this.modules.forEach((config, name) => {
      // Check for missing instances
      if (!config.instance) {
        issues.push({
          type: 'missing_instance',
          module: name,
          severity: config.optional ? 'warning' : 'error',
          message: `Module ${name} has no instance`
        });
      }
      
      // Check for unmet dependencies
      const missingDeps = this.checkDependencies(name);
      if (missingDeps.length > 0) {
        issues.push({
          type: 'missing_dependencies',
          module: name,
          severity: 'error',
          message: `Module ${name} missing dependencies: ${missingDeps.join(', ')}`
        });
      }
      
      // Check for initialization failures
      if (!config.isInitialized && !config.optional) {
        issues.push({
          type: 'initialization_failed',
          module: name,
          severity: 'error',
          message: `Critical module ${name} failed to initialize`
        });
      }
    });
    
    return issues;
  }

  // Debug information
  static getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      moduleCount: this.modules.size,
      initializationOrder: this.calculateInitializationOrder(),
      health: this.getModuleHealth(),
      issues: this.diagnoseIssues()
    };
  }

  static printStatus() {
    console.log('🔗 Module Coordinator Status:');
    
    const health = this.getModuleHealth();
    console.log(`📊 Modules: ${health.initialized}/${health.total} initialized`);
    
    if (health.failed > 0) {
      console.warn(`⚠️ ${health.failed} critical modules failed`);
    }
    
    const issues = this.diagnoseIssues();
    if (issues.length > 0) {
      console.log('🔍 Issues found:');
      issues.forEach(issue => {
        const icon = issue.severity === 'error' ? '❌' : '⚠️';
        console.log(`  ${icon} ${issue.module}: ${issue.message}`);
      });
    } else {
      console.log('✅ No issues detected');
    }
  }
}

// Global registration
window.EnderTrack = window.EnderTrack || {};
window.EnderTrack.Coordinator = ModuleCoordinator;