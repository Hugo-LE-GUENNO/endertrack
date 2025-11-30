#!/usr/bin/env python3
import asyncio
import websockets
import json
import subprocess
import threading
import queue
import time

class UniversalInputBridge:
    def __init__(self):
        self.input_queue = queue.Queue()
        self.devices = []
        self.active_listeners = {}
        self.scan_devices()
    
    def scan_devices(self):
        """Scan tous les types de périphériques d'entrée"""
        self.devices = []
        
        # MIDI
        self.devices.extend(self.scan_midi_devices())
        
        # Gamepad
        self.devices.extend(self.scan_gamepad_devices())
        
        # HID générique
        self.devices.extend(self.scan_hid_devices())
        
        # Clavier système (toujours disponible)
        self.devices.append({
            'id': 'keyboard_system',
            'name': 'Clavier Système',
            'type': 'keyboard',
            'connected': True
        })
        
        print(f"🔍 {len(self.devices)} périphériques détectés:")
        for device in self.devices:
            status = '✅' if device['connected'] else '❌'
            print(f"  {status} {device['name']} ({device['type']})")
    
    def scan_midi_devices(self):
        """Scan périphériques MIDI"""
        devices = []
        try:
            usb_result = subprocess.run(['lsusb'], capture_output=True, text=True)
            usb_devices = usb_result.stdout.lower()
            
            alsa_result = subprocess.run(['aconnect', '-l'], capture_output=True, text=True)
            
            for line in alsa_result.stdout.split('\n'):
                if 'client' in line and '[type=' in line:
                    parts = line.split(':')
                    if len(parts) >= 2:
                        client_id = parts[0].split()[-1]
                        name = parts[1].split('[')[0].strip().strip("'")
                        
                        if name not in ['System', 'Midi Through', 'PipeWire-System', 'PipeWire-RT-Event', 'TiMidity']:
                            connected = True
                            if 'mpk' in name.lower():
                                connected = 'mpk' in usb_devices or 'akai' in usb_devices
                            
                            devices.append({
                                'id': f'midi_{client_id}',
                                'name': name,
                                'type': 'midi',
                                'client_id': client_id,
                                'connected': connected
                            })
        except Exception as e:
            print(f"❌ Erreur scan MIDI: {e}")
        
        return devices
    
    def scan_gamepad_devices(self):
        """Scan manettes/gamepads"""
        devices = []
        try:
            # Vérifier les périphériques d'entrée
            result = subprocess.run(['ls', '/dev/input/'], capture_output=True, text=True)
            js_devices = [f for f in result.stdout.split() if f.startswith('js')]
            
            for i, js_dev in enumerate(js_devices):
                # Essayer d'obtenir le nom du périphérique
                try:
                    name_result = subprocess.run(['cat', f'/sys/class/input/js{i}/device/name'], 
                                               capture_output=True, text=True)
                    name = name_result.stdout.strip() if name_result.returncode == 0 else f"Gamepad {i}"
                except:
                    name = f"Gamepad {i}"
                
                devices.append({
                    'id': f'gamepad_{i}',
                    'name': name,
                    'type': 'gamepad',
                    'device_path': f'/dev/input/{js_dev}',
                    'connected': True
                })
        except Exception as e:
            print(f"❌ Erreur scan gamepad: {e}")
        
        return devices
    
    def scan_hid_devices(self):
        """Scan périphériques HID génériques"""
        devices = []
        try:
            # Lister les périphériques USB HID
            result = subprocess.run(['lsusb'], capture_output=True, text=True)
            
            for line in result.stdout.split('\n'):
                if 'HID' in line or 'Human Interface' in line:
                    parts = line.split()
                    if len(parts) >= 6:
                        device_id = f"{parts[1]}:{parts[3]}"
                        name = ' '.join(parts[6:])
                        
                        devices.append({
                            'id': f'hid_{device_id}',
                            'name': name,
                            'type': 'hid',
                            'connected': True
                        })
        except Exception as e:
            print(f"❌ Erreur scan HID: {e}")
        
        return devices
    
    def start_device_listener(self, device_id):
        """Démarre l'écoute d'un périphérique spécifique"""
        if device_id in self.active_listeners:
            return
        
        device = next((d for d in self.devices if d['id'] == device_id), None)
        if not device or not device['connected']:
            return
        
        if device['type'] == 'midi':
            self.start_midi_listener(device)
        elif device['type'] == 'gamepad':
            self.start_gamepad_listener(device)
        elif device['type'] == 'hid':
            self.start_hid_listener(device)
    
    def start_midi_listener(self, device):
        """Écoute MIDI avec aseqdump"""
        def read_midi():
            try:
                client_id = device['client_id']
                proc = subprocess.Popen(['aseqdump', '-p', f'{client_id}:0'], 
                                      stdout=subprocess.PIPE, 
                                      stderr=subprocess.PIPE,
                                      text=True)
                
                print(f"🎹 Écoute MIDI: {device['name']}")
                
                for line in proc.stdout:
                    if any(x in line for x in ['Note on', 'Note off', 'Control change']):
                        parts = line.strip().split()
                        if len(parts) >= 6:
                            try:
                                control_type = 'note' if 'Note' in line else 'cc'
                                control = int(parts[5].rstrip(','))
                                value = int(parts[7]) if len(parts) > 7 else 0
                                
                                self.input_queue.put({
                                    'device_id': device['id'],
                                    'type': control_type,
                                    'control': control,
                                    'value': value,
                                    'timestamp': time.time()
                                })
                            except (ValueError, IndexError):
                                continue
                                
            except Exception as e:
                print(f"❌ Erreur MIDI {device['name']}: {e}")
        
        thread = threading.Thread(target=read_midi, daemon=True)
        thread.start()
        self.active_listeners[device['id']] = thread
    
    def start_gamepad_listener(self, device):
        """Écoute gamepad avec evdev ou jstest"""
        def read_gamepad():
            try:
                # Utilise jstest pour lire les événements gamepad
                proc = subprocess.Popen(['jstest', '--event', device['device_path']], 
                                      stdout=subprocess.PIPE, 
                                      stderr=subprocess.PIPE,
                                      text=True)
                
                print(f"🎮 Écoute Gamepad: {device['name']}")
                
                for line in proc.stdout:
                    if 'type' in line and 'number' in line:
                        # Parse jstest output: Event: type 1, time 123, number 0, value 1
                        parts = line.split(',')
                        if len(parts) >= 4:
                            try:
                                event_type = int(parts[0].split()[-1])  # 1=button, 2=axis
                                number = int(parts[2].split()[-1])
                                value = int(parts[3].split()[-1])
                                
                                control_type = 'button' if event_type == 1 else 'axis'
                                
                                self.input_queue.put({
                                    'device_id': device['id'],
                                    'type': control_type,
                                    'control': number,
                                    'value': value,
                                    'timestamp': time.time()
                                })
                            except (ValueError, IndexError):
                                continue
                                
            except Exception as e:
                print(f"❌ Erreur Gamepad {device['name']}: {e}")
        
        thread = threading.Thread(target=read_gamepad, daemon=True)
        thread.start()
        self.active_listeners[device['id']] = thread
    
    def start_hid_listener(self, device):
        """Écoute HID générique (placeholder)"""
        print(f"🔌 HID {device['name']}: Support à implémenter")
    
    def stop_device_listener(self, device_id):
        """Arrête l'écoute d'un périphérique"""
        if device_id in self.active_listeners:
            # Les threads daemon s'arrêtent automatiquement
            del self.active_listeners[device_id]
            print(f"🛑 Arrêt écoute: {device_id}")

