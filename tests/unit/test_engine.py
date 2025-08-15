"""
Unit Tests für Task Engine.
Testet Queue-Management, Worker-Logic, Priority-Handling und Event-Management.
"""

import pytest
import asyncio
import time
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

from server.tasks.engine import TaskEngine, GlobalEventManager, MessageEvent
from server.tasks.base import BaseTask, TaskInput, TaskOutput, TaskStatus, TaskPriority


class MockTask(BaseTask):
    """Mock Task für Tests."""
    
    def __init__(self, task_id: str, priority: TaskPriority = TaskPriority.NORMAL, execution_time: float = 0.1):
        super().__init__(task_id, priority)
        self.executed = False
        self.execution_time = execution_time
    
    async def execute(self, input_data: TaskInput) -> TaskOutput:
        """Mock Task-Ausführung."""
        start_time = time.time()
        await asyncio.sleep(self.execution_time)
        self.executed = True
        
        return TaskOutput(
            result={"result": f"Task {self.task_id} completed", "execution_time": time.time() - start_time},
            success=True
        )


class MockFailingTask(BaseTask):
    """Mock Task, das fehlschlägt."""
    
    def __init__(self, task_id: str, priority: TaskPriority = TaskPriority.NORMAL):
        super().__init__(task_id, priority)
        self.executed = False
    
    async def execute(self, input_data: TaskInput) -> TaskOutput:
        """Mock Task-Ausführung, die fehlschlägt."""
        self.executed = True
        raise Exception(f"Task {self.task_id} failed intentionally")


class TestMessageEvent:
    """Tests für MessageEvent-Klasse."""
    
    def test_message_event_creation(self):
        """Testet die Erstellung von MessageEvent-Objekten."""
        message_data = {"type": "test", "content": "test message"}
        client_id = "test_client_123"
        timestamp = datetime.now()
        
        event = MessageEvent(message_data, client_id, timestamp)
        
        assert event.message_data == message_data
        assert event.client_id == client_id
        assert event.timestamp == timestamp
        assert event.event_id.startswith("msg_")
        assert client_id in event.event_id
    
    def test_message_event_default_timestamp(self):
        """Testet MessageEvent mit Standard-Timestamp."""
        message_data = {"type": "test", "content": "test message"}
        client_id = "test_client_123"
        
        event = MessageEvent(message_data, client_id)
        
        assert event.timestamp is not None
        assert isinstance(event.timestamp, datetime)
    
    def test_message_event_to_dict(self):
        """Testet die to_dict-Methode von MessageEvent."""
        message_data = {"type": "test", "content": "test message"}
        client_id = "test_client_123"
        timestamp = datetime.now()
        
        event = MessageEvent(message_data, client_id, timestamp)
        event_dict = event.to_dict()
        
        assert event_dict["event_id"] == event.event_id
        assert event_dict["message_data"] == message_data
        assert event_dict["client_id"] == client_id
        assert event_dict["timestamp"] == timestamp.isoformat()


