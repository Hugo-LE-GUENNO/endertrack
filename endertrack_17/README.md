# EnderTrack 2.0 - 3D Position Simulator

🎯 **Simulateur de positionnement 3D avec intégration IA pour le contrôle d'équipement de laboratoire**

## 🌟 Fonctionnalités Principales

- **Suivi de position 3D** - Coordonnées X,Y,Z en temps réel (mm)
- **Modes de navigation duaux** - Positionnement absolu et mouvement relatif
- **Système de planification** - Listes multiples et templates
- **Assistant IA "Enderman"** - Reconnaissance vocale et synthèse vocale
- **Système de templates** - Boîtes de Pétri, microplaques, lames
- **Visualisation canvas temps réel** - Zoom/pan avec axe Z
- **Historique des positions** - Graphiques et sauvegarde
- **Arrêt d'urgence** - Sécurité intégrée
- **Architecture modulaire** - Système de plugins extensible

## 🏗️ Architecture

### Structure Modulaire
```
endertrack_5/
├── index.html                 # Interface HTML principale
├── main.js                    # Bootstrap minimal (50 lignes)
├── endertrack.css             # Feuille de style principale
├── config.json                # Configuration application
├── 
├── core/                      # Logique application principale
│   ├── app.js                 # Contrôleur application
│   ├── renderer.js            # Moteur de rendu principal
│   ├── coordinator.js         # Coordination des modules
│   ├── plugin-manager.js      # Gestionnaire de plugins
│   └── api.js                 # Interface API externe
├── 
├── modules/                   # Modules système principaux
│   ├── state/                 # Gestion d'état centralisée
│   ├── canvas/                # Système canvas et rendu
│   ├── navigation/            # Contrôles de navigation
│   ├── ui/                    # Composants interface utilisateur
│   └── utils/                 # Utilitaires réutilisables
├── 
├── plugins/                   # Système de plugins
│   ├── core-plugins/          # Plugins intégrés
│   │   ├── lists/             # Gestion des listes
│   │   ├── sequences/         # Séquences d'automatisation
│   │   ├── drivers/           # Contrôle équipement (ENDERSCOPE)
│   │   ├── enderman/          # Assistant IA
│   │   └── settings/          # Configuration
│   └── user-plugins/          # Plugins utilisateur
├── 
├── enderscope/                # Module contrôle matériel
│   ├── enderscope.py          # Classes Python matériel
│   ├── enderscope.js          # Pont JavaScript
│   ├── hardware-server.py    # Serveur Flask
│   └── drivers/               # Pilotes équipement
├── 
├── server/                    # Services backend
│   ├── ai-agent.py            # Agent IA Python
│   └── voice-service.py       # Service reconnaissance vocale
└── 
└── templates/                 # Templates laboratoire
    ├── petri_35mm.svg         # Boîte de Pétri 35mm
    ├── microplate_96.json     # Microplaque 96 puits
    └── ...
```

## 🚀 Installation et Démarrage

### Prérequis
- **Python 3.8+** (pour les services IA et matériel)
- **Navigateur moderne** (Chrome, Firefox, Safari, Edge)
- **Serveur web local** (Python http.server ou autre)

### Installation Rapide

1. **Cloner le projet**
```bash
git clone https://github.com/endertrack/endertrack.git
cd endertrack_5
```

2. **Installer les dépendances Python**
```bash
pip install flask flask-cors gtts speech-recognition pydub requests pyserial numpy
```

3. **Démarrer les services**

**Terminal 1 - Application principale:**
```bash
python -m http.server 8000
```

**Terminal 2 - Service IA (optionnel):**
```bash
cd server
python ai-agent.py
```

**Terminal 3 - Service vocal (optionnel):**
```bash
cd server
python voice-service.py
```

**Terminal 4 - Serveur matériel (optionnel):**
```bash
cd enderscope
python hardware-server.py
```

4. **Ouvrir l'application**
```
http://localhost:8000
```

