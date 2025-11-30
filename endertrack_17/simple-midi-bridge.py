#!/usr/bin/env python3
import asyncio
import websockets
import json
import subprocess
import threading
import queue

class SimpleMIDIBridge:
    def __init__(self):
        self.midi_queue = queue.Queue()
        self.devices = []
        self.scan_devices()
        self.start_aseqdump()
    
    def scan_devices(self):
        """Scan les périphériques MIDI réellement connectés"""
        try:
            # Vérification USB réelle
            usb_result = subprocess.run(['lsusb'], capture_output=True, text=True)
            usb_devices = usb_result.stdout.lower()
            
            # Vérification ALSA
            alsa_result = subprocess.run(['aconnect', '-l'], capture_output=True, text=True)
            
            self.devices = []
            
            print(f"🔍 Scan USB: {'mpk' in usb_devices or 'akai' in usb_devices}")
            print(f"🔍 Scan ALSA clients:")
            
            for line in alsa_result.stdout.split('\n'):
                if 'client' in line and '[type=' in line:
                    parts = line.split(':')
                    if len(parts) >= 2:
                        client_id = parts[0].split()[-1]
                        name = parts[1].split('[')[0].strip().strip("'")
                        
                        print(f"  Client {client_id}: {name}")
                        
                        # Ignore les clients système
                        if name not in ['System', 'Midi Through', 'PipeWire-System', 'PipeWire-RT-Event', 'TiMidity']:
                            # Vérifier si c'est vraiment connecté (pour MPK)
                            really_connected = True
                            if 'mpk' in name.lower():
                                really_connected = 'mpk' in usb_devices or 'akai' in usb_devices
                                print(f"    MPK USB check: {really_connected}")
                            
                            self.devices.append({
                                'id': f'midi_{client_id}',
                                'name': name,
                                'type': 'midi',
                                'client_id': client_id,
                                'connected': really_connected
                            })
            
            # Ajouter le clavier
            self.devices.append({
                'id': 'keyboard',
                'name': 'Clavier (Mapping manuel)',
                'type': 'keyboard',
                'connected': True
            })
            
            print(f"🔍 Périphériques finaux: {len(self.devices)}")
            for device in self.devices:
                status = '✅' if device['connected'] else '❌'
                print(f"  {status} {device['name']} ({device['type']})")
                
        except Exception as e:
            print(f"❌ Erreur scan périphériques: {e}")
            self.devices = [{'id': 'keyboard', 'name': 'Clavier', 'type': 'keyboard', 'connected': True}]
    
    def start_aseqdump(self):
        """Lance aseqdump pour capturer les messages MIDI du MPK"""
        def read_midi():
            try:
                # Utilise aseqdump pour lire directement du port 28:0 (MPK)
                proc = subprocess.Popen(['aseqdump', '-p', '28:0'], 
                                      stdout=subprocess.PIPE, 
                                      stderr=subprocess.PIPE,
                                      text=True)
                
                print("🎹 Écoute MIDI sur port 28:0 (MPK mini play)")
                
                for line in proc.stdout:
                    if 'Note on' in line or 'Note off' in line or 'Control change' in line:
                        # Parse la ligne aseqdump
                        parts = line.strip().split()
                        if len(parts) >= 6:
                            try:
                                if 'Note on' in line:
                                    note = int(parts[5].rstrip(','))
                                    velocity = int(parts[7])
                                    midi_data = [144, note, velocity]  # Note On
                                elif 'Note off' in line:
                                    note = int(parts[5].rstrip(','))
                                    midi_data = [128, note, 0]  # Note Off
                                elif 'Control change' in line:
                                    controller = int(parts[5].rstrip(','))
                                    value = int(parts[7])
                                    midi_data = [176, controller, value]  # CC
                                else:
                                    continue
                                
                                self.midi_queue.put(midi_data)
                                print(f"🎵 MIDI: {midi_data}")
                            except (ValueError, IndexError):
                                continue
                                
            except Exception as e:
                print(f"❌ Erreur MIDI: {e}")
        
        # Lance aseqdump dans un thread séparé
        threading.Thread(target=read_midi, daemon=True).start()
    
    async def handle_client(self, websocket, path):
        print("🔗 Client WebSocket connecté")
        try:
            # Écoute aussi les messages du client
            async for message in websocket:
                try:
                    data = json.loads(message)
                    if data.get('type') == 'ping':
                        print("🏓 Ping reçu du navigateur")
                        await websocket.send(json.dumps({'type': 'pong'}))
                except:
                    pass
                    
                # Envoie les messages MIDI en attente
                try:
                    midi_data = self.midi_queue.get_nowait()
                    print(f"📡 Envoi WebSocket: {midi_data}")
                    await websocket.send(json.dumps(midi_data))
                except queue.Empty:
                    pass
                    
        except websockets.exceptions.ConnectionClosed:
            print("🔗 Client WebSocket déconnecté")

async def main():
    bridge = SimpleMIDIBridge()
    print("🎹 Simple MIDI Bridge démarré sur ws://localhost:8765")
    print("🎮 Appuyez sur des touches de votre MPK pour tester")
    
    # Serveur WebSocket avec gestion continue des messages MIDI
    async def midi_handler(websocket):
        print("🔗 Client connecté")
        
        # Envoie la liste des périphériques au client
        await websocket.send(json.dumps({
            'type': 'devices',
            'devices': bridge.devices
        }))
        
        try:
            while True:
                # Vérifie les messages du client
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=0.01)
                    data = json.loads(message)
                    if data.get('type') == 'scan_devices':
                        bridge.scan_devices()
                        await websocket.send(json.dumps({
                            'type': 'devices',
                            'devices': bridge.devices
                        }))
                except asyncio.TimeoutError:
                    pass
                except:
                    pass
                
                # Envoie les messages MIDI en continu
                try:
                    midi_data = bridge.midi_queue.get_nowait()
                    print(f"📡 Envoi MIDI: {midi_data}")
                    await websocket.send(json.dumps({
                        'type': 'midi',
                        'data': midi_data
                    }))
                except queue.Empty:
                    pass
                
                await asyncio.sleep(0.01)
        except websockets.exceptions.ConnectionClosed:
            print("🔗 Client déconnecté")
    
    async with websockets.serve(midi_handler, "localhost", 8765):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())