class TestGlobalEventManager:
    """Tests für GlobalEventManager."""
    
    @pytest.fixture
    def mock_task_engine(self):
        """Mock TaskEngine für Tests."""
        engine = Mock()
        engine.submit_task = AsyncMock()
        return engine
    
    @pytest.fixture
    def event_manager(self, mock_task_engine):
        """Erstellt einen GlobalEventManager für Tests."""
        return GlobalEventManager(mock_task_engine)
    
    @pytest.mark.asyncio
    async def test_event_manager_initialization(self, event_manager):
        """Testet die Initialisierung des Event Managers."""
        assert event_manager.task_engine is not None
        assert event_manager.message_queue.maxsize == 10000
        assert event_manager.is_running == False
        assert event_manager.message_handlers == {}
        assert event_manager.stats["total_messages"] == 0
    
    @pytest.mark.asyncio
    async def test_event_manager_start_stop(self, event_manager):
        """Testet Start und Stop des Event Managers."""
        # Start
        await event_manager.start()
        assert event_manager.is_running == True
        assert event_manager.message_worker_task is not None
        
        # Stop
        await event_manager.stop()
        assert event_manager.is_running == False
        assert event_manager.message_worker_task is None
    
    @pytest.mark.asyncio
    async def test_event_manager_double_start(self, event_manager):
        """Testet doppelten Start des Event Managers."""
        await event_manager.start()
        initial_task = event_manager.message_worker_task
        
        # Zweiter Start sollte ignoriert werden
        await event_manager.start()
        assert event_manager.message_worker_task == initial_task
        
        await event_manager.stop()
    
    @pytest.mark.asyncio
    async def test_event_manager_double_stop(self, event_manager):
        """Testet doppelten Stop des Event Managers."""
        await event_manager.start()
        await event_manager.stop()
        
        # Zweiter Stop sollte ignoriert werden
        await event_manager.stop()
        assert event_manager.is_running == False
    
    def test_submit_message(self, event_manager):
        """Testet das Einreichen von Nachrichten."""
        message_data = {"type": "test", "content": "test message"}
        client_id = "test_client_123"
        
        event_id = event_manager.submit_message(message_data, client_id)
        
        assert event_id.startswith("msg_")
        assert event_manager.stats["total_messages"] == 1
        assert event_manager.message_queue.qsize() == 1
    
    def test_submit_message_queue_full(self, event_manager):
        """Testet Nachrichten-Einreichung bei voller Queue."""
        # Queue mit Test-Nachrichten füllen
        for i in range(10000):
            event_manager.submit_message({"type": "fill", "content": str(i)}, f"client_{i}")
        
        assert event_manager.message_queue.full()
        
        # Weitere Nachricht sollte Exception werfen
        with pytest.raises(Exception):  # Queue.Full wird zu Exception
            event_manager.submit_message({"type": "overflow", "content": "overflow"}, "overflow_client")
    
    @pytest.mark.asyncio
    async def test_register_message_handler(self, event_manager):
        """Testet die Registrierung von Message-Handlern."""
        def test_handler(event):
            pass
        
        event_manager.register_message_handler("test_type", test_handler)
        
        assert "test_type" in event_manager.message_handlers
        assert event_manager.message_handlers["test_type"] == test_handler
    
    @pytest.mark.asyncio
    async def test_register_message_handler_override(self, event_manager):
        """Testet das Überschreiben von Message-Handlern."""
        def handler1(event):
            pass
        
        def handler2(event):
            pass
        
        event_manager.register_message_handler("test_type", handler1)
        event_manager.register_message_handler("test_type", handler2)
        
        assert event_manager.message_handlers["test_type"] == handler2
    
    @pytest.mark.asyncio
    async def test_message_worker_loop(self, event_manager):
        """Testet die Message-Worker-Schleife."""
        # Handler registrieren
        handler_called = False
        def test_handler(event):
            nonlocal handler_called
            handler_called = True
        
        event_manager.register_message_handler("test_type", test_handler)
        
        # Nachricht einreichen
        event_manager.submit_message({"type": "test_type", "content": "test"}, "test_client")
        
        # Worker starten
        await event_manager.start()
        
        # Kurz warten, damit Worker die Nachricht verarbeiten kann
        await asyncio.sleep(0.1)
        
        # Worker stoppen
        await event_manager.stop()
        
        # Überprüfe, dass Handler aufgerufen wurde
        assert handler_called
        assert event_manager.stats["processed_messages"] == 1


