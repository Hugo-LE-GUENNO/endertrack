# enderscope-simple.py - Version simplifiée sans dépendances lourdes
# Seulement pyserial requis

import serial
import serial.tools.list_ports
import time

class SerialUtils:
    @staticmethod
    def serial_ports():
        """Liste les ports série disponibles"""
        ports = []
        for port in serial.tools.list_ports.comports():
            ports.append(port.device)
        return ports

class Stage:
    def __init__(self, port, baudrate=115200, homing=False):
        """Initialise la connexion avec l'Enderscope"""
        print(f"🔍 [DEBUG] Début initialisation Stage: {port} @ {baudrate}")
        
        self.port = port
        self.baudrate = baudrate
        self.position = {'X': 0.0, 'Y': 0.0, 'Z': 0.0}
        
        try:
            print(f"🔍 [DEBUG] Création objet Serial...")
            # Connexion série avec timeout
            self.ser = serial.Serial(port, baudrate, timeout=2)
            print(f"🔍 [DEBUG] Serial créé, attente 2s...")
            
            time.sleep(2)  # Attendre la connexion
            print(f"🔍 [DEBUG] Attente terminée")
            
            print(f"✅ Connecté à {port} à {baudrate} bauds")
            
            print(f"🔍 [DEBUG] Envoi G21...")
            # Configuration initiale simple
            self.send_gcode("G21")  # Unités en mm
            print(f"🔍 [DEBUG] G21 envoyé, envoi G90...")
            
            self.send_gcode("G90")  # Positionnement absolu
            print(f"🔍 [DEBUG] G90 envoyé")
            
            if homing:
                print(f"🔍 [DEBUG] Homing demandé...")
                self.home()
                
            print(f"🔍 [DEBUG] Initialisation Stage terminée avec succès")
                
        except Exception as e:
            print(f"❌ [DEBUG] Erreur connexion série: {e}")
            raise
    
    def send_gcode(self, command):
        """Envoie une commande G-code"""
        if not self.ser.is_open:
            raise Exception("Port série fermé")
        
        # Envoie la commande (format standard)
        if not command.endswith("\n"):
            command += "\n"
        
        self.ser.write(command.encode('utf-8'))
        # Pas d'attente de réponse - mode fire and forget
        return "sent"
    
    def move_absolute(self, x, y, z, feedrate=3000):
        """Mouvement absolu vers X, Y, Z"""
        command = f"G0 X{x} Y{y} Z{z}"
        response = self.send_gcode(command)
        
        # Met à jour la position
        self.position = {'X': float(x), 'Y': float(y), 'Z': float(z)}
        
        return response
    
    def move_relative(self, dx, dy, dz, feedrate=3000):
        """Mouvement relatif de dx, dy, dz"""
        # Passe en mode relatif
        self.send_gcode("G91")
        
        # Effectue le mouvement
        command = f"G0 X{dx} Y{dy} Z{dz}"
        response = self.send_gcode(command)
        
        # Repasse en mode absolu
        self.send_gcode("G90")
        
        
        # Met à jour la position
        self.position['X'] += float(dx)
        self.position['Y'] += float(dy)
        self.position['Z'] += float(dz)
        
        return response
    
    def home(self):
        """Retour à l'origine (homing)"""
        response = self.send_gcode("G28")  # Home tous les axes
        
        # Remet la position à zéro
        self.position = {'X': 0.0, 'Y': 0.0, 'Z': 0.0}
        
        return response
    
    def get_position(self, dict=False):
        """Récupère la position actuelle"""
        if dict:
            return self.position
        else:
            return self.position['X'], self.position['Y'], self.position['Z']
    
    def close(self):
        """Ferme la connexion série"""
        if self.ser and self.ser.is_open:
            self.ser.close()
            print("🔌 Connexion fermée")

# Test simple si exécuté directement
if __name__ == "__main__":
    print("🔬 Test Enderscope Simple")
    
    # Liste les ports
    ports = SerialUtils.serial_ports()
    print(f"Ports disponibles: {ports}")
    
    if ports:
        try:
            # Connexion au premier port
            stage = Stage(ports[0], homing=False)
            
            # Test de mouvement
            print("Test mouvement relatif...")
            stage.move_relative(1, 0, 0)
            
            print(f"Position: {stage.get_position(dict=True)}")
            
            # Fermeture
            stage.close()
            
        except Exception as e:
            print(f"❌ Erreur: {e}")
    else:
        print("❌ Aucun port série trouvé")