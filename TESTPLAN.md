# 🧪 TESTPLAN.md - Chat Backend Test Suite

## 📋 Übersicht

Diese Test-Suite implementiert eine **risikobasierte, vertragsorientierte Test-Strategie** für das Chat Backend, die sich auf Verhalten, Schnittstellen und Stabilität konzentriert, anstatt nur auf Code-Coverage zu achten.

## 🎯 Test-Strategie

### **Test-Pyramide**
- **Unit Tests (70%)**: Schnelle, isolierte Tests für einzelne Komponenten
- **Integration Tests (25%)**: Tests für Komponenten-Interaktionen
- **E2E Smoke Tests (5%)**: Wenige, deterministische End-to-End-Tests

### **Prioritäten**
1. **🔴 Kritische Risiken**: Security, Data Loss, Concurrency
2. **🟡 Hohe Risiken**: Business Logic, Performance
3. **🟢 Mittlere Risiken**: Error Handling, Logging

## 🚨 Risiko-Analyse & Test-Mapping

### **🔴 Kritische Risiken**

| Risiko | Wahrscheinlichkeit | Auswirkung | Test-Strategie |
|--------|-------------------|------------|----------------|
| **WebSocket Injection** | Hoch | Kritisch | Unit + Integration Tests für JSON-Validierung |
| **Authentication Bypass** | Mittel | Kritisch | Unit Tests für Client-ID-Validierung |
| **Resource Exhaustion** | Mittel | Hoch | Unit Tests für Queue-Größen, Memory Tests |
| **Concurrency Issues** | Hoch | Hoch | Concurrency Tests, Race Condition Tests |

### **🟡 Hohe Risiken**

| Risiko | Wahrscheinlichkeit | Auswirkung | Test-Strategie |
|--------|-------------------|------------|----------------|
| **Task Processing Failures** | Mittel | Hoch | Unit Tests für Task Engine, Error Handling |
| **Streaming Timeouts** | Mittel | Mittel | Integration Tests für WebSocket Timeouts |
| **Memory Leaks** | Niedrig | Hoch | Memory Usage Tests, Garbage Collection Tests |

### **🟢 Mittlere Risiken**

| Risiko | Wahrscheinlichkeit | Auswirkung | Test-Strategie |
|--------|-------------------|------------|----------------|
| **Error Handling** | Niedrig | Mittel | Unit Tests für Exception Handling |
| **Logging** | Niedrig | Niedrig | Logging Tests, Audit Trail Tests |
| **Graceful Shutdown** | Niedrig | Mittel | Shutdown Tests, Resource Cleanup Tests |

## 🧪 Test-Kategorien

### **Unit Tests**
- **API Endpoints**: Request/Response-Validierung, Error-Handling
- **Connection Manager**: WebSocket-Lifecycle, Concurrency
- **Task Engine**: Queue-Management, Worker-Logic, Priority-Handling
- **Event Manager**: Message-Routing, Handler-Registration

### **Integration Tests**
- **WebSocket Communication**: Echte WebSocket-Verbindungen
- **Task Processing Pipeline**: End-to-End Task-Execution
- **Event System**: Message-Flow zwischen Komponenten

### **E2E Smoke Tests**
- **Core User Journey**: WebSocket → Chat → Response
- **Streaming Flow**: Streaming-Request → Token-Stream
- **Error Recovery**: Connection Loss → Reconnect

## 🛠️ Test-Stack

```python
# Python Test Stack
pytest==7.4.3              # Test Framework
pytest-asyncio==0.21.1     # Async Support
pytest-cov==4.1.0          # Coverage Reports
pytest-mock==3.12.0        # Mocking
hypothesis==6.92.2         # Property-Based Testing
httpx==0.25.2              # HTTP Client Testing
websockets==12.0            # WebSocket Testing
pytest-benchmark==4.0.0    # Performance Testing
mutmut==2.2.0              # Mutation Testing
pytest-xdist==3.3.1        # Parallel Execution
pytest-html==3.3.2         # HTML Reports
```

## 📁 Test-Struktur

```
tests/
├── unit/                          # Unit Tests (70%)
│   ├── test_api.py               # API Endpoints
│   ├── test_core.py              # Core Components
│   └── test_engine.py            # Task Engine
├── integration/                   # Integration Tests (25%)
│   ├── test_websocket.py         # WebSocket Communication
│   └── test_task_pipeline.py     # Task Processing
├── e2e/                          # E2E Tests (5%)
│   └── test_smoke.py             # Core User Flows
├── conftest.py                   # Test Fixtures
└── test_utils.py                 # Test Helpers
```

