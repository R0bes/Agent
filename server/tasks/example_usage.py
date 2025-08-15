"""
Beispiel für die Verwendung der Task Engine.
Demonstriert verschiedene Task-Typen und Prioritäten.
"""

import asyncio
import logging
import time
from typing import Dict, Any

from .engine import TaskEngine
from .examples import (
    create_calculation_task,
    create_data_processing_task,
    create_simulation_task,
    create_file_processing_task,
    create_network_task
)
from .base import TaskInput, TaskPriority


async def demonstrate_basic_tasks():
    """Demonstriert grundlegende Task-Funktionalität."""
    print("🚀 Demonstriere grundlegende Task-Funktionalität...")
    
    # Task Engine erstellen und starten
    engine = TaskEngine(max_workers=2, queue_size=50)
    await engine.start()
    
    try:
        # Einfache Berechnungs-Tasks
        print("\n📊 Erstelle Berechnungs-Tasks...")
        
        calc_tasks = []
        for i in range(5):
            task = create_calculation_task("add", i, i * 2, TaskPriority.NORMAL)
            task_input = TaskInput(data={"operation": "add", "a": i, "b": i * 2})
            
            task_id = await engine.submit_task(task, task_input)
            calc_tasks.append(task_id)
            print(f"  Berechnungs-Task {task_id} erstellt: {i} + {i * 2}")
        
        # Kurz warten, damit Tasks ausgeführt werden können
        await asyncio.sleep(2)
        
        # Status der Tasks abrufen
        print("\n📈 Task-Status:")
        for task_id in calc_tasks:
            status = engine.get_task_status(task_id)
            info = engine.get_task_info(task_id)
            print(f"  Task {task_id}: {status.value}")
            if info and info.get("execution_time"):
                print(f"    Ausführungszeit: {info['execution_time']:.3f}s")
        
        # Engine-Statistiken
        stats = engine.get_stats()
        print(f"\n📊 Engine-Statistiken:")
        print(f"  Abgeschlossene Tasks: {stats['completed_tasks']}")
        print(f"  Fehlgeschlagene Tasks: {stats['failed_tasks']}")
        print(f"  Aktuelle Queue-Größe: {stats['queue_size']}")
        
    finally:
        await engine.stop()


async def demonstrate_priority_queue():
    """Demonstriert die Priority Queue-Funktionalität."""
    print("\n🎯 Demonstriere Priority Queue...")
    
    engine = TaskEngine(max_workers=1, queue_size=20)  # Nur 1 Worker für bessere Demonstration
    await engine.start()
    
    try:
        # Tasks mit verschiedenen Prioritäten erstellen
        print("  Erstelle Tasks mit verschiedenen Prioritäten...")
        
        # Niedrige Priorität zuerst
        low_task = create_simulation_task(0.5, "low", TaskPriority.LOW)
        low_input = TaskInput(data={"duration": 0.5, "complexity": "low"})
        low_id = await engine.submit_task(low_task, low_input)
        print(f"    LOW-Priority Task: {low_id}")
        
        # Normale Priorität
        normal_task = create_simulation_task(0.3, "medium", TaskPriority.NORMAL)
        normal_input = TaskInput(data={"duration": 0.3, "complexity": "medium"})
        normal_id = await engine.submit_task(normal_task, normal_input)
        print(f"    NORMAL-Priority Task: {normal_id}")
        
        # Hohe Priorität
        high_task = create_simulation_task(0.2, "high", TaskPriority.HIGH)
        high_input = TaskInput(data={"duration": 0.2, "complexity": "high"})
        high_id = await engine.submit_task(high_task, high_input)
        print(f"    HIGH-Priority Task: {high_id}")
        
        # Warten, damit alle Tasks ausgeführt werden
        await asyncio.sleep(3)
        
        # Reihenfolge der Ausführung überprüfen
        print("\n  Ausführungsreihenfolge:")
        for task_id in [high_id, normal_id, low_id]:
            info = engine.get_task_info(task_id)
            if info:
                started = info.get("started_at")
                completed = info.get("completed_at")
                print(f"    Task {task_id}: {started} -> {completed}")
        
    finally:
        await engine.stop()