## 🎮 Utilisation

### Interface Principale

L'interface est organisée en **3 colonnes** :

- **Panneau Gauche (400px)** - Contrôles et modes
- **Panneau Central (flexible)** - Visualisation canvas
- **Panneau Droit (250px)** - État et historique

### Modes de Navigation

#### Mode Relatif (par défaut)
- **Flèches directionnelles** - Mouvement principal
- **Contrôles de sensibilité** - X, Y, Z avec verrouillage
- **Couplage XY** - Mouvement coordonné (activé par défaut)
- **Presets** - Fine (0.1mm) / Coarse (5mm)

#### Mode Absolu
- **Coordonnées X,Y,Z** - Saisie directe
- **Bouton "Aller à la Position"** - Mouvement précis
- **Boutons Home** - Retour origine XY ou XYZ

### Raccourcis Clavier

| Touche | Action |
|--------|--------|
| `↑↓←→` | Mouvement directionnel |
| `WASD` | Mouvement alternatif |
| `Page Up/Down` | Mouvement Z |
| `Q/E` | Mouvement Z alternatif |
| `Tab` | Basculer mode relatif/absolu |
| `Escape` | Arrêt d'urgence |
| `Home` | Retour origine XY |
| `Ctrl+Home` | Retour origine XYZ |
| `F1` | Aide raccourcis |
| `Ctrl+S` | Sauvegarder état |

### Visualisation Z

Le **panneau de visualisation Z** (à droite du canvas) affiche :
- **Échelle verticale** avec graduations en mm
- **Marqueur position actuelle** - Point coloré + valeur
- **Aperçu mouvement** - Prévisualisation en mode relatif
- **Historique Z** - Trace des dernières positions

## 🤖 Assistant IA Enderman

### Configuration
1. **Obtenir une clé API Mammouth.ai**
2. **Modifier `server/ai-agent.py`** :
```python
api_key = "sk-VOTRE-CLE-MAMMOUTH-AI-ICI"
```

### Commandes Vocales
- **"va à gauche"** - Mouvement relatif
- **"3 lames microscope"** - Création template + positions
- **"origine"** - Retour position d'origine
- **"exécute"** - Lancement séquence
- **"sensibilité 2"** - Modification sensibilité

### Fonctionnalités IA
- **Mémoire contextuelle** - Retient les 5 dernières interactions
- **Commandes naturelles** - Compréhension langage naturel
- **Contrôle équipement** - Interface avec Enderscope
- **Fallback local** - Fonctionnement hors ligne
- **Synthèse vocale** - Réponses audio avec Google TTS

## 🔬 Intégration Enderscope

### Module Matériel
Le dossier `enderscope/` contient le **cœur du contrôle matériel** :

- **`enderscope.py`** - Classes Python pour matériel
  - `Stage` - Contrôle stage motorisé 3 axes
  - `Enderlights` - Contrôle éclairage RGB
  - `ScanPatterns` - Génération motifs de scan
  - `SerialUtils` - Communication série

- **`enderscope.js`** - Pont JavaScript vers Python
- **`hardware-server.py`** - Serveur Flask temps réel
- **`drivers/`** - Wrappers spécialisés par équipement

### API Enderscope
```javascript
// Interface Stage
await EnderscopeStage.moveAbsolute(x, y, z);
await EnderscopeStage.moveRelative(dx, dy, dz);
await EnderscopeStage.home();
const pos = await EnderscopeStage.getPosition();

// Interface Enderlights
await EnderscopeLights.setColor(r, g, b);
await EnderscopeLights.shutter(true/false);

// Interface ScanPatterns
const points = EnderscopePatterns.generateRaster(cols, rows);
const spiral = EnderscopePatterns.generateSpiral(numPoints);
```

## 🔌 Système de Plugins

### Plugins Principaux

#### 📋 Lists - Gestion des Listes
- **Listes multiples** - Création et gestion
- **Modes de saisie** - Manuel, auto, XYZ
- **Templates intégrés** - Boîtes de Pétri, microplaques
- **Exécution séquences** - Parcours automatique

