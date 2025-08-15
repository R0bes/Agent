"""
Beispiel-Tasks für die Task Engine.
Zeigt verschiedene Arten von Tasks und deren Implementierung.
"""

import asyncio
import time
import random
from typing import Dict, Any

from .base import BaseTask, TaskInput, TaskOutput, TaskPriority, TaskStatus


class SimpleCalculationTask(BaseTask):
    """Einfacher Berechnungs-Task."""
    
    async def execute(self, task_input: TaskInput) -> TaskOutput:
        """Führt eine einfache Berechnung aus."""
        try:
            # Eingabedaten extrahieren
            operation = task_input.get("operation", "add")
            a = task_input.get("a", 0)
            b = task_input.get("b", 0)
            
            # Berechnung durchführen
            if operation == "add":
                result = a + b
            elif operation == "subtract":
                result = a - b
            elif operation == "multiply":
                result = a * b
            elif operation == "divide":
                if b == 0:
                    raise ValueError("Division durch Null nicht erlaubt")
                result = a / b
            else:
                raise ValueError(f"Unbekannte Operation: {operation}")
            
            # Ergebnis zurückgeben
            return TaskOutput(
                result={
                    "operation": operation,
                    "a": a,
                    "b": b,
                    "result": result
                },
                success=True
            )
            
        except Exception as e:
            return TaskOutput(
                result=None,
                success=False,
                error=str(e)
            )


class DataProcessingTask(BaseTask):
    """Datenverarbeitungs-Task."""
    
    async def execute(self, task_input: TaskInput) -> TaskOutput:
        """Verarbeitet Daten."""
        try:
            # Eingabedaten extrahieren
            data = task_input.get("data", [])
            operation = task_input.get("operation", "sort")
            
            # Datenverarbeitung simulieren
            await asyncio.sleep(0.1)  # Simuliere Verarbeitungszeit
            
            if operation == "sort":
                result = sorted(data)
            elif operation == "reverse":
                result = list(reversed(data))
            elif operation == "filter_even":
                result = [x for x in data if x % 2 == 0]
            elif operation == "sum":
                result = sum(data)
            else:
                raise ValueError(f"Unbekannte Operation: {operation}")
            
            return TaskOutput(
                result={
                    "operation": operation,
                    "input_data": data,
                    "result": result,
                    "processed_at": time.time()
                },
                success=True
            )
            
        except Exception as e:
            return TaskOutput(
                result=None,
                success=False,
                error=str(e)
            )


class SimulationTask(BaseTask):
    """Simulations-Task mit variabler Laufzeit."""
    
    async def execute(self, task_input: TaskInput) -> TaskOutput:
        """Führt eine Simulation aus."""
        try:
            # Eingabeparameter
            duration = task_input.get("duration", 1.0)  # Sekunden
            complexity = task_input.get("complexity", "low")
            
            # Komplexität-basierte Verarbeitungszeit
            if complexity == "low":
                actual_duration = duration * 0.5
            elif complexity == "medium":
                actual_duration = duration * 1.0
            elif complexity == "high":
                actual_duration = duration * 2.0
            else:
                actual_duration = duration
            
            # Simulation ausführen
            await asyncio.sleep(actual_duration)
            
            # Zufällige Ergebnisse generieren
            results = []
            for i in range(int(complexity == "high" and 10 or 5)):
                results.append({
                    "iteration": i,
                    "value": random.random() * 100,
                    "timestamp": time.time()
                })
            
            return TaskOutput(
                result={
                    "requested_duration": duration,
                    "actual_duration": actual_duration,
                    "complexity": complexity,
                    "results": results,
                    "completed_at": time.time()
                },
                success=True
            )
            
        except Exception as e:
            return TaskOutput(
                result=None,
                success=False,
                error=str(e)
            )


