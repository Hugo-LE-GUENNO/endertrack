#!/usr/bin/env python3
# Terminal série simple pour communiquer avec l'Enderscope

import serial
import threading
import sys

def read_from_port(ser):
    """Lit en continu depuis le port série"""
    while True:
        try:
            if ser.in_waiting > 0:
                data = ser.read(ser.in_waiting).decode('utf-8', errors='ignore')
                if data.strip():
                    print(f"<< {data.strip()}")
        except:
            break

def main():
    try:
        print("🔍 Terminal série pour Enderscope")
        print("Port: /dev/ttyUSB0, Baudrate: 115200")
        print("Tapez vos commandes G-code. 'quit' pour quitter.")
        print("-" * 50)
        
        # Ouvrir le port série
        ser = serial.Serial('/dev/ttyUSB0', 115200, timeout=1)
        
        # Thread pour lire les réponses
        reader_thread = threading.Thread(target=read_from_port, args=(ser,))
        reader_thread.daemon = True
        reader_thread.start()
        
        # Boucle principale pour envoyer des commandes
        while True:
            try:
                command = input(">> ").strip()
                
                if command.lower() == 'quit':
                    break
                
                if command:
                    # Envoyer la commande
                    ser.write(f"{command}\n".encode('utf-8'))
                    print(f">> {command}")
                    
            except KeyboardInterrupt:
                break
        
        ser.close()
        print("\n🔌 Terminal fermé")
        
    except Exception as e:
        print(f"💥 Erreur: {e}")

if __name__ == "__main__":
    main()