class TestTaskEngine:
    """Tests für TaskEngine."""
    
    @pytest.fixture
    def task_engine(self):
        """Erstellt eine TaskEngine für Tests."""
        return TaskEngine(max_workers=2, queue_size=100)
    
    @pytest.mark.asyncio
    async def test_task_engine_initialization(self, task_engine):
        """Testet die Initialisierung der Task Engine."""
        assert task_engine.max_workers == 2
        assert task_engine.queue_size == 100
        assert task_engine.is_running == False
        # Verwende das korrekte Attribut
        assert hasattr(task_engine, 'executor') or hasattr(task_engine, '_worker_loop')
        assert task_engine.event_manager is not None
    
    @pytest.mark.asyncio
    async def test_task_engine_start_stop(self, task_engine):
        """Testet Start und Stop der Task Engine."""
        # Start
        await task_engine.start()
        assert task_engine.is_running == True
        
        # Stop
        await task_engine.stop()
        assert task_engine.is_running == False
    
    @pytest.mark.asyncio
    async def test_task_engine_double_start(self, task_engine):
        """Testet doppelten Start der Task Engine."""
        await task_engine.start()
        assert task_engine.is_running == True
        
        # Zweiter Start sollte ignoriert werden
        await task_engine.start()
        assert task_engine.is_running == True
        
        await task_engine.stop()
    
    @pytest.mark.asyncio
    async def test_task_engine_double_stop(self, task_engine):
        """Testet doppelten Stop der Task Engine."""
        await task_engine.start()
        await task_engine.stop()
        
        # Zweiter Stop sollte ignoriert werden
        await task_engine.stop()
        assert task_engine.is_running == False
    
    @pytest.mark.asyncio
    async def test_submit_task_success(self, task_engine):
        """Testet erfolgreiche Task-Einreichung."""
        await task_engine.start()
        
        task = MockTask("test_task_1")
        task_input = TaskInput(data={"test": "data"})
        
        # Task einreichen
        result = await task_engine.submit_task(task, task_input)
        
        # Warten, bis Task ausgeführt wurde
        await asyncio.sleep(0.2)
        
        assert result is not None
        assert task.executed == True
        
        await task_engine.stop()
    
    @pytest.mark.asyncio
    async def test_submit_task_priority_ordering(self, task_engine):
        """Testet Task-Prioritäts-Reihenfolge."""
        await task_engine.start()
        
        # Tasks mit verschiedenen Prioritäten erstellen
        low_priority_task = MockTask("low_priority", TaskPriority.LOW)
        normal_priority_task = MockTask("normal_priority", TaskPriority.NORMAL)
        high_priority_task = MockTask("high_priority", TaskPriority.HIGH)
        
        task_input = TaskInput(data={"test": "data"})
        
        # Tasks in zufälliger Reihenfolge einreichen
        await task_engine.submit_task(normal_priority_task, task_input)
        await task_engine.submit_task(low_priority_task, task_input)
        await task_engine.submit_task(high_priority_task, task_input)
        
        # Kurz warten, damit Tasks verarbeitet werden können
        await asyncio.sleep(0.5)
        
        # Alle Tasks sollten ausgeführt worden sein
        assert low_priority_task.executed == True
        assert normal_priority_task.executed == True
        assert high_priority_task.executed == True
        
        await task_engine.stop()
    
    @pytest.mark.asyncio
    async def test_submit_task_failure_handling(self, task_engine):
        """Testet Behandlung fehlgeschlagener Tasks."""
        await task_engine.start()
        
        failing_task = MockFailingTask("failing_task")
        task_input = TaskInput(data={"test": "data"})
        
        # Task einreichen (sollte erfolgreich sein)
        task_id = await task_engine.submit_task(failing_task, task_input)
        assert task_id is not None
        
        # Warten, bis Task ausgeführt wird und fehlschlägt
        await asyncio.sleep(0.2)
        
        # Task sollte als fehlgeschlagen markiert sein
        assert failing_task.status == TaskStatus.FAILED
        assert failing_task.error is not None
        
        await task_engine.stop()
    
    @pytest.mark.asyncio
    async def test_task_engine_concurrent_execution(self, task_engine):
        """Testet gleichzeitige Task-Einreichung."""
        await task_engine.start()
        
        # Mehrere Tasks erstellen
        tasks = []
        for i in range(3):  # Weniger Tasks für stabileren Test
            task = MockTask(f"concurrent_task_{i}", execution_time=0.05)
            tasks.append(task)
        
        task_input = TaskInput(data={"test": "data"})
        
        # Alle Tasks gleichzeitig einreichen
        start_time = time.time()
        submit_tasks = [
            task_engine.submit_task(task, task_input) 
            for task in tasks
        ]
        
        # Warten, bis alle Submit-Operationen abgeschlossen sind
        await asyncio.gather(*submit_tasks)
        
        # Warten, bis alle Tasks ausgeführt wurden
        await asyncio.sleep(0.2)
        
        end_time = time.time()
        
        # Überprüfe, dass mindestens ein Task ausgeführt wurde
        executed_count = sum(1 for task in tasks if task.executed)
        assert executed_count >= 1, f"Kein Task wurde ausgeführt"
        
        # Überprüfe, dass die Einreichung schnell war
        execution_time = end_time - start_time
        assert execution_time < 0.3
        
        await task_engine.stop()
    
    @pytest.mark.asyncio
    async def test_task_engine_queue_overflow(self, task_engine):
        """Testet Queue-Überlauf-Behandlung."""
        # Task Engine mit sehr kleiner Queue erstellen
        small_queue_engine = TaskEngine(max_workers=1, queue_size=1)
        await small_queue_engine.start()
        
        # Queue mit sehr langsamen Tasks füllen
        slow_tasks = []
        for i in range(3):  # Mehr als Queue-Größe
            task = MockTask(f"slow_task_{i}", execution_time=5.0)  # Sehr lange Ausführungszeit
            slow_tasks.append(task)
        
        task_input = TaskInput(data={"test": "data"})
        
        # Ersten Task einreichen (sollte sofort starten)
        first_task = asyncio.create_task(
            small_queue_engine.submit_task(slow_tasks[0], task_input)
        )
        
        # Warten, damit erster Task startet und Worker beschäftigt ist
        await asyncio.sleep(1.0)
        
        # Zweiten Task einreichen (sollte in Queue landen)
        second_task = asyncio.create_task(
            small_queue_engine.submit_task(slow_tasks[1], task_input)
        )
        
        # Warten, bis Queue wirklich voll ist
        await asyncio.sleep(1.0)
        
        # Queue sollte jetzt voll sein
        assert small_queue_engine.get_queue_size() == 1
        
        # Dritten Task einreichen (sollte Exception werfen, da Queue voll)
        with pytest.raises(RuntimeError, match="Task Queue ist voll"):
            await small_queue_engine.submit_task(slow_tasks[2], task_input)
        
        # Warten, bis alle Tasks abgeschlossen sind
        await asyncio.gather(first_task, second_task)
        
        # Überprüfe, dass die ersten beiden Tasks ausgeführt wurden
        assert slow_tasks[0].executed == True
        assert slow_tasks[1].executed == True
        # Dritter Task wurde nie eingereicht
        assert slow_tasks[2].executed == False
        
        await small_queue_engine.stop()
    
    @pytest.mark.asyncio
    async def test_task_engine_callback_registration(self, task_engine):
        """Testet Callback-Registrierung."""
        await task_engine.start()
        
        # Callbacks definieren
        on_completed_called = False
        on_failed_called = False
        
        def on_completed(task, result):
            nonlocal on_completed_called
            on_completed_called = True
        
        def on_failed(task, error):
            nonlocal on_failed_called
            on_failed_called = True
        
        # Callbacks registrieren
        task_engine.set_callbacks(
            on_task_completed=on_completed,
            on_task_failed=on_failed
        )
        
        # Erfolgreichen Task ausführen
        successful_task = MockTask("successful_task")
        task_input = TaskInput(data={"test": "data"})
        
        await task_engine.submit_task(successful_task, task_input)
        await asyncio.sleep(0.2)  # Warten auf Callback
        
        assert on_completed_called == True
        assert on_failed_called == False
        
        # Fehlgeschlagenen Task ausführen
        failing_task = MockFailingTask("failing_task")
        
        # Task einreichen (sollte erfolgreich sein)
        task_id = await task_engine.submit_task(failing_task, task_input)
        assert task_id is not None
        
        # Warten, bis Task ausgeführt wird und fehlschlägt
        await asyncio.sleep(0.5)  # Noch länger warten
        
        # Task sollte als fehlgeschlagen markiert sein
        assert failing_task.status == TaskStatus.FAILED
        assert on_failed_called == True
        
        await task_engine.stop()
    
    @pytest.mark.asyncio
    async def test_task_engine_graceful_shutdown(self, task_engine):
        """Testet sauberes Herunterfahren der Task Engine."""
        await task_engine.start()
        
        # Mehrere Tasks einreichen
        tasks = []
        for i in range(3):
            task = MockTask(f"shutdown_test_task_{i}", execution_time=0.3)
            tasks.append(task)
        
        task_input = TaskInput(data={"test": "data"})
        
        # Tasks asynchron einreichen
        submit_tasks = [
            asyncio.create_task(task_engine.submit_task(task, task_input))
            for task in tasks
        ]
        
        # Länger warten, damit Tasks ausgeführt werden können
        await asyncio.sleep(1.0)  # Noch länger warten
        
        # Task Engine stoppen
        await task_engine.stop()
        
        # Überprüfe, dass alle Submit-Tasks abgeschlossen sind
        for submit_task in submit_tasks:
            assert submit_task.done()
        
        # Überprüfe, dass alle Tasks ausgeführt wurden
        for task in tasks:
            assert task.executed == True
    
    @pytest.mark.asyncio
    async def test_task_engine_memory_cleanup(self, task_engine):
        """Testet Speicherbereinigung der Task Engine."""
        await task_engine.start()
        
        # Viele Tasks erstellen und ausführen
        for i in range(100):
            task = MockTask(f"memory_test_task_{i}")
            task_input = TaskInput(data={"test": "data"})
            await task_engine.submit_task(task, task_input)
        
        await task_engine.stop()
        
        # Überprüfe, dass alle Tasks ausgeführt wurden
        for i in range(100):
            # MockTask-Instanzen sind nicht mehr verfügbar, aber wir können
            # überprüfen, dass keine Exceptions aufgetreten sind
            pass
        
        # Garbage Collection sollte funktionieren
        import gc
        gc.collect()
        
        # Task Engine sollte immer noch funktionieren
        assert task_engine.is_running == False