#### 🔄 Sequences - Automatisation
- **Séquences temporelles** - Programmation dans le temps
- **Protocoles complexes** - Multi-étapes avec conditions
- **Scheduler intégré** - Exécution différée
- **Gestion d'erreurs** - Reprise automatique

#### 🔬 Drivers - Contrôle Équipement
- **Interface Enderscope** - Contrôle matériel unifié
- **Protocoles d'acquisition** - Time-lapse, multi-canaux, Z-stack
- **Gestion données** - Sauvegarde images et métadonnées
- **Monitoring temps réel** - État équipement

#### 🤖 Enderman - Assistant IA
- **Reconnaissance vocale** - Commandes naturelles
- **Synthèse vocale** - Réponses audio
- **Mémoire contextuelle** - Conversations intelligentes
- **Contrôle intégré** - Interface avec tous les modules

#### ⚙️ Settings - Configuration
- **Paramètres application** - Personnalisation interface
- **Calibration matériel** - Configuration Enderscope
- **Gestion utilisateurs** - Profils et préférences
- **Import/Export** - Sauvegarde configuration

### Développement de Plugins

#### Structure Plugin
```
plugins/user-plugins/mon-plugin/
├── plugin.json          # Manifeste (OBLIGATOIRE)
├── main.js              # Code principal (OBLIGATOIRE)
├── ui.html              # Template interface (optionnel)
├── style.css            # Styles (optionnel)
└── README.md            # Documentation (recommandé)
```

#### Manifeste Plugin (plugin.json)
```json
{
  "name": "mon-plugin",
  "displayName": "Mon Plugin",
  "version": "1.0.0",
  "description": "Description de mon plugin",
  "author": "Mon Nom",
  "type": "user",
  "icon": "🔌",
  "main": "main.js",
  "dependencies": ["canvas", "navigation"],
  "permissions": ["canvas-write", "state-write"]
}
```

#### Classe Plugin (main.js)
```javascript
class MonPlugin {
  async init() {
    console.log('Initialisation de mon plugin');
    this.setupUI();
    this.registerAPI();
    return true;
  }
  
  async activate() {
    this.showUI();
    return true;
  }
  
  deactivate() {
    this.hideUI();
  }
  
  setupUI() {
    // Configuration interface
  }
  
  registerAPI() {
    // Enregistrement fonctions API
    EnderTrack.API.register('maFonction', this.maFonction.bind(this));
  }
  
  maFonction() {
    // Logique du plugin
  }
}

// Enregistrement global
window.EnderTrack.Plugins.MonPlugin = new MonPlugin();
```

## 📊 API et Intégration

### API Principale
```javascript
// Mouvement
await EnderTrack.API.call('moveAbsolute', x, y, z);
await EnderTrack.API.call('moveRelative', dx, dy, dz);
await EnderTrack.API.call('goHome', 'xy');

// État
const pos = EnderTrack.API.call('getCurrentPosition');
const state = EnderTrack.API.call('getState');
EnderTrack.API.call('updateState', { inputMode: 'absolute' });

// Interface utilisateur
EnderTrack.API.call('showNotification', 'Message', 'success');
const modalId = EnderTrack.API.call('showModal', { title: 'Titre', content: 'Contenu' });

// Canvas
EnderTrack.API.call('drawCircle', x, y, radius, color);
EnderTrack.API.call('drawLine', x1, y1, x2, y2, color);

// Événements
EnderTrack.API.call('on', 'movement:completed', callback);
EnderTrack.API.call('emit', 'custom:event', data);
```

### Événements Système
```javascript
// Événements de position
'position:changed'        // Position mise à jour
'movement:started'        // Mouvement commencé
'movement:completed'      // Mouvement terminé

// Événements d'état
'state:changed'           // État application modifié
'tab:switched'            // Onglet changé

// Événements canvas
'canvas:clicked'          // Clic sur canvas
'canvas:rendered'         // Rendu terminé

// Événements plugins
'plugin:loaded'           // Plugin chargé
'plugin:activated'        // Plugin activé
```

