# enderscope-minimal.py - Version ultra-simple sans dépendances
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
        self.port = port
        self.baudrate = baudrate
        self.position = {'X': 0.0, 'Y': 0.0, 'Z': 0.0}
        
        # Connexion série ultra-simple
        self.ser = serial.Serial(port, baudrate, timeout=0.1)
        time.sleep(0.5)  # Attente courte
        
        print(f"✅ Connecté à {port} à {baudrate} bauds")
    
    def send_gcode(self, command):
        """Envoie une commande G-code sans attendre de réponse"""
        if not self.ser.is_open:
            raise Exception("Port série fermé")
        
        # Envoie juste la commande
        self.ser.write(f"{command}\n".encode())
        # Pas d'attente - fire and forget
        return "sent"
    
    def move_absolute(self, x, y, z, feedrate=3000):
        """Mouvement absolu vers X, Y, Z"""
        # Configuration
        self.send_gcode("G21")  # mm
        self.send_gcode("G90")  # absolu
        
        # Mouvement
        command = f"G1 X{x} Y{y} Z{z} F{feedrate}"
        self.send_gcode(command)
        
        # Met à jour la position
        self.position = {'X': float(x), 'Y': float(y), 'Z': float(z)}
        return "sent"
    
    def move_relative(self, dx, dy, dz, feedrate=3000):
        """Mouvement relatif de dx, dy, dz"""
        # Mode relatif
        self.send_gcode("G91")
        
        # Mouvement
        command = f"G1 X{dx} Y{dy} Z{dz} F{feedrate}"
        self.send_gcode(command)
        
        # Mode absolu
        self.send_gcode("G90")
        
        # Met à jour la position
        self.position['X'] += float(dx)
        self.position['Y'] += float(dy)
        self.position['Z'] += float(dz)
        
        return "sent"
    
    def home(self):
        """Retour à l'origine (homing)"""
        self.send_gcode("G28")  # Home tous les axes
        self.position = {'X': 0.0, 'Y': 0.0, 'Z': 0.0}
        return "sent"
    
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