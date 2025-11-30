// modules/ui/plateau-templates.js - Gestion des profils de plateau

class PlateauTemplates {
  constructor() {
    this.templates = [];
    this.currentFilter = 'all';
  }

  async init() {
    await this.loadTemplates();
    return true;
  }

  async loadTemplates() {
    // Profils intégrés directement
    this.templates = [
      {
        "id": "ender2",
        "name": "Creality Ender-2",
        "brand": "Creality",
        "dimensions": { "x": 150, "y": 150, "z": 200 },
        "description": "Imprimante 3D compacte et abordable",
        "category": "Entry Level",
        "gcode": true
      },
      {
        "id": "ender3",
        "name": "Creality Ender-3",
        "brand": "Creality",
        "dimensions": { "x": 220, "y": 220, "z": 250 },
        "description": "Imprimante 3D populaire et polyvalente",
        "category": "Popular",
        "gcode": true
      },
      {
        "id": "ender3_pro",
        "name": "Creality Ender-3 Pro",
        "brand": "Creality",
        "dimensions": { "x": 220, "y": 220, "z": 250 },
        "description": "Version améliorée de l'Ender-3",
        "category": "Popular",
        "gcode": true
      },
      {
        "id": "ender3_v2",
        "name": "Creality Ender-3 V2",
        "brand": "Creality",
        "dimensions": { "x": 220, "y": 220, "z": 250 },
        "description": "Ender-3 avec écran couleur et améliorations",
        "category": "Popular",
        "gcode": true
      },
      {
        "id": "ender3_s1",
        "name": "Creality Ender-3 S1",
        "brand": "Creality",
        "dimensions": { "x": 220, "y": 220, "z": 270 },
        "description": "Ender-3 avec auto-leveling et extrudeur direct",
        "category": "Advanced",
        "gcode": true
      },
      {
        "id": "ender5",
        "name": "Creality Ender-5",
        "brand": "Creality",
        "dimensions": { "x": 220, "y": 220, "z": 300 },
        "description": "Structure cube stable avec plateau mobile en Z",
        "category": "Advanced",
        "gcode": true
      },
      {
        "id": "ender5_pro",
        "name": "Creality Ender-5 Pro",
        "brand": "Creality",
        "dimensions": { "x": 220, "y": 220, "z": 300 },
        "description": "Ender-5 avec améliorations premium",
        "category": "Advanced",
        "gcode": true
      },
      {
        "id": "cr10",
        "name": "Creality CR-10",
        "brand": "Creality",
        "dimensions": { "x": 300, "y": 300, "z": 400 },
        "description": "Grande imprimante 3D pour projets volumineux",
        "category": "Large Format",
        "gcode": true
      },
      {
        "id": "cr10_s5",
        "name": "Creality CR-10 S5",
        "brand": "Creality",
        "dimensions": { "x": 500, "y": 500, "z": 500 },
        "description": "Très grande imprimante 3D professionnelle",
        "category": "Large Format",
        "gcode": true
      },
      {
        "id": "prusa_mini",
        "name": "Prusa MINI+",
        "brand": "Prusa Research",
        "dimensions": { "x": 180, "y": 180, "z": 180 },
        "description": "Imprimante compacte de qualité premium",
        "category": "Premium",
        "gcode": true
      },
      {
        "id": "prusa_mk3s",
        "name": "Prusa i3 MK3S+",
        "brand": "Prusa Research",
        "dimensions": { "x": 250, "y": 210, "z": 210 },
        "description": "Référence en qualité d'impression",
        "category": "Premium",
        "gcode": true
      },
      {
        "id": "bambu_a1_mini",
        "name": "Bambu Lab A1 mini",
        "brand": "Bambu Lab",
        "dimensions": { "x": 180, "y": 180, "z": 180 },
        "description": "Imprimante automatisée compacte",
        "category": "Premium",
        "gcode": false
      },
      {
        "id": "bambu_x1_carbon",
        "name": "Bambu Lab X1 Carbon",
        "brand": "Bambu Lab",
        "dimensions": { "x": 256, "y": 256, "z": 256 },
        "description": "Imprimante haut de gamme ultra-rapide",
        "category": "Premium",
        "gcode": false
      },
      {
        "id": "anycubic_kobra",
        "name": "Anycubic Kobra",
        "brand": "Anycubic",
        "dimensions": { "x": 220, "y": 220, "z": 250 },
        "description": "Auto-leveling et facilité d'utilisation",
        "category": "Popular",
        "gcode": true
      },
      {
        "id": "artillery_sidewinder",
        "name": "Artillery Sidewinder X2",
        "brand": "Artillery",
        "dimensions": { "x": 300, "y": 300, "z": 400 },
        "description": "Grande imprimante avec écran tactile",
        "category": "Large Format",
        "gcode": true
      },
      {
        "id": "custom_small",
        "name": "Petit Stage Personnalisé",
        "brand": "Custom",
        "dimensions": { "x": 100, "y": 100, "z": 100 },
        "description": "Configuration pour petit stage de travail",
        "category": "Custom",
        "gcode": true
      },
      {
        "id": "custom_medium",
        "name": "Stage Moyen Personnalisé",
        "brand": "Custom",
        "dimensions": { "x": 200, "y": 200, "z": 150 },
        "description": "Configuration standard pour stage moyen",
        "category": "Custom",
        "gcode": true
      },
      {
        "id": "custom_large",
        "name": "Grand Stage Personnalisé",
        "brand": "Custom",
        "dimensions": { "x": 400, "y": 400, "z": 200 },
        "description": "Configuration pour grand stage de travail",
        "category": "Custom",
        "gcode": true
      }
    ];
  }

