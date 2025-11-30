# Plugin Contrôleur Externe - EnderTrack

## 🎮 Description

Ce plugin permet d'utiliser des contrôleurs externes (manettes de jeu, joysticks, claviers MIDI) pour contrôler EnderTrack et l'Enderscope.

## 🚀 Activation

1. Cliquez sur l'onglet **"Autres"** dans EnderTrack
2. Cliquez sur **"🎮 Contrôleur Externe"**
3. Le plugin s'active et un nouvel onglet apparaît

## 🎯 Contrôleurs Supportés

### 🎮 Manettes de Jeu
- **PlayStation 4/5** (USB/Bluetooth)
- **Xbox One/Series** (USB/Bluetooth)
- **Manettes génériques** compatibles Gamepad API

### 🎹 Contrôleurs MIDI
- **Akai MPK Mini** (preset inclus)
- **Claviers MIDI** génériques
- **Contrôleurs MIDI** avec boutons/potentiomètres

### ⌨️ Clavier
- **Touches personnalisées** pour chaque action
- **Mapping flexible** selon vos préférences

## 📋 Utilisation

### 1. Détection
- Connectez votre contrôleur (USB, Bluetooth, MIDI)
- Cliquez sur **"🔄 Actualiser"** pour détecter
- Votre contrôleur apparaît dans la liste

### 2. Sélection
- Cliquez sur **"Sélectionner"** à côté de votre contrôleur
- La section mapping devient disponible

### 3. Configuration

#### Option A : Presets
- Cliquez sur un preset (Akai MPK, PS4, Xbox)
- Le mapping se configure automatiquement

#### Option B : Mapping Manuel
- Cliquez sur un bouton d'action (Haut, Bas, etc.)
- Appuyez sur le bouton/touche de votre contrôleur
- Le mapping s'enregistre automatiquement

### 4. Sauvegarde
- Cliquez sur **"💾 Sauvegarder"** pour conserver votre configuration
- Utilisez **"📁 Charger"** pour restaurer une configuration

## 🎛️ Actions Disponibles

### Mouvement XY
- **Haut** - Mouvement Y+
- **Bas** - Mouvement Y-
- **Gauche** - Mouvement X-
- **Droite** - Mouvement X+

### Mouvement Z
- **Z+** - Mouvement Z vers le haut
- **Z-** - Mouvement Z vers le bas

### Actions Système
- **Home XY** - Retour origine XY
- **Home XYZ** - Retour origine XYZ
- **Arrêt** - Arrêt d'urgence

## 🔧 Configuration Akai MPK Mini

Pour votre **Akai MPK Mini**, le preset inclus utilise :
- **Joystick** (CC1/CC2) pour mouvement XY
- **Pad 1** (Note 36) pour Z+
- **Pad 2** (Note 37) pour Z-

### Configuration MPK Mini
1. Connectez votre MPK Mini en USB
2. Sélectionnez-le dans la liste
3. Cliquez sur **"🎹 Akai MPK"**
4. Testez les contrôles

## 🛠️ Dépannage

### Contrôleur non détecté
- Vérifiez la connexion USB/Bluetooth
- Cliquez sur "Actualiser"
- Redémarrez le navigateur si nécessaire

### MIDI ne fonctionne pas
- Autorisez l'accès MIDI dans le navigateur
- Vérifiez que le contrôleur MIDI est reconnu par l'OS

### Mapping ne répond pas
- Vérifiez que le contrôleur est sélectionné
- Testez le mapping en mode navigation
- Rechargez la configuration sauvegardée

## 💡 Conseils

- **Sauvegardez** votre configuration après mapping
- **Testez** chaque action avant utilisation
- **Utilisez les presets** pour un setup rapide
- **Mode historique** désactive temporairement les contrôleurs

## 🔗 Compatibilité

- **Navigateurs** : Chrome, Firefox, Edge (avec support Gamepad/MIDI)
- **OS** : Windows, macOS, Linux
- **EnderTrack** : Version 2.0+

## 📝 Notes Techniques

Le plugin utilise :
- **Gamepad API** pour les manettes
- **Web MIDI API** pour les contrôleurs MIDI
- **Keyboard Events** pour le clavier
- **Polling 60fps** pour la réactivité

Les mappings sont sauvegardés dans le localStorage du navigateur.