#!/usr/bin/env python3
# Test différents baudrates

import serial
import time

def test_baudrate(baud):
    try:
        print(f"🔍 Test {baud} bauds...")
        ser = serial.Serial('/dev/ttyUSB0', baud, timeout=0.5)
        time.sleep(0.5)
        
        # Test plusieurs commandes
        commands = ['M115\n', 'G28\n', '?\n', 'help\n', 'version\n']
        
        for cmd in commands:
            ser.write(cmd.encode('utf-8'))
            time.sleep(0.2)
            
            if ser.in_waiting > 0:
                response = ser.read(ser.in_waiting).decode('utf-8', errors='ignore')
                if response.strip():
                    print(f"✅ {baud} bauds - Commande '{cmd.strip()}' -> '{response.strip()}'")
                    ser.close()
                    return True
        
        ser.close()
        return False
        
    except Exception as e:
        print(f"❌ {baud} bauds - Erreur: {e}")
        return False

def main():
    baudrates = [9600, 19200, 38400, 57600, 115200, 230400, 250000]
    
    print("🔍 Test de différents baudrates...")
    
    for baud in baudrates:
        if test_baudrate(baud):
            print(f"🎯 Baudrate fonctionnel trouvé: {baud}")
            break
    else:
        print("❌ Aucun baudrate ne fonctionne")

if __name__ == "__main__":
    main()