  openModal() {
    const modal = document.getElementById('templateModal');
    if (modal) {
      modal.style.display = 'flex';
      this.populateDropdown();
      this.resetModal();
    }
  }

  closeModal() {
    const modal = document.getElementById('templateModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  resetModal() {
    document.getElementById('templateSearch').value = '';
    document.getElementById('templateDropdown').value = '';
    document.getElementById('templateCard').style.display = 'none';
  }

  populateDropdown() {
    const dropdown = document.getElementById('templateDropdown');
    if (!dropdown) return;

    dropdown.innerHTML = '<option value="">-- Sélectionner --</option>';
    
    this.templates.forEach(template => {
      const option = document.createElement('option');
      option.value = template.id;
      option.textContent = `${template.name} (${template.dimensions.x}×${template.dimensions.y}×${template.dimensions.z}mm)`;
      dropdown.appendChild(option);
    });
  }

  filterDropdown(searchText) {
    const dropdown = document.getElementById('templateDropdown');
    if (!dropdown) return;

    const search = searchText.toLowerCase();
    
    if (search.length === 0) {
      dropdown.style.display = 'none';
      return;
    }
    
    // Filter profils
    const filtered = this.templates.filter(template => 
      template.name.toLowerCase().includes(search) ||
      template.brand.toLowerCase().includes(search)
    );
    
    // Repopulate dropdown with filtered profils
    dropdown.innerHTML = '';
    if (filtered.length === 0) {
      dropdown.innerHTML = '<option value="">Aucun résultat</option>';
    } else {
      filtered.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = `${template.name} (${template.brand})`;
        dropdown.appendChild(option);
      });
    }
    
    dropdown.style.display = 'block';
    dropdown.size = Math.min(6, Math.max(2, filtered.length));
    
