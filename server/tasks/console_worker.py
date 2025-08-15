"""
Console Worker für die Task Engine.
Zeigt verarbeitete Tasks und deren Ergebnisse auf der Konsole an.
"""

import logging
from typing import Dict, Any
from datetime import datetime
import json

from .base import BaseTask
from .engine import MessageEvent


class ConsoleWorker:
    """
    Console Worker, der Task-Ergebnisse auf der Konsole ausgibt.
    Kann als Callback für die Task Engine verwendet werden.
    """
    
    def __init__(self, verbose: bool = True):
        """
        Initialisiert den Console Worker.
        
        Args:
            verbose: Wenn True, werden detaillierte Informationen ausgegeben
        """
        self.verbose = verbose
        self.logger = logging.getLogger(f"{__name__}.ConsoleWorker")
        
        # Statistiken
        self.stats = {
            "total_tasks": 0,
            "completed_tasks": 0,
            "failed_tasks": 0,
            "message_tasks": 0,
            "other_tasks": 0
        }
    
    def on_task_completed(self, task: BaseTask) -> None:
        """
        Callback für erfolgreich abgeschlossene Tasks.
        
        Args:
            task: Der abgeschlossene Task
        """
        self.stats["total_tasks"] += 1
        self.stats["completed_tasks"] += 1
        
        # Prüfen, ob es sich um einen Message-Task handelt
        if hasattr(task, 'message_event'):
            self.stats["message_tasks"] += 1
            self._print_message_task_result(task)
        else:
            self.stats["other_tasks"] += 1
            self._print_generic_task_result(task)
    
    def on_task_failed(self, task: BaseTask, error: str) -> None:
        """
        Callback für fehlgeschlagene Tasks.
        
        Args:
            task: Der fehlgeschlagene Task
            error: Fehlermeldung
        """
        self.stats["total_tasks"] += 1
        self.stats["failed_tasks"] += 1
        
        if hasattr(task, 'message_event'):
            self.stats["message_tasks"] += 1
            self._print_message_task_error(task, error)
        else:
            self.stats["other_tasks"] += 1
            self._print_generic_task_error(task, error)
    
    def _print_message_task_result(self, task: BaseTask) -> None:
        """Gibt das Ergebnis eines Message-Tasks auf der Konsole aus."""
        message_event = task.message_event
        
        print("\n" + "="*60)
        print(f"📨 MESSAGE TASK ABGESCHLOSSEN - {datetime.now().strftime('%H:%M:%S')}")
        print("="*60)
        print(f"Task ID: {task.task_id}")
        print(f"Client ID: {message_event.client_id}")
        print(f"Nachrichtentyp: {message_event.message_data.get('type', 'unknown')}")
        
        if message_event.message_data.get('content'):
            print(f"Inhalt: {message_event.message_data['content'][:100]}{'...' if len(message_event.message_data['content']) > 100 else ''}")
        
        if task.output and task.output.result:
            result = task.output.result
            print(f"Antwort: {result.get('content', 'N/A')}")
            print(f"Verarbeitungszeit: {result.get('processing_time', 'N/A'):.3f}s")
        
        print(f"Status: ✅ Erfolgreich")
        print("="*60)
    
    def _print_message_task_error(self, task: BaseTask, error: str) -> None:
        """Gibt einen fehlgeschlagenen Message-Task auf der Konsole aus."""
        message_event = task.message_event
        
        print("\n" + "="*60)
        print(f"❌ MESSAGE TASK FEHLGESCHLAGEN - {datetime.now().strftime('%H:%M:%S')}")
        print("="*60)
        print(f"Task ID: {task.task_id}")
        print(f"Client ID: {message_event.client_id}")
        print(f"Nachrichtentyp: {message_event.message_data.get('type', 'unknown')}")
        print(f"Fehler: {error}")
        print("="*60)
    
    def _print_generic_task_result(self, task: BaseTask) -> None:
        """Gibt das Ergebnis eines generischen Tasks auf der Konsole aus."""
        print("\n" + "="*60)
        print(f"✅ TASK ABGESCHLOSSEN - {datetime.now().strftime('%H:%M:%S')}")
        print("="*60)
        print(f"Task ID: {task.task_id}")
        print(f"Name: {task.name}")
        print(f"Beschreibung: {task.description}")
        print(f"Priorität: {task.priority.name}")
        print(f"Status: ✅ Erfolgreich")
        print("="*60)
    
    def _print_generic_task_error(self, task: BaseTask, error: str) -> None:
        """Gibt einen fehlgeschlagenen generischen Task auf der Konsole aus."""
        print("\n" + "="*60)
        print(f"❌ TASK FEHLGESCHLAGEN - {datetime.now().strftime('%H:%M:%S')}")
        print("="*60)
        print(f"Task ID: {task.task_id}")
        print(f"Name: {task.name}")
        print(f"Beschreibung: {task.description}")
        print(f"Fehler: {error}")
        print("="*60)
    
    def print_stats(self) -> None:
        """Gibt aktuelle Statistiken auf der Konsole aus."""
        print("\n" + "="*60)
        print(f"📊 CONSOLE WORKER STATISTIKEN - {datetime.now().strftime('%H:%M:%S')}")
        print("="*60)
        print(f"Gesamt Tasks: {self.stats['total_tasks']}")
        print(f"Erfolgreich: {self.stats['completed_tasks']}")
        print(f"Fehlgeschlagen: {self.stats['failed_tasks']}")
        print(f"Message Tasks: {self.stats['message_tasks']}")
        print(f"Andere Tasks: {self.stats['other_tasks']}")
        
        if self.stats['total_tasks'] > 0:
            success_rate = (self.stats['completed_tasks'] / self.stats['total_tasks']) * 100
            print(f"Erfolgsrate: {success_rate:.1f}%")
        
        print("="*60)
    
    def print_queue_status(self, queue_size: int, running_tasks: int) -> None:
        """Gibt den aktuellen Queue-Status auf der Konsole aus."""
        print(f"\n🔄 Queue Status: {queue_size} Tasks in Queue, {running_tasks} laufend")
    
    def print_system_status(self, status_data: Dict[str, Any]) -> None:
        """Gibt System-Status-Informationen auf der Konsole aus."""
        print("\n" + "="*60)
        print(f"🖥️  SYSTEM STATUS - {datetime.now().strftime('%H:%M:%S')}")
        print("="*60)
        
        if 'task_engine' in status_data:
            engine_stats = status_data['task_engine']
            print(f"Task Engine: {'🟢 Läuft' if engine_stats.get('is_running') else '🔴 Gestoppt'}")
            print(f"Worker: {engine_stats.get('running_tasks', 0)}/{engine_stats.get('max_workers', 0)}")
            print(f"Queue: {engine_stats.get('queue_size', 0)} Tasks")
            print(f"Abgeschlossen: {engine_stats.get('completed_tasks', 0)}")
            print(f"Fehlgeschlagen: {engine_stats.get('failed_tasks', 0)}")
        
        if 'event_manager' in status_data:
            event_stats = status_data['event_manager']
            print(f"Event Manager: {'🟢 Läuft' if event_stats.get('is_running') else '🔴 Gestoppt'}")
            print(f"Nachrichten: {event_stats.get('total_messages', 0)}")
            print(f"Verarbeitet: {event_stats.get('processed_messages', 0)}")
            print(f"Fehlgeschlagen: {event_stats.get('failed_messages', 0)}")
            print(f"Message Queue: {event_stats.get('queue_size', 0)}")
        
        print("="*60)