class FileProcessingTask(BaseTask):
    """Dateiverarbeitungs-Task (Simulation)."""
    
    async def execute(self, task_input: TaskInput) -> TaskOutput:
        """Verarbeitet eine Datei (simuliert)."""
        try:
            # Eingabeparameter
            filename = task_input.get("filename", "unknown.txt")
            operation = task_input.get("operation", "read")
            file_size = task_input.get("file_size", 1024)  # Bytes
            
            # Verarbeitungszeit basierend auf Dateigröße simulieren
            processing_time = file_size / 1024  # 1 Sekunde pro KB
            await asyncio.sleep(min(processing_time, 5.0))  # Max 5 Sekunden
            
            if operation == "read":
                result = {
                    "operation": "read",
                    "filename": filename,
                    "file_size": file_size,
                    "content_preview": "Lorem ipsum..."[:100],
                    "lines": file_size // 80,  # Geschätzte Zeilenanzahl
                    "processed_at": time.time()
                }
            elif operation == "write":
                result = {
                    "operation": "write",
                    "filename": filename,
                    "bytes_written": file_size,
                    "status": "success",
                    "processed_at": time.time()
                }
            elif operation == "delete":
                result = {
                    "operation": "delete",
                    "filename": filename,
                    "status": "deleted",
                    "processed_at": time.time()
                }
            else:
                raise ValueError(f"Unbekannte Operation: {operation}")
            
            return TaskOutput(
                result=result,
                success=True
            )
            
        except Exception as e:
            return TaskOutput(
                result=None,
                success=False,
                error=str(e)
            )


class NetworkTask(BaseTask):
    """Netzwerk-Task (Simulation)."""
    
    async def execute(self, task_input: TaskInput) -> TaskOutput:
        """Führt einen Netzwerk-Task aus (simuliert)."""
        try:
            # Eingabeparameter
            url = task_input.get("url", "https://example.com")
            method = task_input.get("method", "GET")
            timeout = task_input.get("timeout", 5.0)
            
            # Netzwerk-Latenz simulieren
            latency = random.uniform(0.1, 2.0)
            await asyncio.sleep(latency)
            
            # Erfolgsrate basierend auf URL simulieren
            success_rate = 0.95  # 95% Erfolgsrate
            if random.random() > success_rate:
                raise ConnectionError("Verbindung fehlgeschlagen")
            
            # Response simulieren
            response = {
                "url": url,
                "method": method,
                "status_code": 200,
                "latency": latency,
                "response_size": random.randint(100, 10000),
                "headers": {
                    "content-type": "application/json",
                    "server": "nginx/1.18.0"
                },
                "processed_at": time.time()
            }
            
            return TaskOutput(
                result=response,
                success=True
            )
            
        except Exception as e:
            return TaskOutput(
                result=None,
                success=False,
                error=str(e)
            )


# Factory-Funktionen für einfache Task-Erstellung
def create_calculation_task(operation: str, a: float, b: float, priority: TaskPriority = TaskPriority.NORMAL) -> SimpleCalculationTask:
    """Erstellt einen Berechnungs-Task."""
    task = SimpleCalculationTask(priority=priority)
    return task


def create_data_processing_task(data: list, operation: str, priority: TaskPriority = TaskPriority.NORMAL) -> DataProcessingTask:
    """Erstellt einen Datenverarbeitungs-Task."""
    task = DataProcessingTask(priority=priority)
    return task


def create_simulation_task(duration: float, complexity: str = "medium", priority: TaskPriority = TaskPriority.NORMAL) -> SimulationTask:
    """Erstellt einen Simulations-Task."""
    task = SimulationTask(priority=priority)
    return task


def create_file_processing_task(filename: str, operation: str, file_size: int = 1024, priority: TaskPriority = TaskPriority.NORMAL) -> FileProcessingTask:
    """Erstellt einen Dateiverarbeitungs-Task."""
    task = FileProcessingTask(priority=priority)
    return task


def create_network_task(url: str, method: str = "GET", timeout: float = 5.0, priority: TaskPriority = TaskPriority.NORMAL) -> NetworkTask:
    """Erstellt einen Netzwerk-Task."""
    task = NetworkTask(priority=priority)
    return task