    // Reset selection to force change event on first click
    dropdown.selectedIndex = -1;
  }

  showTemplateCard(templateId) {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) {
      console.warn('Profil not found:', templateId);
      return;
    }

    const card = document.getElementById('templateCard');
    if (!card) {
      console.warn('Profil card element not found');
      return;
    }

    const gcodeIcon = template.gcode ? '✅' : '❌';
    const gcodeClass = template.gcode ? 'supported' : 'not-supported';
    const gcodeText = template.gcode ? 'Compatible G-code' : 'Protocole propriétaire';

    card.innerHTML = `
      <div class="template-header">
        <div class="template-info">
          <h4>${template.name}</h4>
          <p class="template-brand">${template.brand}</p>
        </div>
        <div class="template-gcode ${gcodeClass}">
          ${gcodeIcon} ${gcodeText}
        </div>
      </div>
      
      <div class="template-details">
        <div class="template-dimensions">
          <h5>Dimensions</h5>
          <div class="dimensions-grid">
            <div class="dimension-item">
              <div class="dimension-label">X</div>
              <div class="dimension-value">${template.dimensions.x}</div>
            </div>
            <div class="dimension-item">
              <div class="dimension-label">Y</div>
              <div class="dimension-value">${template.dimensions.y}</div>
            </div>
            <div class="dimension-item">
              <div class="dimension-label">Z</div>
              <div class="dimension-value">${template.dimensions.z}</div>
            </div>
          </div>
        </div>
        
        <div class="template-description">
          <h5>Description</h5>
          <p>${template.description}</p>
        </div>
      </div>
      
      <div class="template-actions">
        <button class="template-cancel-btn" onclick="closeTemplateModal()">Annuler</button>
        <button class="template-apply-btn" onclick="window.PlateauTemplates.applyTemplate('${template.id}')">Appliquer</button>
      </div>
    `;
    
    card.style.display = 'block';
    console.log('Profil card displayed for:', template.name);
  }

  applyTemplate(templateId) {
    this.selectTemplate(templateId);
    this.closeModal();
  }

  selectTemplate(templateId) {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;

    // Update inputs
    const plateauX = document.getElementById('plateauX');
    const plateauY = document.getElementById('plateauY');
    const plateauZ = document.getElementById('plateauZ');

    if (plateauX) plateauX.value = template.dimensions.x;
    if (plateauY) plateauY.value = template.dimensions.y;
    if (plateauZ) plateauZ.value = template.dimensions.z;

    // Apply changes
    this.validateAndApply();
    
    // Update profile display in settings
    this.updateProfileDisplay(template);
    
    // Close modal
    this.closeModal();
    
    // Show notification
    if (window.EnderTrack?.UI?.showNotification) {
      window.EnderTrack.UI.showNotification(
        `Profil "${template.name}" appliqué`, 
        'success'
      );
    }
  }

  validateAndApply() {
    const plateauX = document.getElementById('plateauX');
    const plateauY = document.getElementById('plateauY');
    const plateauZ = document.getElementById('plateauZ');

    if (!plateauX || !plateauY || !plateauZ) return false;

    const x = parseInt(plateauX.value) || 200;
    const y = parseInt(plateauY.value) || 200;
    const z = parseInt(plateauZ.value) || 100;

    // Validate ranges
    const validX = Math.max(10, Math.min(1000, x));
    const validY = Math.max(10, Math.min(1000, y));
    const validZ = Math.max(10, Math.min(500, z));

    // Update inputs if clamped
    if (validX !== x) plateauX.value = validX;
    if (validY !== y) plateauY.value = validY;
    if (validZ !== z) plateauZ.value = validZ;

    // Update state
    if (window.EnderTrack?.State) {
      const newDimensions = { x: validX, y: validY, z: validZ };
      
      window.EnderTrack.State.update({
        plateauDimensions: newDimensions,
        mapSizeMm: Math.max(validX, validY)
      });

      // Update coordinate system
      if (window.EnderTrack?.Coordinates) {
        window.EnderTrack.Coordinates.updateParameters({
          plateauDimensions: newDimensions,
          mapSizeMm: Math.max(validX, validY)
        });
      }
      
      console.log('Dimensions mises à jour:', newDimensions);

      // Force canvas render
      if (window.EnderTrack?.Canvas) {
        window.EnderTrack.Canvas.requestRender();
      }
    }

    return true;
  }

  updateProfileDisplay(template) {
    // Update settings display
    const selectedProfile = document.getElementById('selectedProfile');
    const profileName = document.getElementById('profileName');
    const profileDimensions = document.getElementById('profileDimensions');
    
    if (selectedProfile && profileName && profileDimensions) {
      profileName.textContent = template.name;
      profileDimensions.textContent = `${template.dimensions.x}×${template.dimensions.y}×${template.dimensions.z}mm`;
      selectedProfile.style.display = 'block';
    }
    
    // Update canvas overlay display
    const profileInfo = document.getElementById('profileInfo');
    const profileNameCanvas = document.getElementById('profileNameCanvas');
    
    if (profileInfo && profileNameCanvas) {
      profileNameCanvas.textContent = template.name;
      profileInfo.style.display = 'inline';
    }
  }
}

