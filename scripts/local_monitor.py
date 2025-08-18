#!/usr/bin/env python3
"""Lokales Monitoring-Script für Chat Backend Agent.
Überwacht lokale Services, Tests und Code-Qualität.
"""

import argparse
import os
import subprocess
import sys
import time
from datetime import datetime
from typing import Dict, List, Optional


class LocalMonitor:
    """Überwacht lokale Entwicklungsstatus und Services."""

    def __init__(self):
        self.project_root = os.getcwd()
        self.start_time = time.time()

    def print_header(self):
        """Zeigt den Header des Monitors."""
        print("🚀 Chat Backend Agent - Lokaler Monitor")
        print("=" * 60)
        print(f"📁 Projekt: {os.path.basename(self.project_root)}")
        print(f"⏰ Start: {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 60)

    def check_git_status(self) -> Dict[str, any]:
        """Prüft den Git-Status."""
        print("📝 Git-Status wird geprüft...")
        
        try:
            # Aktueller Branch
            result = subprocess.run(
                ["git", "branch", "--show-current"],
                capture_output=True, text=True, check=True
            )
            current_branch = result.stdout.strip()
            
            # Letzter Commit
            result = subprocess.run(
                ["git", "log", "-1", "--oneline"],
                capture_output=True, text=True, check=True
            )
            last_commit = result.stdout.strip()
            
            # Geänderte Dateien
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                capture_output=True, text=True, check=True
            )
            changed_files = result.stdout.strip().split('\n') if result.stdout.strip() else []
            
            # Staged vs unstaged
            staged = [f for f in changed_files if f.startswith('M ') or f.startswith('A ')]
            unstaged = [f for f in changed_files if f.startswith(' M') or f.startswith('??')]
            
            status = {
                "branch": current_branch,
                "last_commit": last_commit,
                "staged_files": len(staged),
                "unstaged_files": len(unstaged),
                "total_changes": len(changed_files)
            }
            
            print(f"   🌿 Branch: {current_branch}")
            print(f"   💾 Letzter Commit: {last_commit}")
            print(f"   📦 Staged: {len(staged)} Dateien")
            print(f"   📝 Unstaged: {len(unstaged)} Dateien")
            
            return status
            
        except subprocess.CalledProcessError as e:
            print(f"   ❌ Git-Status konnte nicht abgerufen werden: {e}")
            return {}

    def check_python_environment(self) -> Dict[str, any]:
        """Prüft die Python-Umgebung."""
        print("\n🐍 Python-Umgebung wird geprüft...")
        
        try:
            # Python-Version
            result = subprocess.run(
                ["python3", "--version"],
                capture_output=True, text=True, check=True
            )
            python_version = result.stdout.strip()
            
            # Pip-Liste der installierten Pakete
            result = subprocess.run(
                ["pip", "list"],
                capture_output=True, text=True, check=True
            )
            packages = result.stdout.strip().split('\n')
            package_count = len([p for p in packages if p and not p.startswith('Package')])
            
            # Virtuelle Umgebung
            venv = os.getenv('VIRTUAL_ENV', 'Keine aktiv')
            venv_name = os.path.basename(venv) if venv != 'Keine aktiv' else 'Keine aktiv'
            
            status = {
                "python_version": python_version,
                "package_count": package_count,
                "virtual_env": venv_name
            }
            
            print(f"   🐍 Version: {python_version}")
            print(f"   📦 Pakete: {package_count} installiert")
            print(f"   🏠 Virtuelle Umgebung: {venv_name}")
            
            return status
            
        except subprocess.CalledProcessError as e:
            print(f"   ❌ Python-Umgebung konnte nicht geprüft werden: {e}")
            return {}

    def check_project_structure(self) -> Dict[str, any]:
        """Prüft die Projektstruktur."""
        print("\n📁 Projektstruktur wird geprüft...")
        
        important_dirs = [
            "server", "tests", "ui", "scripts", "docs"
        ]
        
        important_files = [
            "Makefile", "README.md", "requirements.txt", "pytest.ini"
        ]
        
        status = {
            "directories": {},
            "files": {},
            "overall": True
        }
        
        # Verzeichnisse prüfen
        for dir_name in important_dirs:
            exists = os.path.isdir(dir_name)
            status["directories"][dir_name] = exists
            icon = "✅" if exists else "❌"
            print(f"   {icon} {dir_name}/")
            
        # Dateien prüfen
        for file_name in important_files:
            exists = os.path.isfile(file_name)
            status["files"][file_name] = exists
            icon = "✅" if exists else "❌"
            print(f"   {icon} {file_name}")
            
        # Gesamtstatus
        all_good = all(status["directories"].values()) and all(status["files"].values())
        status["overall"] = all_good
        
        return status

    def run_tests(self, test_type: str = "quick") -> Dict[str, any]:
        """Führt Tests aus."""
        print(f"\n🧪 Tests werden ausgeführt ({test_type})...")
        
        try:
            if test_type == "quick":
                cmd = ["make", "test-quick"]
            elif test_type == "unit":
                cmd = ["make", "test-unit"]
            elif test_type == "all":
                cmd = ["make", "test-all"]
            else:
                cmd = ["make", "test-quick"]
            
            start_time = time.time()
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120  # 2 Minuten Timeout
            )
            end_time = time.time()
            
            execution_time = end_time - start_time
            
            if result.returncode == 0:
                print(f"   ✅ Tests erfolgreich in {execution_time:.2f}s")
                
                # Extrahiere Test-Statistiken
                output_lines = result.stdout.split('\n')
                test_stats = {}
                
                for line in output_lines:
                    if "passed" in line.lower() and "failed" in line.lower():
                        # Beispiel: "70 passed, 0 failed in 6.54s"
                        parts = line.split(',')
                        if len(parts) >= 2:
                            passed = parts[0].strip().split()[0]
                            failed = parts[1].strip().split()[0]
                            test_stats = {
                                "passed": int(passed),
                                "failed": int(failed),
                                "execution_time": execution_time
                            }
                            print(f"   📊 {passed} bestanden, {failed} fehlgeschlagen")
                            break
                
                return {
                    "success": True,
                    "execution_time": execution_time,
                    "stats": test_stats
                }
            else:
                print(f"   ❌ Tests fehlgeschlagen nach {execution_time:.2f}s")
                print(f"   📝 Fehler-Ausgabe:")
                for line in result.stderr.split('\n')[-5:]:  # Letzte 5 Zeilen
                    if line.strip():
                        print(f"      {line}")
                
                return {
                    "success": False,
                    "execution_time": execution_time,
                    "error": result.stderr
                }
                
        except subprocess.TimeoutExpired:
            print("   ⏰ Tests überschritten Timeout (2 Minuten)")
            return {
                "success": False,
                "execution_time": 120,
                "error": "Timeout"
            }
        except Exception as e:
            print(f"   ❌ Fehler beim Ausführen der Tests: {e}")
            return {
                "success": False,
                "execution_time": 0,
                "error": str(e)
            }

    def check_code_quality(self) -> Dict[str, any]:
        """Prüft Code-Qualität."""
        print("\n🔍 Code-Qualität wird geprüft...")
        
        status = {
            "flake8": False,
            "black": False,
            "overall": False
        }
        
        # Flake8 prüfen
        try:
            result = subprocess.run(
                ["flake8", "server/", "--max-line-length=100", "--ignore=E501,W503"],
                capture_output=True,
                text=True,
                timeout=30
            )
            if result.returncode == 0:
                print("   ✅ Flake8: Keine Probleme gefunden")
                status["flake8"] = True
            else:
                print(f"   ⚠️  Flake8: {len(result.stdout.splitlines())} Probleme gefunden")
                print("      💡 Führe 'flake8 server/' aus für Details")
        except (subprocess.TimeoutExpired, FileNotFoundError):
            print("   ⚠️  Flake8 nicht verfügbar oder Timeout")
        
        # Black prüfen
        try:
            result = subprocess.run(
                ["black", "--check", "server/"],
                capture_output=True,
                text=True,
                timeout=30
            )
            if result.returncode == 0:
                print("   ✅ Black: Code-Format ist korrekt")
                status["black"] = True
            else:
                print("   ⚠️  Black: Code-Format muss korrigiert werden")
                print("      💡 Führe 'black server/' aus")
        except (subprocess.TimeoutExpired, FileNotFoundError):
            print("   ⚠️  Black nicht verfügbar oder Timeout")
        
        status["overall"] = status["flake8"] and status["black"]
        return status

    def check_services(self) -> Dict[str, any]:
        """Prüft laufende Services."""
        print("\n🔍 Services werden geprüft...")
        
        services = {
            "python": "python3",
            "node": "node",
            "npm": "npm"
        }
        
        status = {}
        
        for service_name, command in services.items():
            try:
                result = subprocess.run(
                    [command, "--version"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    version = result.stdout.strip().split('\n')[0]
                    print(f"   ✅ {service_name}: {version}")
                    status[service_name] = {"available": True, "version": version}
                else:
                    print(f"   ❌ {service_name}: Nicht verfügbar")
                    status[service_name] = {"available": False, "version": None}
            except (subprocess.TimeoutExpired, FileNotFoundError):
                print(f"   ❌ {service_name}: Nicht verfügbar")
                status[service_name] = {"available": False, "version": None}
        
        return status

    def generate_report(self, results: Dict[str, any]):
        """Generiert einen Zusammenfassungsbericht."""
        print("\n" + "=" * 60)
        print("📊 ZUSAMMENFASSUNG")
        print("=" * 60)
        
        # Git-Status
        git_status = results.get("git", {})
        if git_status:
            print(f"🌿 Git: {git_status.get('branch', 'N/A')} | "
                  f"Änderungen: {git_status.get('total_changes', 0)}")
        
        # Tests
        test_status = results.get("tests", {})
        if test_status:
            if test_status.get("success"):
                stats = test_status.get("stats", {})
                print(f"🧪 Tests: ✅ {stats.get('passed', 0)} bestanden | "
                      f"Zeit: {test_status.get('execution_time', 0):.2f}s")
            else:
                print(f"🧪 Tests: ❌ Fehlgeschlagen | "
                      f"Zeit: {test_status.get('execution_time', 0):.2f}s")
        
        # Code-Qualität
        quality_status = results.get("quality", {})
        if quality_status:
            quality_score = sum([quality_status.get("flake8", False), quality_status.get("black", False)])
            print(f"🔍 Code-Qualität: {quality_score}/2 Tools bestanden")
        
        # Services
        services_status = results.get("services", {})
        if services_status:
            available_services = sum(1 for s in services_status.values() if s.get("available"))
            total_services = len(services_status)
            print(f"🔍 Services: {available_services}/{total_services} verfügbar")
        
        # Gesamtbewertung
        print("\n🎯 GESAMTBEWERTUNG:")
        
        # Einfache Bewertung
        score = 0
        max_score = 4
        
        if git_status.get("total_changes", 0) == 0:
            score += 1  # Sauberer Git-Status
        if test_status.get("success"):
            score += 1  # Tests erfolgreich
        if quality_status.get("overall"):
            score += 1  # Code-Qualität gut
        if services_status and all(s.get("available") for s in services_status.values()):
            score += 1  # Alle Services verfügbar
        
        percentage = (score / max_score) * 100
        
        if percentage >= 75:
            print("   🎉 EXCELLENT - Alles läuft perfekt!")
        elif percentage >= 50:
            print("   ✅ GUT - Einige Verbesserungen möglich")
        elif percentage >= 25:
            print("   ⚠️  BEFRIEDIGEND - Mehrere Probleme gefunden")
        else:
            print("   ❌ PROBLEMATISCH - Viele Probleme gefunden")
        
        print(f"   📊 Score: {score}/{max_score} ({percentage:.0f}%)")
        
        print(f"\n⏱️  Gesamtzeit: {time.time() - self.start_time:.2f}s")

    def run_full_monitoring(self, run_tests: bool = True, test_type: str = "quick", quiet: bool = False):
        """Führt vollständiges Monitoring durch."""
        if not quiet:
            self.print_header()
        
        results = {}
        
        # Git-Status
        if not quiet:
            print("📝 Git-Status wird geprüft...")
        results["git"] = self.check_git_status()
        
        # Python-Umgebung
        if not quiet:
            print("\n🐍 Python-Umgebung wird geprüft...")
        results["python"] = self.check_python_environment()
        
        # Projektstruktur
        if not quiet:
            print("\n📁 Projektstruktur wird geprüft...")
        results["structure"] = self.check_project_structure()
        
        # Services
        if not quiet:
            print("\n🔍 Services werden geprüft...")
        results["services"] = self.check_services()
        
        # Tests (optional)
        if run_tests:
            if not quiet:
                print(f"\n🧪 Tests werden ausgeführt ({test_type})...")
            results["tests"] = self.run_tests(test_type)
        
        # Code-Qualität
        if not quiet:
            print("\n🔍 Code-Qualität wird geprüft...")
        results["quality"] = self.check_code_quality()
        
        # Bericht generieren
        if not quiet:
            self.generate_report(results)
        
        return results


def main():
    """Hauptfunktion."""
    parser = argparse.ArgumentParser(description="Lokaler Monitor für Chat Backend Agent")
    parser.add_argument(
        "--no-tests", action="store_true", help="Überspringe Tests"
    )
    parser.add_argument(
        "--test-type", choices=["quick", "unit", "all"], default="quick",
        help="Art der Tests (Standard: quick)"
    )
    parser.add_argument(
        "--watch", action="store_true", help="Überwache kontinuierlich"
    )
    parser.add_argument(
        "--interval", type=int, default=30, help="Überwachungsintervall in Sekunden"
    )
    parser.add_argument(
        "--quiet", action="store_true", help="Reduzierte Ausgabe für Pre-Commit Hooks"
    )

    args = parser.parse_args()
    
    monitor = LocalMonitor()
    
    if args.watch:
        print("🔄 Kontinuierliche Überwachung wird gestartet...")
        print(f"⏰ Intervall: {args.interval} Sekunden")
        print("💡 Drücke Ctrl+C zum Beenden\n")
        
        try:
            while True:
                monitor.run_full_monitoring(
                    run_tests=not args.no_tests,
                    test_type=args.test_type,
                    quiet=args.quiet
                )
                print(f"\n⏳ Warte {args.interval} Sekunden...")
                time.sleep(args.interval)
                print("\n" + "="*80 + "\n")
        except KeyboardInterrupt:
            print("\n👋 Überwachung beendet")
    else:
        monitor.run_full_monitoring(
            run_tests=not args.no_tests,
            test_type=args.test_type,
            quiet=args.quiet
        )


if __name__ == "__main__":
    main()
