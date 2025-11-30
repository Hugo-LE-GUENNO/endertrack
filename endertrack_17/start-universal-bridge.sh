#!/bin/bash

echo "🌐 Universal Input Bridge - EnderTrack"
echo "======================================"

# Vérifier les dépendances Python
echo "🔍 Vérification des dépendances..."

MISSING_DEPS=""

# Vérifier websockets
python3 -c "import websockets" 2>/dev/null || MISSING_DEPS="$MISSING_DEPS websockets"

# Vérifier pygame (pour gamepad)
python3 -c "import pygame" 2>/dev/null || MISSING_DEPS="$MISSING_DEPS pygame"

if [ ! -z "$MISSING_DEPS" ]; then
    echo "❌ Dépendances manquantes: $MISSING_DEPS"
    echo "💡 Installation automatique..."
    pip3 install $MISSING_DEPS
fi

# Vérifier les outils système
echo "🔧 Vérification des outils système..."

if ! command -v jstest &> /dev/null; then
    echo "⚠️  jstest non trouvé (pour gamepad)"
    echo "💡 Installation: sudo apt install joystick"
fi

if ! command -v aseqdump &> /dev/null; then
    echo "⚠️  aseqdump non trouvé (pour MIDI)"
    echo "💡 Installation: sudo apt install alsa-utils"
fi

echo ""
echo "🚀 Démarrage Universal Input Bridge..."
echo "📡 WebSocket: ws://localhost:8765"
echo "🎮 Support: MIDI, Gamepad, HID, Clavier"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter"
echo ""

# Démarrer le bridge
python3 "$(dirname "$0")/universal-input-bridge.py"