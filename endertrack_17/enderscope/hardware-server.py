#!/usr/bin/env python3
# enderscope/hardware-server.py - Flask server for Enderscope hardware control

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import time

# Add current directory to path to import enderscope module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import enderscope-simple for debugging
try:
    import importlib.util
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    simple_path = os.path.join(script_dir, "enderscope-simple.py")
    
    spec = importlib.util.spec_from_file_location("enderscope_simple", simple_path)
    enderscope_simple = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(enderscope_simple)
    
    Stage = enderscope_simple.Stage
    SerialUtils = enderscope_simple.SerialUtils
    print("✅ Successfully imported enderscope-simple module")
except ImportError as e:
    error_msg = str(e)
    if "serial" in error_msg.lower():
        print("❌ Cannot import enderscope-simple: pyserial manquant")
        print("📝 Pour installer: pip install pyserial")
    else:
        print(f"❌ Cannot import enderscope-simple: {e}")
    Stage = None
    SerialUtils = None
except Exception as e:
    print(f"❌ Error importing enderscope-simple: {e}")
    Stage = None
    SerialUtils = None

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global stage instance
stage = None

@app.route('/api/ports', methods=['GET'])
def get_ports():
    """Get available serial ports"""
    try:
        if SerialUtils:
            ports = SerialUtils.serial_ports()
        else:
            # Fallback for testing
            ports = ['/dev/ttyUSB0', '/dev/ttyACM0', 'COM3', 'COM4']
        
        return jsonify(ports)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/connect', methods=['POST'])
def connect():
    """Connect to Enderscope"""
    global stage
    
    try:
        data = request.get_json()
        port = data.get('port') if data else None
        baud_rate = data.get('baudRate', 115200) if data else 115200
        
        if not port:
            return jsonify({'success': False, 'error': 'Port required'})
        
        if Stage:
            try:
                stage = Stage(port, baud_rate, homing=False)
                return jsonify({'success': True, 'message': f'Connected to {port}'})
            except Exception as stage_error:
                return jsonify({'success': False, 'error': f'Connection failed: {str(stage_error)}'})
        else:
            return jsonify({
                'success': False, 
                'error': 'Impossible de se connecter: dépendances manquantes (installer pyserial)'
            })
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/disconnect', methods=['POST'])
def disconnect():
    """Disconnect from Enderscope"""
    global stage
    
    try:
        if stage and hasattr(stage, 'ser'):
            stage.ser.close()
        stage = None
        
        return jsonify({'success': True, 'message': 'Disconnected'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/home', methods=['POST'])
def home():
    """Home all axes"""
    try:
        if stage:
            stage.home()
            return jsonify({'success': True, 'message': 'Homing completed'})
        else:
            return jsonify({'success': True, 'message': 'Homing completed (simulation)'})
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/position', methods=['GET'])
def get_position():
    """Get current position"""
    try:
        if stage:
            pos = stage.get_position(dict=True)
            return jsonify({
                'success': True, 
                'position': {'x': pos['X'], 'y': pos['Y'], 'z': pos['Z']}
            })
        else:
            # Simulation position
            return jsonify({
                'success': True,
                'position': {'x': 0.0, 'y': 0.0, 'z': 0.0}
            })
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/move/absolute', methods=['POST'])
def move_absolute():
    """Move to absolute position"""
    try:
        data = request.get_json()
        x = data.get('x', 0)
        y = data.get('y', 0) 
        z = data.get('z', 0)
        
        if stage:
            stage.move_absolute(x, y, z)
            return jsonify({'success': True, 'message': f'Moved to X:{x} Y:{y} Z:{z}'})
        else:
            return jsonify({'success': True, 'message': f'Moved to X:{x} Y:{y} Z:{z} (simulation)'})
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/move/relative', methods=['POST'])
def move_relative():
    """Move relative distance"""
    try:
        data = request.get_json()
        dx = data.get('dx', 0)
        dy = data.get('dy', 0)
        dz = data.get('dz', 0)
        
        if stage:
            stage.move_relative(dx, dy, dz)
            return jsonify({'success': True, 'message': f'Moved by dX:{dx} dY:{dy} dZ:{dz}'})
        else:
            return jsonify({'success': True, 'message': f'Moved by dX:{dx} dY:{dy} dZ:{dz} (simulation)'})
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/gcode', methods=['POST'])
def send_gcode():
    """Send raw G-code command"""
    try:
        data = request.get_json()
        command = data.get('command', '').strip()
        
        if not command:
            return jsonify({'success': False, 'error': 'No command provided'})
        
        if stage:
            print(f"🔧 [GCODE] Envoi commande: {command}")
            stage.send_gcode(command)
            return jsonify({'success': True, 'message': f'G-code sent: {command}'})
        else:
            print(f"🔧 [SIMULATION] G-code: {command}")
            return jsonify({'success': True, 'message': f'G-code sent (simulation): {command}'})
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/emergency_stop', methods=['POST'])
def emergency_stop():
    """Emergency stop - send M112 (emergency stop) and M999 (reset)"""
    try:
        if stage:
            print(f"🛑 [EMERGENCY] Arrêt d'urgence activé!")
            stage.send_gcode("M112")  # Emergency stop
            time.sleep(0.1)
            stage.send_gcode("M999")  # Reset after emergency stop
            return jsonify({'success': True, 'message': 'Emergency stop executed'})
        else:
            print(f"🛑 [SIMULATION] Arrêt d'urgence")
            return jsonify({'success': True, 'message': 'Emergency stop (simulation)'})
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/beep', methods=['POST'])
def beep():
    """Send M300 beep command"""
    try:
        if stage:
            print(f"🔊 [BEEP] Bip!")
            stage.send_gcode("M300")
            return jsonify({'success': True, 'message': 'Beep sent'})
        else:
            print(f"🔊 [SIMULATION] Bip!")
            return jsonify({'success': True, 'message': 'Beep sent (simulation)'})
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get server status"""
    connected = False
    if stage and hasattr(stage, 'ser') and stage.ser and stage.ser.is_open:
        connected = True
    
    return jsonify({
        'success': True,
        'connected': connected,
        'simulation_mode': Stage is None,
        'port': stage.port if stage and hasattr(stage, 'port') else None,
        'message': 'Enderscope server running'
    })

if __name__ == '__main__':
    print("🔬 Starting Enderscope Hardware Server...")
    print("📡 Server will run on http://localhost:5000")
    
    if Stage is None:
        print("⚠️  Running in SIMULATION mode (enderscope-simple.py not found)")
    else:
        print("✅ Hardware control enabled (enderscope-simple)")
    
    app.run(host='0.0.0.0', port=5000, debug=True)