async def main():
    bridge = UniversalInputBridge()
    print("🌐 Universal Input Bridge démarré sur ws://localhost:8765")
    
    async def input_handler(websocket):
        print("🔗 Client connecté")
        
        # Envoie la liste des périphériques
        await websocket.send(json.dumps({
            'type': 'devices',
            'devices': bridge.devices
        }))
        
        try:
            while True:
                # Messages du client
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=0.01)
                    data = json.loads(message)
                    
                    if data.get('type') == 'scan_devices':
                        bridge.scan_devices()
                        await websocket.send(json.dumps({
                            'type': 'devices',
                            'devices': bridge.devices
                        }))
                    elif data.get('type') == 'start_listening':
                        device_id = data.get('device_id')
                        bridge.start_device_listener(device_id)
                    elif data.get('type') == 'stop_listening':
                        device_id = data.get('device_id')
                        bridge.stop_device_listener(device_id)
                        
                except asyncio.TimeoutError:
                    pass
                except:
                    pass
                
                # Envoie les événements d'entrée
                try:
                    input_data = bridge.input_queue.get_nowait()
                    await websocket.send(json.dumps({
                        'type': 'input',
                        'data': input_data
                    }))
                except queue.Empty:
                    pass
                
                await asyncio.sleep(0.01)
                
        except websockets.exceptions.ConnectionClosed:
            print("🔗 Client déconnecté")
    
    async with websockets.serve(input_handler, "localhost", 8765):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())