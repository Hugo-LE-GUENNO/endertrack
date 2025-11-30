#!/usr/bin/env python3
# Test simple de la connexion série

import serial
import time

def test_serial():
    try:
        print("🔍 Test connexion série...")
        
        # Ouvrir le port
        ser = serial.Serial('/dev/ttyUSB0', 115200, timeout=1)
        print(f"✅ Port ouvert: {ser.is_open}")
        
        # Attendre un peu
        time.sleep(2)
        
        # Envoyer une commande simple
        print("📤 Envoi M115...")
        ser.write(b"M115\n")
        
        # Lire la réponse
        time.sleep(1)
        if ser.in_waiting > 0:
            response = ser.read(ser.in_waiting)
            print(f"📥 Réponse: {response}")
        else:
            print("❌ Aucune réponse")
        
        # Fermer
        ser.close()
        print("🔌 Port fermé")
        
    except Exception as e:
        print(f"💥 Erreur: {e}")

if __name__ == "__main__":
    test_serial()