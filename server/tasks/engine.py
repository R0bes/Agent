"""
Task Engine mit Priority Queue und Threadpool-Execution.
Verwaltet und führt Tasks asynchron aus.
Erweitert um globales Event-Handling für API-Nachrichten.
"""

import asyncio
import threading
from concurrent.futures import ThreadPoolExecutor, Future
from queue import PriorityQueue, Empty, Queue
from typing import Dict, List, Optional, Callable, Any
import logging
import time
from datetime import datetime
import json

from .base import BaseTask, TaskInput, TaskOutput, TaskStatus, TaskPriority


class MessageEvent:
    """Repräsentiert eine eingehende Nachricht als Event."""
    
    def __init__(self, message_data: dict, client_id: str, timestamp: Optional[datetime] = None):
        self.message_data = message_data
        self.client_id = client_id
        self.timestamp = timestamp or datetime.now()
        self.event_id = f"msg_{int(time.time() * 1000)}_{client_id}"
    
    def to_dict(self) -> dict:
        return {
            "event_id": self.event_id,
            "message_data": self.message_data,
            "client_id": self.client_id,
            "timestamp": self.timestamp.isoformat()
        }


class GlobalEventManager:
    """
    Globaler Event Manager für das gesamte System.
    Verwaltet eingehende Nachrichten und leitet sie an die Task Engine weiter.
    """
    
    def __init__(self, task_engine: 'TaskEngine'):
        self.task_engine = task_engine
        self.message_queue: Queue[MessageEvent] = Queue(maxsize=10000)
        self.is_running = False
        self.logger = logging.getLogger(f"{__name__}.GlobalEventManager")
        
        # Worker-Task für Message-Verarbeitung
        self.message_worker_task: Optional[asyncio.Task] = None
        
        # Callbacks für verschiedene Nachrichtentypen
        self.message_handlers: Dict[str, Callable[[MessageEvent], None]] = {}
        
        # Statistiken
        self.stats = {
            "total_messages": 0,
            "processed_messages": 0,
            "failed_messages": 0,
            "queue_size": 0
        }
    
    async def start(self) -> None:
        """Startet den Global Event Manager."""
        if self.is_running:
            self.logger.warning("Global Event Manager läuft bereits")
            return
        
        self.is_running = True
        
        # Message Worker starten
        self.message_worker_task = asyncio.create_task(self._message_worker_loop())
        
        self.logger.info("Global Event Manager gestartet")
    
    async def stop(self) -> None:
        """Stoppt den Global Event Manager."""
        if not self.is_running:
            return
        
        self.logger.info("Global Event Manager wird gestoppt...")
        self.is_running = False
        
        # Message Worker stoppen
        if self.message_worker_task:
            self.message_worker_task.cancel()
            try:
                await self.message_worker_task
            except asyncio.CancelledError:
                pass
        
        self.logger.info("Global Event Manager gestoppt")
    
    def submit_message(self, message_data: dict, client_id: str) -> str:
        """
        Fügt eine eingehende Nachricht zur Queue hinzu.
        
        Args:
            message_data: Nachrichtendaten
            client_id: ID des sendenden Clients
            
        Returns:
            Event-ID der Nachricht
        """
        try:
            message_event = MessageEvent(message_data, client_id)
            self.message_queue.put_nowait(message_event)
            
            self.stats["total_messages"] += 1
            self.stats["queue_size"] = self.message_queue.qsize()
            
            self.logger.debug(f"Nachricht von {client_id} zur Queue hinzugefügt: {message_event.event_id}")
            return message_event.event_id
            
        except Exception as e:
            self.logger.error(f"Fehler beim Hinzufügen der Nachricht: {e}")
            raise
    
    def register_message_handler(self, message_type: str, handler: Callable[[MessageEvent], None]) -> None:
        """
        Registriert einen Handler für einen bestimmten Nachrichtentyp.
        
        Args:
            message_type: Typ der Nachricht (z.B. 'message', 'ping', 'status')
            handler: Funktion zur Verarbeitung der Nachricht
        """
        self.message_handlers[message_type] = handler
        self.logger.info(f"Message Handler für Typ '{message_type}' registriert")
    
    async def _message_worker_loop(self) -> None:
        """Hauptschleife des Message Workers."""
        self.logger.info("Message Worker gestartet")
        
        while self.is_running:
            try:
                # Nachricht aus der Queue holen
                try:
                    message_event = self.message_queue.get_nowait()
                    self.stats["queue_size"] = self.message_queue.qsize()
                except Empty:
                    # Keine Nachrichten verfügbar, kurz warten
                    await asyncio.sleep(0.1)
                    continue
                
                # Nachricht verarbeiten
                await self._process_message(message_event)
                
            except Exception as e:
                self.logger.error(f"Fehler im Message Worker Loop: {e}")
                await asyncio.sleep(1)
    
    async def _process_message(self, message_event: MessageEvent) -> None:
        """Verarbeitet eine einzelne Nachricht."""
        try:
            self.logger.debug(f"Verarbeite Nachricht: {message_event.event_id}")
            
            # Nachrichtentyp extrahieren
            message_type = message_event.message_data.get("type", "unknown")
            
            # Registrierten Handler aufrufen
            if message_type in self.message_handlers:
                try:
                    self.message_handlers[message_type](message_event)
                    self.stats["processed_messages"] += 1
                    self.logger.debug(f"Nachricht {message_event.event_id} erfolgreich verarbeitet")
                except Exception as e:
                    self.logger.error(f"Fehler im Message Handler für {message_type}: {e}")
                    self.stats["failed_messages"] += 1
            else:
                # Standard-Handler für unbekannte Nachrichtentypen
                self.logger.warning(f"Kein Handler für Nachrichtentyp '{message_type}' registriert")
                self.stats["failed_messages"] += 1
            
        except Exception as e:
            self.logger.error(f"Fehler bei der Verarbeitung der Nachricht {message_event.event_id}: {e}")
            self.stats["failed_messages"] += 1
    
    def get_stats(self) -> Dict[str, Any]:
        """Gibt aktuelle Statistiken des Event Managers zurück."""
        stats = self.stats.copy()
        stats.update({
            "queue_size": self.message_queue.qsize(),
            "is_running": self.is_running
        })
        return stats


