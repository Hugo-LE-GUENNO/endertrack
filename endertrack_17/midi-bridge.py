#!/usr/bin/env python3
import asyncio
import websockets
import json
import pygame.midi
import os

# Fix ALSA warnings
os.environ['SDL_AUDIODRIVER'] = 'pulse'

class MIDIBridge:
    def __init__(self):
        pygame.midi.init()
        self.midi_input = None
        self.find_mpk()
    
    def find_mpk(self):
        print(f"🔍 Recherche MIDI devices ({pygame.midi.get_count()} trouvés)")
        for i in range(pygame.midi.get_count()):
            info = pygame.midi.get_device_info(i)
            name = info[1].decode()
            is_input = info[2]
            print(f"  {i}: {name} ({'IN' if is_input else 'OUT'})")
            
            if (b'MPK' in info[1] or b'mini' in info[1].lower()) and info[2]:
                self.midi_input = pygame.midi.Input(i)
                print(f"✅ MPK trouvé: {name}")
                return
        print("❌ MPK non trouvé - vérifiez la connexion USB")
    
    async def handle_client(self, websocket, path):
        print("🔗 Client connecté")
        try:
            while True:
                if self.midi_input and self.midi_input.poll():
                    midi_events = self.midi_input.read(10)
                    for event in midi_events:
                        data = event[0][:3]  # status, data1, data2
                        await websocket.send(json.dumps(data))
                await asyncio.sleep(0.01)
        except websockets.exceptions.ConnectionClosed:
            print("🔗 Client déconnecté")

async def main():
    bridge = MIDIBridge()
    if not bridge.midi_input:
        print("❌ Impossible de continuer sans MPK")
        return
    
    print("🎹 MIDI Bridge démarré sur ws://localhost:8765")
    async with websockets.serve(bridge.handle_client, "localhost", 8765):
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())