async def demonstrate_task_types():
    """Demonstriert verschiedene Task-Typen."""
    print("\n🔧 Demonstriere verschiedene Task-Typen...")
    
    engine = TaskEngine(max_workers=3, queue_size=30)
    await engine.start()
    
    try:
        # Verschiedene Task-Typen erstellen
        tasks = []
        
        # Datenverarbeitung
        data_task = create_data_processing_task([3, 1, 4, 1, 5, 9, 2, 6], "sort", TaskPriority.NORMAL)
        data_input = TaskInput(data={"data": [3, 1, 4, 1, 5, 9, 2, 6], "operation": "sort"})
        data_id = await engine.submit_task(data_task, data_input)
        tasks.append(("Datenverarbeitung", data_id))
        
        # Dateiverarbeitung
        file_task = create_file_processing_task("test.txt", "read", 2048, TaskPriority.LOW)
        file_input = TaskInput(data={"filename": "test.txt", "operation": "read", "file_size": 2048})
        file_id = await engine.submit_task(file_task, file_input)
        tasks.append(("Dateiverarbeitung", file_id))
        
        # Netzwerk-Task
        network_task = create_network_task("https://api.example.com", "GET", 3.0, TaskPriority.HIGH)
        network_input = TaskInput(data={"url": "https://api.example.com", "method": "GET", "timeout": 3.0})
        network_id = await engine.submit_task(network_task, network_input)
        tasks.append(("Netzwerk", network_id))
        
        print("  Tasks erstellt:")
        for task_type, task_id in tasks:
            print(f"    {task_type}: {task_id}")
        
        # Warten, damit Tasks ausgeführt werden können
        await asyncio.sleep(4)
        
        # Ergebnisse anzeigen
        print("\n  Ergebnisse:")
        for task_type, task_id in tasks:
            info = engine.get_task_info(task_id)
            if info:
                status = info.get("status", "unknown")
                execution_time = info.get("execution_time", 0)
                print(f"    {task_type}: {status} ({execution_time:.3f}s)")
        
    finally:
        await engine.stop()


async def demonstrate_callbacks():
    """Demonstriert die Verwendung von Callbacks."""
    print("\n🔄 Demonstriere Callbacks...")
    
    engine = TaskEngine(max_workers=2, queue_size=20)
    
    # Callbacks setzen
    def on_task_completed(task):
        print(f"    ✅ Task {task.task_id} erfolgreich abgeschlossen!")
    
    def on_task_failed(task, error):
        print(f"    ❌ Task {task.task_id} fehlgeschlagen: {error}")
    
    engine.set_callbacks(on_task_completed, on_task_failed)
    
    await engine.start()
    
    try:
        # Erfolgreichen Task erstellen
        success_task = create_calculation_task("multiply", 5, 6, TaskPriority.NORMAL)
        success_input = TaskInput(data={"operation": "multiply", "a": 5, "b": 6})
        success_id = await engine.submit_task(success_task, success_input)
        
        # Fehlschlagenden Task erstellen
        fail_task = create_calculation_task("divide", 10, 0, TaskPriority.NORMAL)
        fail_input = TaskInput(data={"operation": "divide", "a": 10, "b": 0})
        fail_id = await engine.submit_task(fail_task, fail_input)
        
        print(f"  Tasks erstellt: {success_id}, {fail_id}")
        
        # Warten, damit Callbacks ausgeführt werden
        await asyncio.sleep(2)
        
    finally:
        await engine.stop()


async def demonstrate_cancellation():
    """Demonstriert das Abbrechen von Tasks."""
    print("\n🚫 Demonstriere Task-Abbruch...")
    
    engine = TaskEngine(max_workers=1, queue_size=10)
    await engine.start()
    
    try:
        # Langen Task erstellen
        long_task = create_simulation_task(5.0, "high", TaskPriority.NORMAL)
        long_input = TaskInput(data={"duration": 5.0, "complexity": "high"})
        long_id = await engine.submit_task(long_task, long_input)
        
        print(f"  Langen Task erstellt: {long_id}")
        
        # Kurz warten, damit Task startet
        await asyncio.sleep(0.5)
        
        # Task abbrechen
        cancelled = await engine.cancel_task(long_id)
        print(f"  Task abgebrochen: {cancelled}")
        
        # Status überprüfen
        await asyncio.sleep(1)
        status = engine.get_task_status(long_id)
        print(f"  Finaler Status: {status.value}")
        
    finally:
        await engine.stop()


async def main():
    """Hauptfunktion für alle Demonstrationen."""
    print("🤖 Task Engine Demonstration\n" + "="*60)
    
    try:
        # Alle Demonstrationen ausführen
        await demonstrate_basic_tasks()
        await demonstrate_priority_queue()
        await demonstrate_task_types()
        await demonstrate_callbacks()
        await demonstrate_cancellation()
        
        print("\n🎉 Alle Task Engine-Demonstrationen erfolgreich abgeschlossen!")
        
    except Exception as e:
        print(f"\n💥 Fehler in der Task Engine-Demonstration: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # Logging konfigurieren
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Task Engine-Demonstrationen ausführen
    asyncio.run(main())