class TaskEngine:
    """
    Task Engine mit Priority Queue und Threadpool-Execution.
    
    Verwaltet Tasks in einer Prioritätswarteschlange und führt sie
    mit einem Threadpool aus.
    """
    
    def __init__(self, max_workers: int = 4, queue_size: int = 1000):
        """
        Initialisiert die Task Engine.
        
        Args:
            max_workers: Maximale Anzahl von Worker-Threads
            queue_size: Maximale Größe der Task-Warteschlange
        """
        self.max_workers = max_workers
        self.queue_size = queue_size
        
        # Priority Queue für Tasks
        self.task_queue = PriorityQueue(maxsize=queue_size)
        
        # Threadpool für Task-Execution
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        
        # Task-Verwaltung
        self.tasks: Dict[str, BaseTask] = {}
        self.running_tasks: Dict[str, Future] = {}
        self.completed_tasks: Dict[str, BaseTask] = {}
        
        # Engine-Status
        self.is_running = False
        self.is_shutdown = False
        
        # Event Loop für asynchrone Operationen
        self.loop: Optional[asyncio.AbstractEventLoop] = None
        
        # Callbacks
        self.on_task_completed: Optional[Callable[[BaseTask], None]] = None
        self.on_task_failed: Optional[Callable[[BaseTask, str], None]] = None
        
        # Logging
        self.logger = logging.getLogger(f"{__name__}.TaskEngine")
        
        # Statistiken
        self.stats = {
            "total_tasks": 0,
            "completed_tasks": 0,
            "failed_tasks": 0,
            "cancelled_tasks": 0,
            "queue_size": 0
        }
        
        # Global Event Manager
        self.event_manager = GlobalEventManager(self)
    
    async def start(self) -> None:
        """Startet die Task Engine."""
        if self.is_running:
            self.logger.warning("Task Engine läuft bereits")
            return
        
        self.is_running = True
        self.loop = asyncio.get_event_loop()
        
        # Worker-Task starten
        asyncio.create_task(self._worker_loop())
        
        # Global Event Manager starten
        await self.event_manager.start()
        
        self.logger.info(f"Task Engine gestartet mit {self.max_workers} Workers")
    
    async def stop(self) -> None:
        """Stoppt die Task Engine."""
        if not self.is_running:
            return
        
        self.logger.info("Task Engine wird gestoppt...")
        self.is_running = False
        
        # Global Event Manager stoppen
        await self.event_manager.stop()
        
        # Alle laufenden Tasks abbrechen
        for task_id, future in self.running_tasks.items():
            future.cancel()
        
        # Threadpool herunterfahren
        self.executor.shutdown(wait=True)
        self.is_shutdown = True
        
        self.logger.info("Task Engine gestoppt")
    
    async def submit_task(self, task: BaseTask, task_input: TaskInput) -> str:
        """
        Fügt einen Task zur Warteschlange hinzu.
        
        Args:
            task: Der auszuführende Task
            task_input: Eingabedaten für den Task
            
        Returns:
            Task-ID
            
        Raises:
            RuntimeError: Wenn die Engine nicht läuft
        """
        if not self.is_running:
            raise RuntimeError("Task Engine läuft nicht")
        
        if self.is_shutdown:
            raise RuntimeError("Task Engine ist heruntergefahren")
        
        # Task vorbereiten
        task.set_input(task_input)
        self.tasks[task.task_id] = task
        
        # Task zur Queue hinzufügen
        try:
            self.task_queue.put_nowait(task)
            self.stats["total_tasks"] += 1
            self.stats["queue_size"] = self.task_queue.qsize()
            
            self.logger.debug(f"Task {task.task_id} zur Queue hinzugefügt (Priorität: {task.priority.name})")
            return task.task_id
            
        except Exception as e:
            self.logger.error(f"Fehler beim Hinzufügen von Task {task.task_id}: {e}")
            raise
    
    async def cancel_task(self, task_id: str) -> bool:
        """
        Bricht einen Task ab.
        
        Args:
            task_id: ID des abzubrechenden Tasks
            
        Returns:
            True wenn erfolgreich abgebrochen, False sonst
        """
        if task_id in self.running_tasks:
            # Laufenden Task abbrechen
            future = self.running_tasks[task_id]
            future.cancel()
            del self.running_tasks[task_id]
            
            if task_id in self.tasks:
                self.tasks[task_id].cancel()
            
            self.stats["cancelled_tasks"] += 1
            self.logger.info(f"Task {task_id} abgebrochen")
            return True
        
        elif task_id in self.tasks:
            # Task aus der Queue entfernen (falls möglich)
            # Note: PriorityQueue unterstützt kein direktes Entfernen
            # Wir markieren den Task als abgebrochen
            self.tasks[task_id].cancel()
            self.stats["cancelled_tasks"] += 1
            self.logger.info(f"Task {task_id} als abgebrochen markiert")
            return True
        
        return False
    
    def get_task_status(self, task_id: str) -> Optional[TaskStatus]:
        """Gibt den Status eines Tasks zurück."""
        if task_id in self.tasks:
            return self.tasks[task_id].status
        elif task_id in self.completed_tasks:
            return self.completed_tasks[task_id].status
        return None
    
    def get_task_info(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Gibt detaillierte Informationen über einen Task zurück."""
        task = self.tasks.get(task_id) or self.completed_tasks.get(task_id)
        if task:
            return task.to_dict()
        return None
    
    def get_queue_size(self) -> int:
        """Gibt die aktuelle Größe der Task-Warteschlange zurück."""
        return self.task_queue.qsize()
    
    def get_stats(self) -> Dict[str, Any]:
        """Gibt aktuelle Statistiken der Task Engine zurück."""
        stats = self.stats.copy()
        stats.update({
            "queue_size": self.get_queue_size(),
            "running_tasks": len(self.running_tasks),
            "total_tasks": len(self.tasks) + len(self.completed_tasks),
            "is_running": self.is_running,
            "is_shutdown": self.is_shutdown
        })
        return stats
    
    async def _worker_loop(self) -> None:
        """Hauptschleife der Worker-Threads."""
        while self.is_running:
            try:
                # Task aus der Queue holen
                try:
                    task = self.task_queue.get_nowait()
                    self.stats["queue_size"] = self.task_queue.qsize()
                except Empty:
                    # Keine Tasks verfügbar, kurz warten
                    await asyncio.sleep(0.1)
                    continue
                
                # Task ausführen
                await self._execute_task(task)
                
            except Exception as e:
                self.logger.error(f"Fehler im Worker-Loop: {e}")
                await asyncio.sleep(1)
    
    async def _execute_task(self, task: BaseTask) -> None:
        """Führt einen einzelnen Task aus."""
        try:
            # Task als laufend markieren
            task.start()
            self.logger.debug(f"Starte Task {task.task_id}")
            
            # Task im Threadpool ausführen
            future = self.executor.submit(
                self._run_task_sync,
                task,
                task.input
            )
            
            self.running_tasks[task.task_id] = future
            
            # Auf Abschluss warten
            result = await self.loop.run_in_executor(None, future.result)
            
            # Task als abgeschlossen markieren
            task.set_output(result)
            task.complete()
            
            # Task zu completed_tasks verschieben
            if task.task_id in self.tasks:
                del self.tasks[task.task_id]
            self.completed_tasks[task.task_id] = task
            
            # Aus running_tasks entfernen
            if task.task_id in self.running_tasks:
                del self.running_tasks[task.task_id]
            
            # Statistiken aktualisieren
            self.stats["completed_tasks"] += 1
            
            # Callback aufrufen
            if self.on_task_completed:
                try:
                    self.on_task_completed(task)
                except Exception as e:
                    self.logger.error(f"Fehler im on_task_completed Callback: {e}")
            
            self.logger.debug(f"Task {task.task_id} erfolgreich abgeschlossen")
            
        except Exception as e:
            # Fehlerbehandlung
            error_msg = str(e)
            task.set_error(error_msg)
            
            # Statistiken aktualisieren
            self.stats["failed_tasks"] += 1
            
            # Aus running_tasks entfernen
            if task.task_id in self.running_tasks:
                del self.running_tasks[task.task_id]
            
            # Callback aufrufen
            if self.on_task_failed:
                try:
                    self.on_task_failed(task, error_msg)
                except Exception as callback_error:
                    self.logger.error(f"Fehler im on_task_failed Callback: {callback_error}")
            
            self.logger.error(f"Task {task.task_id} fehlgeschlagen: {error_msg}")
    
    def _run_task_sync(self, task: BaseTask, task_input: TaskInput) -> TaskOutput:
        """
        Führt einen Task synchron aus (wird im Threadpool ausgeführt).
        
        Args:
            task: Der auszuführende Task
            task_input: Eingabedaten
            
        Returns:
            TaskOutput mit dem Ergebnis
        """
        try:
            # Event Loop für asynchrone Tasks erstellen
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            # Task ausführen
            result = loop.run_until_complete(task.execute(task_input))
            return result
            
        except Exception as e:
            # Fehler-Output erstellen
            return TaskOutput(
                result=None,
                success=False,
                error=str(e)
            )
        finally:
            # Event Loop schließen
            if loop and not loop.is_closed():
                loop.close()
    
    def set_callbacks(
        self,
        on_task_completed: Optional[Callable[[BaseTask], None]] = None,
        on_task_failed: Optional[Callable[[BaseTask, str], None]] = None
    ) -> None:
        """
        Setzt Callback-Funktionen für Task-Ereignisse.
        
        Args:
            on_task_completed: Wird aufgerufen, wenn ein Task erfolgreich abgeschlossen wird
            on_task_failed: Wird aufgerufen, wenn ein Task fehlschlägt
        """
        self.on_task_completed = on_task_completed
        self.on_task_failed = on_task_failed
    
    def __del__(self):
        """Destruktor für die Task Engine."""
        if hasattr(self, 'executor') and not self.is_shutdown:
            self.executor.shutdown(wait=False)
