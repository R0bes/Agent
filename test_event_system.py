#!/usr/bin/env python3
"""
Test-Skript für das globale Event-Handling-System.
Demonstriert, wie Nachrichten in die Queue gepackt und verarbeitet werden.
"""

import asyncio
import json
import logging
import sys
import os
from datetime import datetime

# Python-Pfad erweitern, um server-Module zu finden
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

# Logging konfigurieren
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Import der Task Engine
try:
    from tasks.engine import TaskEngine, MessageEvent
    from tasks.message_tasks import MessageTaskFactory
    from tasks.console_worker import ConsoleWorker
    print("✅ Alle Module erfolgreich importiert!")
except ImportError as e:
    print(f"Fehler beim Import: {e}")
    print("Stelle sicher, dass alle Module verfügbar sind.")
    exit(1)

# Globale Variable für die Task Engine
task_engine = None

async def test_event_system():
    """Testet das Event-Handling-System."""
    global task_engine
    
    print("🚀 Starte Test des Event-Handling-Systems...")
    
    # Task Engine erstellen
    task_engine = TaskEngine(max_workers=2, queue_size=100)
    
    # Console Worker erstellen und als Callback registrieren
    console_worker = ConsoleWorker(verbose=True)
    task_engine.set_callbacks(
        on_task_completed=console_worker.on_task_completed,
        on_task_failed=console_worker.on_task_failed
    )
    
    # Message Handler registrieren
    task_engine.event_manager.register_message_handler("message", handle_chat_message_event)
    task_engine.event_manager.register_message_handler("ping", handle_ping_message_event)
    task_engine.event_manager.register_message_handler("status", handle_status_message_event)
    
    # Task Engine starten
    await task_engine.start()
    
    print("\n📨 Sende Test-Nachrichten...")
    
    # Verschiedene Test-Nachrichten senden
    test_messages = [
        {
            "type": "message",
            "content": "Hallo, das ist eine Test-Chat-Nachricht!",
            "timestamp": datetime.now().isoformat()
        },
        {
            "type": "ping",
            "timestamp": datetime.now().isoformat()
        },
        {
            "type": "status",
            "timestamp": datetime.now().isoformat()
        },
        {
            "type": "message",
            "content": "Eine weitere Nachricht zur Demonstration der Queue-Verarbeitung.",
            "timestamp": datetime.now().isoformat()
        }
    ]
    
    # Nachrichten in die Queue packen
    for i, message_data in enumerate(test_messages):
        client_id = f"test_client_{i+1}"
        event_id = task_engine.event_manager.submit_message(message_data, client_id)
        print(f"✅ Nachricht {i+1} von {client_id} zur Queue hinzugefügt: {event_id}")
        
        # Kurz warten zwischen den Nachrichten
        await asyncio.sleep(0.5)
    
    print(f"\n📊 Aktuelle Queue-Größe: {task_engine.get_queue_size()}")
    print(f"🔄 Laufende Tasks: {len(task_engine.running_tasks)}")
    
    # Warten, bis alle Tasks verarbeitet wurden
    print("\n⏳ Warte auf Verarbeitung aller Tasks...")
    while task_engine.get_queue_size() > 0 or len(task_engine.running_tasks) > 0:
        await asyncio.sleep(0.5)
        print(f"📊 Queue: {task_engine.get_queue_size()}, Laufend: {len(task_engine.running_tasks)}")
    
    # Statistiken anzeigen
    print("\n📈 Task Engine Statistiken:")
    engine_stats = task_engine.get_stats()
    for key, value in engine_stats.items():
        print(f"  {key}: {value}")
    
    print("\n📈 Event Manager Statistiken:")
    event_stats = task_engine.event_manager.get_stats()
    for key, value in event_stats.items():
        print(f"  {key}: {value}")
    
    # Console Worker Statistiken anzeigen
    console_worker.print_stats()
    
    # Task Engine stoppen
    await task_engine.stop()
    
    print("\n✅ Test erfolgreich abgeschlossen!")


# Message Handler für den Test
def handle_chat_message_event(message_event):
    """Handler für Chat-Nachrichten-Events."""
    try:
        # Task für Chat-Nachrichtenverarbeitung erstellen
        task = MessageTaskFactory.create_task(message_event)
        
        # Task zur Task Engine hinzufügen
        import asyncio
        asyncio.create_task(task_engine.submit_task(task, task.input))
        
        print(f"📨 Chat-Nachrichten-Task für {message_event.client_id} erstellt")
        
    except Exception as e:
        print(f"❌ Fehler beim Erstellen des Chat-Nachrichten-Tasks: {e}")


def handle_ping_message_event(message_event):
    """Handler für Ping-Nachrichten-Events."""
    try:
        # Task für Ping-Nachrichtenverarbeitung erstellen
        task = MessageTaskFactory.create_task(message_event)
        
        # Task zur Task Engine hinzufügen
        import asyncio
        asyncio.create_task(task_engine.submit_task(task, task.input))
        
        print(f"🏓 Ping-Nachrichten-Task für {message_event.client_id} erstellt")
        
    except Exception as e:
        print(f"❌ Fehler beim Erstellen des Ping-Nachrichten-Tasks: {e}")


def handle_status_message_event(message_event):
    """Handler für Status-Nachrichten-Events."""
    try:
        # Task für Status-Nachrichtenverarbeitung erstellen
        task = MessageTaskFactory.create_task(message_event)
        
        # Task zur Task Engine hinzufügen
        import asyncio
        asyncio.create_task(task_engine.submit_task(task, task.input))
        
        print(f"📊 Status-Nachrichten-Task für {message_event.client_id} erstellt")
        
    except Exception as e:
        print(f"❌ Fehler beim Erstellen des Status-Nachrichten-Tasks: {e}")


async def test_custom_message_handler():
    """Testet einen benutzerdefinierten Message Handler."""
    print("\n🔧 Teste benutzerdefinierten Message Handler...")
    
    task_engine = TaskEngine(max_workers=1, queue_size=50)
    
    # Benutzerdefinierten Handler registrieren
    def custom_handler(message_event):
        print(f"🎯 Benutzerdefinierter Handler: Nachricht von {message_event.client_id}")
        print(f"   Inhalt: {message_event.message_data}")
    
    task_engine.event_manager.register_message_handler("custom", custom_handler)
    
    await task_engine.start()
    
    # Benutzerdefinierte Nachricht senden
    custom_message = {
        "type": "custom",
        "content": "Dies ist eine benutzerdefinierte Nachricht",
        "timestamp": datetime.now().isoformat()
    }
    
    event_id = task_engine.event_manager.submit_message(custom_message, "custom_client")
    print(f"✅ Benutzerdefinierte Nachricht gesendet: {event_id}")
    
    # Warten auf Verarbeitung
    await asyncio.sleep(2)
    
    await task_engine.stop()
    print("✅ Benutzerdefinierter Handler Test abgeschlossen!")


if __name__ == "__main__":
    print("🧪 EVENT-HANDLING-SYSTEM TEST")
    print("=" * 50)
    
    try:
        # Haupttest ausführen
        asyncio.run(test_event_system())
        
        # Benutzerdefinierten Handler testen
        asyncio.run(test_custom_message_handler())
        
    except KeyboardInterrupt:
        print("\n⏹️  Test durch Benutzer abgebrochen")
    except Exception as e:
        print(f"\n❌ Fehler während des Tests: {e}")
        import traceback
        traceback.print_exc()