## 🎯 Qualitäts-Metriken

### **Coverage-Ziele**
- **Line Coverage**: 70-80% (kritische Module: ≥90%)
- **Branch Coverage**: ≥60%
- **Function Coverage**: ≥80%

### **Mutation Score**
- **Gesamt**: ≥75%
- **Kritische Module**: ≥85%

### **Performance-Ziele**
- **Unit Tests**: <30s
- **Integration Tests**: <2min
- **E2E Tests**: <1min

### **Stabilität**
- **Flake Rate**: <1%
- **Deterministic Tests**: 100%

## 🚀 Ausführung

### **Lokale Ausführung**

```bash
# Setup
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows
pip install -r requirements.txt
pip install -r requirements-test.txt

# Unit Tests
pytest tests/unit/ -v --cov=server --cov-report=html

# Integration Tests
pytest tests/integration/ -v

# E2E Tests
pytest tests/e2e/ -v

# Alle Tests
pytest tests/ -v --cov=server --cov-report=html

# Coverage Report öffnen
open htmlcov/index.html  # Mac
# start htmlcov/index.html  # Windows
```

### **CI/CD Integration**

```yaml
# .github/workflows/test.yml
- name: Run Tests
  run: |
    pytest tests/unit/ --cov=server --cov-report=xml --cov-report=html
    pytest tests/integration/ --cov=server --cov-append
    pytest tests/e2e/ --cov=server --cov-append
    
- name: Mutation Testing
  run: mutmut run --paths-to-mutate=server/
  
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage.xml
```

## 📊 Test-Reports

### **Coverage Reports**
- **HTML**: `htmlcov/index.html`
- **XML**: `coverage.xml` (für CI/CD)
- **Terminal**: Inline Coverage-Output

### **Mutation Reports**
- **Terminal**: `mutmut run --paths-to-mutate=server/`
- **HTML**: `mutmut.html` (falls verfügbar)

### **Performance Reports**
- **Benchmark**: `pytest --benchmark-only`
- **Timing**: `pytest --durations=10`

## 🔍 Test-Fokus

### **Was wir testen**
- ✅ **Public APIs**: Alle HTTP-Endpunkte
- ✅ **WebSocket-Verbindungen**: Connection Lifecycle
- ✅ **Task Processing**: Queue-Management, Worker-Logic
- ✅ **Error Handling**: Exception-Behandlung, Graceful Degradation
- ✅ **Concurrency**: Race Conditions, Resource Management
- ✅ **Security**: Input-Validierung, Injection-Prevention

### **Was wir NICHT testen**
- ❌ **Private Methods**: Nur über Public APIs
- ❌ **Third-Party Dependencies**: Gemockt
- ❌ **UI Details**: Fokus auf Backend-Logic
- ❌ **Configuration**: Nur Default-Values

## 🚨 Bekannte Probleme & Workarounds

### **WebSocket Testing**
- **Problem**: Async WebSocket-Tests sind flaky
- **Lösung**: Mock WebSockets in Unit Tests, echte WebSockets nur in Integration Tests

### **Task Engine Concurrency**
- **Problem**: Race Conditions in Tests
- **Lösung**: Deterministische Test-Daten, isolierte Test-Instanzen

### **Queen Agent Dependencies**
- **Problem**: Externe Agent-Abhängigkeiten
- **Lösung**: Vollständiges Mocking aller Agent-Aufrufe

## 📈 Continuous Improvement

### **Wöchentliche Metriken**
- Test-Execution-Time
- Coverage-Trends
- Flake-Rate
- Mutation-Score

### **Monatliche Reviews**
- Test-Effektivität
- Risiko-Updates
- Test-Strategy-Anpassungen

## 🎯 Nächste Schritte

1. **Phase 1**: Unit Tests für kritische Module ✅
2. **Phase 2**: Integration Tests für WebSocket & Task Pipeline ✅
3. **Phase 3**: E2E Smoke Tests ✅
4. **Phase 4**: Performance & Load Tests
5. **Phase 5**: Security & Penetration Tests
6. **Phase 6**: Mutation Testing & Coverage-Optimierung

## 📞 Support & Fragen

Bei Fragen zur Test-Suite oder Test-Strategie:
- **Issues**: GitHub Issues mit `test-` Label
- **Discussions**: GitHub Discussions
- **Documentation**: Diese TESTPLAN.md

---

**Letzte Aktualisierung**: $(date)
**Test-Suite Version**: 1.0.0
**Coverage-Ziel**: 70-80%
**Mutation Score-Ziel**: ≥75%