// Global functions
function validatePlateauSize() {
  if (window.PlateauTemplates) {
    const success = window.PlateauTemplates.validateAndApply();
    
    if (success && window.EnderTrack?.UI?.showNotification) {
      window.EnderTrack.UI.showNotification(
        'Dimensions du plateau validées', 
        'success'
      );
    }
  }
}

function openTemplateModal() {
  if (window.PlateauTemplates) {
    window.PlateauTemplates.openModal();
  }
}

function closeTemplateModal() {
  if (window.PlateauTemplates) {
    window.PlateauTemplates.closeModal();
  }
}

function filterTemplateDropdown() {
  const searchText = document.getElementById('templateSearch').value;
  if (window.PlateauTemplates) {
    window.PlateauTemplates.filterDropdown(searchText);
    
    // Hide card when searching
    if (searchText.length > 0) {
      document.getElementById('templateCard').style.display = 'none';
    }
  }
}

function handleSearchKeydown(event) {
  const dropdown = document.getElementById('templateDropdown');
  
  if (!dropdown || dropdown.style.display === 'none') return;
  
  switch(event.key) {
    case 'ArrowDown':
      event.preventDefault();
      if (dropdown.selectedIndex < dropdown.options.length - 1) {
        dropdown.selectedIndex++;
      } else {
        dropdown.selectedIndex = 0;
      }
      break;
      
    case 'ArrowUp':
      event.preventDefault();
      if (dropdown.selectedIndex > 0) {
        dropdown.selectedIndex--;
      } else {
        dropdown.selectedIndex = dropdown.options.length - 1;
      }
      break;
      
    case 'Enter':
      event.preventDefault();
      if (dropdown.selectedIndex >= 0 && dropdown.options[dropdown.selectedIndex].value) {
        selectTemplate();
      }
      break;
      
    case 'Escape':
      dropdown.style.display = 'none';
      document.getElementById('templateSearch').focus();
      break;
  }
}

function handleDropdownKeydown(event) {
  const dropdown = document.getElementById('templateDropdown');
  const searchInput = document.getElementById('templateSearch');
  
  switch(event.key) {
    case 'Enter':
      event.preventDefault();
      if (dropdown.selectedIndex >= 0 && dropdown.options[dropdown.selectedIndex].value) {
        selectTemplate();
      }
      break;
      
    case 'Escape':
      dropdown.style.display = 'none';
      searchInput.focus();
      break;
  }
}

function selectTemplate() {
  const dropdown = document.getElementById('templateDropdown');
  const templateId = dropdown.value;
  
  if (templateId && templateId !== '' && window.PlateauTemplates) {
    const template = window.PlateauTemplates.templates.find(t => t.id === templateId);
    
    if (template) {
      // Update search input with selected template name
      document.getElementById('templateSearch').value = template.name;
      // Hide dropdown
      dropdown.style.display = 'none';
      // Show card
      window.PlateauTemplates.showTemplateCard(templateId);
    }
  } else {
    // Hide card if no valid selection
    const card = document.getElementById('templateCard');
    if (card) card.style.display = 'none';
  }
}

// Global instance
window.PlateauTemplates = new PlateauTemplates();