# Task Engine

Eine einfache, aber leistungsstarke Task Engine mit Priority Queue und Threadpool-Execution.

## 🎯 Übersicht

Die Task Engine bietet eine robuste Lösung für die asynchrone Ausführung von Tasks mit:

- **Priority Queue**: Tasks werden nach Priorität ausgeführt
- **Threadpool-Execution**: Parallele Ausführung mehrerer Tasks
- **Einfache API**: Minimaler Code für maximale Funktionalität
- **Robuste Fehlerbehandlung**: Automatische Wiederholung und Fehlerbehandlung
- **Callbacks**: Event-basierte Benachrichtigungen

## 🏗️ Architektur

### **Basisklassen**

- **`TaskInput`**: Eingabedaten für Tasks
- **`TaskOutput`**: Ausgabedaten von Tasks
- **`BaseTask`**: Abstrakte Basisklasse für alle Tasks
- **`TaskPriority`**: Prioritätsstufen (LOW, NORMAL, HIGH, URGENT)
- **`TaskStatus`**: Status-Stufen (PENDING, RUNNING, COMPLETED, FAILED, CANCELLED)

### **Task Engine**

- **Priority Queue**: Verwaltet Tasks nach Priorität
- **Threadpool**: Führt Tasks parallel aus
- **Task-Verwaltung**: Verfolgt Status und Statistiken
- **Callback-System**: Event-basierte Benachrichtigungen

## 🚀 Verwendung

### **Einfacher Task erstellen**

```python
from core.tasks import BaseTask, TaskInput, TaskOutput, TaskPriority

class MyTask(BaseTask):
    async def execute(self, task_input: TaskInput) -> TaskOutput:
        # Task-Logik hier implementieren
        result = task_input.get("data", 0) * 2
        
        return TaskOutput(
            result=result,
            success=True
        )

# Task erstellen
task = MyTask(priority=TaskPriority.HIGH)
task_input = TaskInput(data={"data": 42})
```

### **Task Engine verwenden**

```python
from core.tasks import TaskEngine

# Engine erstellen und starten
engine = TaskEngine(max_workers=4, queue_size=100)
await engine.start()

# Task einreichen
task_id = await engine.submit_task(task, task_input)

# Status abrufen
status = engine.get_task_status(task_id)
info = engine.get_task_info(task_id)

# Engine stoppen
await engine.stop()
```

### **Callbacks verwenden**

```python
def on_task_completed(task):
    print(f"Task {task.task_id} abgeschlossen!")

def on_task_failed(task, error):
    print(f"Task {task.task_id} fehlgeschlagen: {error}")

engine.set_callbacks(on_task_completed, on_task_failed)
```

## 🔧 Konfiguration

### **Task Engine Parameter**

- **`max_workers`**: Maximale Anzahl Worker-Threads (Standard: 4)
- **`queue_size`**: Maximale Größe der Task-Warteschlange (Standard: 1000)

### **Task-Prioritäten**

- **`TaskPriority.LOW`**: Niedrigste Priorität
- **`TaskPriority.NORMAL`**: Normale Priorität (Standard)
- **`TaskPriority.HIGH`**: Hohe Priorität
- **`TaskPriority.URGENT`**: Höchste Priorität

## 📝 Beispiel-Tasks

### **Berechnungs-Task**

```python
from core.tasks.examples import create_calculation_task

task = create_calculation_task("add", 5, 3, TaskPriority.HIGH)
task_input = TaskInput(data={"operation": "add", "a": 5, "b": 3})
```

### **Datenverarbeitungs-Task**

```python
from core.tasks.examples import create_data_processing_task

task = create_data_processing_task([1, 3, 2, 5, 4], "sort", TaskPriority.NORMAL)
task_input = TaskInput(data={"data": [1, 3, 2, 5, 4], "operation": "sort"})
```

### **Simulations-Task**

```python
from core.tasks.examples import create_simulation_task

task = create_simulation_task(2.0, "high", TaskPriority.LOW)
task_input = TaskInput(data={"duration": 2.0, "complexity": "high"})
```

## 📊 Monitoring und Statistiken

### **Engine-Statistiken**