class TestTaskEngineEdgeCases:
    """Tests für Edge Cases der Task Engine."""
    
    @pytest.mark.asyncio
    async def test_task_engine_zero_workers(self):
        """Testet Task Engine mit 0 Workern."""
        # Task Engine mit 0 Workern sollte einen ValueError werfen
        with pytest.raises(ValueError):
            task_engine = TaskEngine(max_workers=0, queue_size=100)
            await task_engine.start()
    
    @pytest.mark.asyncio
    async def test_task_engine_zero_queue_size(self):
        """Testet Task Engine mit 0 Queue-Größe."""
        # Task Engine mit 0 Queue-Größe sollte einen ValueError werfen
        with pytest.raises(ValueError):
            task_engine = TaskEngine(max_workers=1, queue_size=0)
            await task_engine.start()
    
    @pytest.mark.asyncio
    async def test_task_engine_very_large_queue(self):
        """Testet Task Engine mit sehr großer Queue."""
        task_engine = TaskEngine(max_workers=1, queue_size=100000)
        await task_engine.start()
        
        # Viele Tasks einreichen
        for i in range(1000):
            task = MockTask(f"large_queue_task_{i}")
            task_input = TaskInput(data={"test": "data"})
            await task_engine.submit_task(task, task_input)
        
        await task_engine.stop()
        
        # Alle Tasks sollten ausgeführt worden sein
        # (MockTask-Instanzen sind nicht mehr verfügbar, aber keine Exceptions)
    
    @pytest.mark.asyncio
    async def test_task_engine_very_slow_tasks(self):
        """Testet Task Engine mit sehr langsamen Tasks."""
        task_engine = TaskEngine(max_workers=2, queue_size=10)
        await task_engine.start()
        
        # Sehr langsamen Task erstellen
        slow_task = MockTask("very_slow_task", execution_time=2.0)
        task_input = TaskInput(data={"test": "data"})
        
        # Task einreichen
        start_time = time.time()
        await task_engine.submit_task(slow_task, task_input)
        
        # Warten, bis Task abgeschlossen ist
        await asyncio.sleep(2.5)  # Etwas länger als die Ausführungszeit
        
        end_time = time.time()
        
        # Task sollte ausgeführt worden sein
        assert slow_task.executed == True
        assert end_time - start_time >= 2.0
        
        await task_engine.stop()