## 🎨 Personnalisation

### Thèmes et Couleurs
Modifier `endertrack.css` ou `config.json` :
```css
:root {
  --primary: #0b84ff;
  --background: #f6f8fb;
  --panel: #ffffff;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
}
```

### Templates Personnalisés
Créer dans `templates/` :
- **Fichier SVG** - Représentation visuelle
- **Fichier JSON** - Coordonnées des positions
- **Enregistrement** dans `config.json`

### Configuration Avancée
Modifier `config.json` pour :
- **Limites de coordonnées**
- **Vitesses par défaut**
- **Raccourcis clavier**
- **Paramètres IA**
- **Configuration matériel**

## 🔧 Dépannage

### Problèmes Courants

#### L'application ne se charge pas
- Vérifier que le serveur web fonctionne sur le port 8000
- Ouvrir la console développeur (F12) pour voir les erreurs
- Vérifier que tous les fichiers sont présents

#### L'IA ne répond pas
- Vérifier que `ai-agent.py` fonctionne sur le port 3002
- Configurer la clé API Mammouth.ai
- Tester la connexion : `http://localhost:3002/status`

#### La reconnaissance vocale ne fonctionne pas
- Vérifier que `voice-service.py` fonctionne sur le port 3001
- Autoriser l'accès au microphone dans le navigateur
- Installer les dépendances : `pip install gtts speech-recognition pydub`

#### Les plugins ne se chargent pas
- Vérifier la structure des dossiers `plugins/`
- Contrôler la syntaxe des fichiers `plugin.json`
- Consulter la console pour les erreurs de chargement

### Logs et Debug
- **Console navigateur** (F12) - Erreurs JavaScript
- **Terminal serveurs** - Erreurs Python
- **Mode debug** - Activer dans `config.json`
```json
{
  "debug": {
    "enabled": true,
    "showFPS": true,
    "logLevel": "debug"
  }
}
```

## 📈 Performance

### Optimisations
- **Rendu 60 FPS** - Limitation automatique
- **Historique limité** - 1000 positions max
- **Compression état** - Sauvegarde optimisée
- **Chargement lazy** - Plugins à la demande

### Monitoring
```javascript
// Statistiques de rendu
const stats = EnderTrack.Renderer.getRenderStats();
console.log(`FPS: ${stats.actualFPS}, Render: ${stats.lastFrameTime}ms`);

// État des modules
EnderTrack.Coordinator.printStatus();

// Informations plugins
EnderTrack.PluginManager.printStatus();
```

## 🤝 Contribution

### Développement
1. **Fork** le projet
2. **Créer une branche** pour votre fonctionnalité
3. **Tester** vos modifications
4. **Soumettre une Pull Request**

### Structure de Commit
```
type(scope): description

feat(navigation): add keyboard shortcuts
fix(canvas): resolve rendering issue
docs(readme): update installation guide
```

### Tests
```bash
# Tester l'API
EnderTrack.API.test();

# Tester la persistance
EnderTrack.Persistence.test();

# Tester les modules
EnderTrack.Coordinator.diagnoseIssues();
```

## 📄 Licence

**MIT License** - Voir le fichier `LICENSE` pour les détails.

## 🙏 Remerciements

- **Mammouth.ai** - Intégration IA
- **Google TTS** - Synthèse vocale
- **Flask** - Services backend
- **Canvas API** - Visualisation 2D
- **Communauté open source** - Inspiration et outils

## 📞 Support

- **Issues GitHub** - Rapporter des bugs
- **Discussions** - Questions et suggestions
- **Wiki** - Documentation détaillée
- **Email** - contact@endertrack.com

---

**EnderTrack 2.0** - *Simulateur de positionnement 3D nouvelle génération* 🚀