```python
stats = engine.get_stats()
print(f"Abgeschlossene Tasks: {stats['completed_tasks']}")
print(f"Fehlgeschlagene Tasks: {stats['failed_tasks']}")
print(f"Queue-Größe: {stats['queue_size']}")
print(f"Laufende Tasks: {stats['running_tasks']}")
```

### **Task-Informationen**

```python
info = engine.get_task_info(task_id)
print(f"Status: {info['status']}")
print(f"Ausführungszeit: {info['execution_time']}s")
print(f"Wiederholungen: {info['retry_count']}")
```

## 🔄 Task-Lebenszyklus

1. **Erstellung**: Task wird mit `BaseTask()` erstellt
2. **Einreichung**: Task wird mit `submit_task()` zur Engine hinzugefügt
3. **Warteschlange**: Task wartet in der Priority Queue
4. **Ausführung**: Worker-Thread führt Task aus
5. **Abschluss**: Task wird als COMPLETED oder FAILED markiert
6. **Aufräumen**: Task wird zu `completed_tasks` verschoben

## 🚫 Task-Abbruch

```python
# Task abbrechen
cancelled = await engine.cancel_task(task_id)

if cancelled:
    print("Task erfolgreich abgebrochen")
else:
    print("Task konnte nicht abgebrochen werden")
```

## 🧪 Tests und Beispiele

### **Beispiel ausführen**

```bash
# Alle Demonstrationen
python3 -m core.tasks.example_usage

# Oder direkt
cd core/tasks
python3 example_usage.py
```

### **Beispiel-Demonstrationen**

- **Grundlegende Tasks**: Einfache Berechnungs-Tasks
- **Priority Queue**: Prioritätsbasierte Ausführung
- **Verschiedene Task-Typen**: Datenverarbeitung, Dateien, Netzwerk
- **Callbacks**: Event-basierte Benachrichtigungen
- **Task-Abbruch**: Abbrechen laufender Tasks

## 🔮 Erweiterte Funktionen

### **Eigene Task-Typen**

```python
class CustomTask(BaseTask):
    async def execute(self, task_input: TaskInput) -> TaskOutput:
        # Eigene Logik implementieren
        custom_data = task_input.get("custom_field")
        
        # Verarbeitung...
        result = process_custom_data(custom_data)
        
        return TaskOutput(result=result, success=True)
```

### **Metadaten verwenden**

```python
task_input = TaskInput(
    data={"main_data": "value"},
    metadata={"user_id": "123", "session": "abc"}
)

# Metadaten abrufen
user_id = task_input.metadata.get("user_id")
```

### **Wiederholungslogik**

```python
if task.can_retry():
    task.increment_retry()
    # Task erneut einreichen
```

## 📚 API-Referenz

### **TaskEngine**

- `start()`: Startet die Engine
- `stop()`: Stoppt die Engine
- `submit_task(task, input)`: Reicht Task ein
- `cancel_task(task_id)`: Bricht Task ab
- `get_task_status(task_id)`: Gibt Task-Status zurück
- `get_task_info(task_id)`: Gibt Task-Informationen zurück
- `get_stats()`: Gibt Engine-Statistiken zurück

### **BaseTask**

- `execute(input)`: Führt Task aus (abstrakt)
- `start()`: Markiert Task als gestartet
- `complete()`: Markiert Task als abgeschlossen
- `cancel()`: Bricht Task ab
- `can_retry()`: Prüft, ob Task wiederholt werden kann

### **TaskInput/TaskOutput**

- `get(key, default)`: Holt Wert aus Daten
- `set(key, value)`: Setzt Wert in Daten
- `to_dict()`: Konvertiert zu Dictionary

## 🎉 Fazit

Die Task Engine bietet eine einfache, aber leistungsstarke Lösung für:

- **Asynchrone Verarbeitung**: Parallele Ausführung von Tasks
- **Prioritätsverwaltung**: Wichtige Tasks werden zuerst ausgeführt
- **Robuste Ausführung**: Automatische Fehlerbehandlung
- **Einfache Integration**: Minimaler Code für maximale Funktionalität
- **Skalierbarkeit**: Konfigurierbare Worker-Threads

Perfekt für Anwendungen, die eine zuverlässige Task-Verarbeitung benötigen!
