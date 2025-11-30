# 🌐 Universal Input Controller - EnderTrack

## 🎯 Vue d'ensemble

Le **Universal Input Controller** permet de contrôler EnderTrack avec **tous types de périphériques d'entrée** :

- 🎹 **MIDI** - Claviers, contrôleurs, MPK Mini
- 🎮 **Gamepad** - Manettes Xbox, PlayStation, génériques  
- ⌨️ **Clavier** - Touches personnalisées
- 🔌 **HID** - Périphériques USB génériques

## 🚀 Démarrage Rapide

### 1. Lancer le Bridge Universel
```bash
./start-universal-bridge.sh
```

### 2. Ouvrir EnderTrack
```bash
python -m http.server 8000
# Puis http://localhost:8000
```

### 3. Activer le Contrôleur
1. Aller dans **Autres** → **🎮 Contrôleur Universel**
2. Sélectionner votre périphérique
3. Configurer le mapping

## 🎮 Périphériques Supportés

### MIDI
- **Akai MPK Mini** - Testé et validé
- **Claviers MIDI** - Tous types
- **Contrôleurs** - Novation, Arturia, etc.

### Gamepad
- **Xbox Controller** - Sans fil et filaire
- **PlayStation** - DualShock, DualSense
- **Génériques** - Tous les gamepads USB

### HID
- **Boutons custom** - Arduino, périphériques DIY
- **Encodeurs rotatifs** - Contrôle précis
- **Joysticks** - Flight sticks, arcade

## ⚙️ Configuration

### Mapping Automatique
1. Cliquer sur **🗺️ Mapping Manuel**
2. Cliquer sur l'action à mapper (ex: "Haut")
3. Appuyer sur votre contrôle (bouton, touche, etc.)
4. Répéter pour chaque action

### Presets Disponibles
- **🎹 Preset MIDI** - Configuration Akai MPK
- **🎮 Preset Gamepad** - D-pad + gâchettes

### Actions Mappables
- **Haut/Bas** - Mouvement Y
- **Gauche/Droite** - Mouvement X  
- **Z+/Z-** - Mouvement Z
- **Extensible** - Nouvelles actions à venir

## 🔧 Architecture Technique

### Bridge Python (`universal-input-bridge.py`)
```python
# Détection automatique de tous les périphériques
devices = scan_midi_devices() + scan_gamepad_devices() + scan_hid_devices()

# Communication WebSocket temps réel
ws://localhost:8765
```

### Format de Message Universel
```json
{
  "device_id": "gamepad_0",
  "type": "button",
  "control": 12,
  "value": 1,
  "timestamp": 1234567890
}
```

### Interface JavaScript (`external-controller.js`)
- Détection automatique des périphériques
- Mapping flexible et sauvegarde
- Exécution des actions EnderTrack

## 🛠️ Dépendances

### Python
```bash
pip install websockets pygame
```

### Système (Ubuntu/Debian)
```bash
sudo apt install joystick alsa-utils
```

## 🔍 Dépannage

### Le bridge ne démarre pas
```bash
# Vérifier Python
python3 --version

# Installer les dépendances
pip3 install websockets pygame
```

### Gamepad non détecté
```bash
# Tester la détection
jstest /dev/input/js0

# Lister les périphériques
ls /dev/input/js*
```

### MIDI non détecté
```bash
# Lister les clients MIDI
aconnect -l

# Tester la réception
aseqdump -p 28:0
```

### WebSocket ne se connecte pas
- Vérifier que le bridge tourne sur le port 8765
- Vérifier les permissions firewall
- Tester avec `telnet localhost 8765`

## 📈 Évolutions Futures

### Périphériques Prévus
- **Souris 3D** - SpaceMouse, 3Dconnexion
- **Tablettes graphiques** - Wacom, Huion
- **Contrôleurs OSC** - TouchOSC, Lemur
- **Capteurs** - Leap Motion, Kinect

### Fonctionnalités Prévues
- **Macros** - Séquences d'actions
- **Profils** - Configuration par projet
- **Calibration** - Ajustement sensibilité
- **Feedback** - Retour haptique

## 🤝 Contribution

### Ajouter un Nouveau Type de Périphérique

1. **Fonction de scan** dans `universal-input-bridge.py`:
```python
def scan_nouveau_device(self):
    devices = []
    # Logique de détection
    return devices
```

2. **Listener** pour les événements:
```python
def start_nouveau_listener(self, device):
    # Logique d'écoute
    pass
```

3. **Icône** dans `external-controller.js`:
```javascript
getIcon(type) {
    return { nouveau: '🔥' }[type] || '🎮';
}
```

### Format de Contribution
- **Fork** le projet
- **Branche** feature/nouveau-device
- **Test** avec votre périphérique
- **Pull Request** avec documentation

## 📄 Licence

MIT License - Utilisation libre pour tous projets.

---

**Universal Input Controller** - *Contrôlez EnderTrack avec n'importe quel périphérique* 🌐