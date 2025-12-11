#!/usr/bin/env python3
"""Agent Development Tool CLI - Split view with menu and logs."""

import sys
import subprocess
import shutil
import time
import threading
import queue
import re
from pathlib import Path
from typing import Dict, List, Optional, Deque
from collections import deque
import requests
from rich.console import Console
from rich.layout import Layout
from rich.live import Live
from rich.panel import Panel
from rich.text import Text
from rich import box

# Optional: process management
try:
    import psutil
except ImportError:
    psutil = None

# Optional: color support for Windows terminals
try:
    import colorama
    colorama.just_fix_windows_console()
except ImportError:
    pass

console = Console()

# ============================================================================
# CONFIGURATION - All ports defined in one place
# ============================================================================
# Main service ports
BACKEND_PORT = 3001
FRONTEND_PORT = 5174

# gRPC service ports (must match backend/src/config/ports.ts)
GRPC_BASE_PORT = 52000
GRPC_PORTS = {
    'toolbox': GRPC_BASE_PORT + 0,    # 52000
    'llm': GRPC_BASE_PORT + 1,        # 52001
    'persona': GRPC_BASE_PORT + 2,    # 52002
    'scheduler': GRPC_BASE_PORT + 3, # 52003
    'memory': GRPC_BASE_PORT + 4      # 52004
}
# ============================================================================

# Project paths
ROOT_DIR = Path(__file__).parent.parent.parent.resolve()
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
DOCKER_COMPOSE_FILE = ROOT_DIR / "devops" / "docker-compose.yml"
DOCKER_SERVICES = ["postgres", "redis", "qdrant", "nats"]

# Global process tracking
_running_processes: Dict[str, subprocess.Popen] = {}
_log_queue = queue.Queue()
_log_buffer: Deque[str] = deque(maxlen=1000)  # Keep last 1000 log lines
_log_thread: Optional[threading.Thread] = None
_log_enabled = False


def get_npm_command() -> List[str]:
    """Get npm command for current platform."""
    if sys.platform == "win32" and shutil.which("npm.cmd"):
        return ["npm.cmd"]
    return ["npm"]


def check_port_in_use(host: str, port: int, timeout: float = 0.1) -> bool:
    """Check if a port is in use."""
    import socket
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except Exception:
        return False


def check_http_service(url: str, timeout: float = 0.2) -> bool:
    """Check if HTTP service is responding."""
    try:
        requests.get(url, timeout=timeout)
        return True
    except Exception:
        return False


def check_docker_service(service_name: str) -> bool:
    """Check if Docker service is running."""
    try:
        result = subprocess.run(
            ["docker", "ps", "--filter", f"name=agent-{service_name}", "--format", "{{.Status}}"],
            capture_output=True,
            text=True,
            timeout=1.0
        )
        return result.returncode == 0 and result.stdout.strip() != ""
    except Exception:
        return False


def get_status() -> Dict[str, bool]:
    """Get status of all services - optimized with parallel checks."""
    import concurrent.futures
    
    # Run checks in parallel for better performance
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        backend_future = executor.submit(check_http_service, f"http://localhost:{BACKEND_PORT}/health")
        frontend_future = executor.submit(check_http_service, f"http://localhost:{FRONTEND_PORT}")
        infra_futures = [executor.submit(check_docker_service, s) for s in DOCKER_SERVICES]
        
        backend_status = backend_future.result()
        frontend_status = frontend_future.result()
        infra_status = all(f.result() for f in infra_futures)
    
    return {
        "backend": backend_status,
        "frontend": frontend_status,
        "infra": infra_status
    }


def colorize_log_line(line: str) -> str:
    """Colorize log line based on level."""
    match = re.match(r'^(\d{2}:\d{2}:\d{2})\s+([TDIWEF])\s+(.*)$', line)
    if match:
        time_part, level, message = match.groups()
        colors = {
            'T': 'dim', 'D': 'dim', 'I': 'green',
            'W': 'yellow', 'E': 'red', 'F': 'red bold'
        }
        color = colors.get(level, '')
        if color:
            return f"[dim]{time_part}[/dim] [{color}]{message}[/{color.split()[0]}]"
    return line


def log_worker():
    """Background thread that collects logs from queue."""
    global _log_enabled
    while _log_enabled or not _log_queue.empty():
        try:
            source, line = _log_queue.get(timeout=0.5)
            if line:
                if source == "backend":
                    formatted = f"[blue][Backend][/blue] {colorize_log_line(line)}"
                elif source == "frontend":
                    formatted = f"[magenta][Frontend][/magenta] {line.rstrip()}"
                else:
                    formatted = line
                _log_buffer.append(formatted)
        except queue.Empty:
            continue


def start_log_monitoring():
    """Start background log monitoring."""
    global _log_thread, _log_enabled
    if _log_thread is None or not _log_thread.is_alive():
        _log_enabled = True
        _log_thread = threading.Thread(target=log_worker, daemon=True)
        _log_thread.start()


def stop_log_monitoring():
    """Stop background log monitoring."""
    global _log_enabled
    _log_enabled = False


def read_process_output(process: subprocess.Popen, source: str):
    """Read output from process and add to log queue."""
    try:
        for line in iter(process.stdout.readline, ''):
            if line:
                _log_queue.put((source, line.rstrip()))
    except Exception:
        pass


def find_backend_processes() -> List:
    """Find all running backend processes - optimized version."""
    if not psutil:
        return []
    
    processes = []
    backend_dir_lower = str(BACKEND_DIR).lower()
    
    # First, check if port is in use - if not, no backend is running
    if not check_port_in_use("localhost", BACKEND_PORT, timeout=0.05):
        return []
    
    try:
        # Only check processes with names that could be node/tsx/npm
        # This is much faster than iterating all processes
        relevant_names = ['node.exe', 'node', 'tsx', 'npm.cmd', 'npm']
        
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'cwd']):
            try:
                proc_name = proc.info.get('name', '').lower()
                
                # Fast filter: skip if name doesn't match
                if not any(name in proc_name for name in relevant_names):
                    continue
                
                cmdline = proc.info.get('cmdline', [])
                if not cmdline:
                    continue
                
                cmdline_str = ' '.join(str(c) for c in cmdline).lower()
                cwd = proc.info.get('cwd', '')
                cwd_str = str(cwd).lower() if cwd else ''
                
                # Check if it's a backend process:
                is_backend = False
                
                # Check for tsx/node processes with server.ts/js
                if ('tsx' in cmdline_str or 'node' in cmdline_str) and ('server.ts' in cmdline_str or 'server.js' in cmdline_str):
                    if backend_dir_lower in cmdline_str or backend_dir_lower in cwd_str:
                        is_backend = True
                
                # Check for npm run dev/dev:once in backend directory
                if not is_backend and ('npm' in cmdline_str or 'npm.cmd' in cmdline_str):
                    if ('dev' in cmdline_str or 'dev:once' in cmdline_str) and backend_dir_lower in cwd_str:
                        is_backend = True
                
                if is_backend:
                    processes.append(proc)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
            except Exception:
                continue
    except Exception:
        pass
    
    return processes


def kill_backend_processes():
    """Kill all running backend processes."""
    processes = find_backend_processes()
    for proc in processes:
        try:
            pid = proc.info['pid']
            console.print(f"[dim]Killing backend process (PID {pid})...[/dim]")
            proc.terminate()
            time.sleep(0.5)
            if proc.is_running():
                proc.kill()
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
        except Exception:
            pass


def start_backend(foreground: bool = False):
    """Start backend service."""
    # Check if backend is already running (by port or process tracking)
    if _running_processes.get("backend"):
        if foreground:
            console.print("[yellow]Backend is already running (tracked)[/yellow]")
        return
    
    # ALWAYS kill any existing backend processes before starting
    # This prevents multiple instances from running
    # Only check processes if port is in use (optimization)
    if check_port_in_use("localhost", BACKEND_PORT, timeout=0.1):
        existing_processes = find_backend_processes()
        if existing_processes:
            if foreground:
                console.print(f"[yellow]Found {len(existing_processes)} existing backend process(es), killing them...[/yellow]")
            else:
                console.print(f"[dim]Killing {len(existing_processes)} existing backend process(es)...[/dim]")
            kill_backend_processes()
            time.sleep(1)  # Reduced wait time
        
        # Double-check port is free
        if check_port_in_use("localhost", BACKEND_PORT, timeout=0.1):
            if foreground:
                console.print(f"[yellow]Port {BACKEND_PORT} still in use, waiting...[/yellow]")
            time.sleep(1)  # Reduced wait time
            # Try killing again
            kill_backend_processes()
            time.sleep(0.5)  # Reduced wait time
    
    try:
        if foreground:
            # Start in foreground - show logs directly
            # Use dev:once to avoid watch mode causing multiple restarts
            console.print("[yellow]Starting backend...[/yellow]")
            console.print("[dim]Press Ctrl+C to stop[/dim]\n")
            process = subprocess.Popen(
                get_npm_command() + ["run", "dev:once"],
                cwd=BACKEND_DIR,
                stdout=None,
                stderr=None,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
            )
            _running_processes["backend"] = process
            try:
                process.wait()
            except KeyboardInterrupt:
                console.print("\n[yellow]Stopping backend...[/yellow]")
                process.terminate()
                time.sleep(1)
                if process.poll() is None:
                    process.kill()
                _running_processes.pop("backend", None)
                console.print("[green]Backend stopped[/green]")
        else:
            # Start in background - use queue
            # Use dev:once to avoid watch mode causing multiple restarts
            process = subprocess.Popen(
                get_npm_command() + ["run", "dev:once"],
                cwd=BACKEND_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
            )
            _running_processes["backend"] = process
            
            thread = threading.Thread(
                target=read_process_output,
                args=(process, "backend"),
                daemon=True
            )
            thread.start()
            
            start_log_monitoring()
    except Exception as e:
        if foreground:
            console.print(f"[red]Failed to start backend: {e}[/red]")
        pass


def stop_backend():
    """Stop backend service."""
    # Stop tracked process
    process = _running_processes.get("backend")
    if process:
        try:
            process.terminate()
            time.sleep(1)
            if process.poll() is None:
                process.kill()
            _running_processes.pop("backend", None)
        except Exception:
            pass
    
    # Also kill any other backend processes
    kill_backend_processes()


def start_frontend(foreground: bool = False):
    """Start frontend service."""
    # Check if frontend is already running (by port or process tracking)
    if _running_processes.get("frontend"):
        if foreground:
            console.print("[yellow]Frontend is already running (tracked)[/yellow]")
        return
    
    # Check if port is already in use (another process might be running)
    if check_port_in_use("localhost", FRONTEND_PORT):
        if foreground:
            console.print(f"[red]Port {FRONTEND_PORT} is already in use[/red]")
            console.print("[yellow]Frontend is already running. Stop it first.[/yellow]")
        return
    
    # Also check HTTP service
    if check_http_service(f"http://localhost:{FRONTEND_PORT}"):
        if foreground:
            console.print(f"[yellow]Frontend is already running on port {FRONTEND_PORT}[/yellow]")
            console.print("[dim]Stop it first or use a different port[/dim]")
        return
    
    try:
        if foreground:
            # Start in foreground - show logs directly
            console.print("[yellow]Starting frontend...[/yellow]")
            console.print("[dim]Press Ctrl+C to stop[/dim]\n")
            process = subprocess.Popen(
                get_npm_command() + ["run", "dev"],
                cwd=FRONTEND_DIR,
                stdout=None,
                stderr=None,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
            )
            _running_processes["frontend"] = process
            try:
                process.wait()
            except KeyboardInterrupt:
                console.print("\n[yellow]Stopping frontend...[/yellow]")
                process.terminate()
                time.sleep(1)
                if process.poll() is None:
                    process.kill()
                _running_processes.pop("frontend", None)
                console.print("[green]Frontend stopped[/green]")
        else:
            # Start in background - use queue
            process = subprocess.Popen(
                get_npm_command() + ["run", "dev"],
                cwd=FRONTEND_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
            )
            _running_processes["frontend"] = process
            
            thread = threading.Thread(
                target=read_process_output,
                args=(process, "frontend"),
                daemon=True
            )
            thread.start()
            
            start_log_monitoring()
    except Exception as e:
        if foreground:
            console.print(f"[red]Failed to start frontend: {e}[/red]")
        pass


def stop_frontend():
    """Stop frontend service."""
    process = _running_processes.get("frontend")
    if not process:
        return
    
    try:
        process.terminate()
        time.sleep(1)
        if process.poll() is None:
            process.kill()
        _running_processes.pop("frontend", None)
    except Exception:
        pass


def start_infrastructure():
    """Start infrastructure services."""
    try:
        for service in DOCKER_SERVICES:
            subprocess.run(
                ["docker", "rm", "-f", f"agent-{service}"],
                capture_output=True,
                timeout=5
            )
        
        subprocess.run(
            ["docker", "compose", "-f", str(DOCKER_COMPOSE_FILE), "up", "-d"] + DOCKER_SERVICES,
            cwd=ROOT_DIR,
            capture_output=True,
            text=True
        )
    except Exception:
        pass


def stop_infrastructure():
    """Stop infrastructure services."""
    try:
        subprocess.run(
            ["docker", "compose", "-f", str(DOCKER_COMPOSE_FILE), "down"],
            cwd=ROOT_DIR,
            capture_output=True
        )
    except Exception:
        pass


def stop_all():
    """Stop all services."""
    stop_backend()
    stop_frontend()
    stop_infrastructure()


def start_all():
    """Start all services."""
    start_infrastructure()
    time.sleep(2)
    start_backend()
    start_frontend()


def create_menu_panel(selected: int = 0, status: Optional[Dict[str, bool]] = None) -> Panel:
    """Create menu panel with status-based styling."""
    if status is None:
        status = get_status()
    all_running = status["backend"] and status["frontend"] and status["infra"]
    
    menu_items = [
        ("All", all_running),
        ("BE", status["backend"]),
        ("FE", status["frontend"]),
        ("Infra", status["infra"]),
        ("Exit", False)
    ]
    
    lines = []
    for i, (label, running) in enumerate(menu_items):
        prefix = "➜  " if i == selected else "   "
        if running:
            style = "[green]"
            icon = "●"
        else:
            style = "[red]"
            icon = "○"
        
        if i == selected:
            style = "[bold " + style[1:]  # Make selected bold
        
        lines.append(f"{prefix}{style}{icon} {label}[/]")
    
    return Panel(
        "\n".join(lines),
        title="[bold cyan]Menu[/bold cyan]",
        border_style="cyan",
        box=box.ROUNDED
    )


def create_logs_panel() -> Panel:
    """Create logs panel with recent log entries."""
    log_text = "\n".join(list(_log_buffer)[-50:])  # Show last 50 lines
    if not log_text:
        log_text = "[dim]No logs yet...[/dim]"
    
    return Panel(
        log_text,
        title="[bold cyan]Logs[/bold cyan]",
        border_style="cyan",
        box=box.ROUNDED
    )


def interactive_menu():
    """Interactive split-view menu with live logs."""
    input_queue = queue.Queue()
    running = True
    selected = 0
    max_selection = 4
    selected_lock = threading.Lock()
    status_cache = {"backend": False, "frontend": False, "infra": False}
    status_lock = threading.Lock()
    last_status_check = 0
    STATUS_CHECK_INTERVAL = 3.0  # Check status every 3 seconds (less frequent)
    
    def update_status_cache():
        """Update status cache in background."""
        nonlocal last_status_check
        current_time = time.time()
        if current_time - last_status_check > STATUS_CHECK_INTERVAL:
            new_status = get_status()
            with status_lock:
                status_cache.update(new_status)
            last_status_check = current_time
    
    def get_cached_status() -> Dict[str, bool]:
        """Get cached status."""
        with status_lock:
            return status_cache.copy()
    
    def get_char_non_blocking():
        """Get a single character non-blocking."""
        if sys.platform == "win32":
            try:
                import msvcrt
                if msvcrt.kbhit():
                    ch = msvcrt.getch()
                    if isinstance(ch, bytes):
                        # Handle arrow keys on Windows
                        if ch == b'\xe0':
                            ch2 = msvcrt.getch()
                            if isinstance(ch2, bytes):
                                if ch2 == b'H':  # Up
                                    return '\x1b[A'
                                elif ch2 == b'P':  # Down
                                    return '\x1b[B'
                        return ch.decode('utf-8', errors='ignore')
                    return ch
            except Exception:
                pass
        else:
            try:
                import select
                import tty
                import termios
                if select.select([sys.stdin], [], [], 0)[0]:
                    old_settings = termios.tcgetattr(sys.stdin)
                    try:
                        tty.setcbreak(sys.stdin.fileno())
                        ch = sys.stdin.read(1)
                        # Check for escape sequence (arrow keys)
                        if ch == '\x1b':
                            ch2 = sys.stdin.read(2)
                            if ch2 == '[A':  # Up
                                return '\x1b[A'
                            elif ch2 == '[B':  # Down
                                return '\x1b[B'
                        return ch
                    finally:
                        termios.tcsetattr(sys.stdin, termios.TCSADRAIN, old_settings)
            except Exception:
                pass
        return None
    
    def input_thread():
        """Thread for reading user input non-blocking."""
        nonlocal running, selected
        while running:
            ch = get_char_non_blocking()
            if ch:
                if ch == '\r' or ch == '\n':  # Enter
                    input_queue.put("enter")
                elif ch == '\x1b[A':  # Up arrow
                    with selected_lock:
                        selected = (selected - 1) % (max_selection + 1)
                elif ch == '\x1b[B':  # Down arrow
                    with selected_lock:
                        selected = (selected + 1) % (max_selection + 1)
                elif ch == '\x1b':  # ESC
                    running = False
                    input_queue.put("exit")
                    break
                elif ch.lower() == 'q':
                    running = False
                    input_queue.put("exit")
                    break
            time.sleep(0.001)  # Much faster polling
    
    input_thread_obj = threading.Thread(target=input_thread, daemon=True)
    input_thread_obj.start()
    
    def make_layout() -> Layout:
        layout = Layout()
        layout.split_row(
            Layout(name="menu", ratio=1),
            Layout(name="logs", ratio=3)
        )
        with selected_lock:
            current_selected = selected
        # Use cached status for fast rendering
        cached_status = get_cached_status()
        layout["menu"].update(create_menu_panel(current_selected, cached_status))
        layout["logs"].update(create_logs_panel())
        return layout
    
    try:
        console.print("[dim]Use ↑↓ to navigate, Enter to select, ESC/q to exit[/dim]")
        time.sleep(0.05)
        
        with Live(make_layout(), refresh_per_second=60, screen=False) as live:
            while running:
                # Update status cache periodically (non-blocking)
                update_status_cache()
                
                # Update layout immediately
                layout = make_layout()
                live.update(layout)
                
                # Check for input actions (Enter, Exit)
                try:
                    choice = input_queue.get(timeout=0.01)
                    if choice == "enter":
                        with selected_lock:
                            current_selected = selected
                        # Use cached status for fast response - update in background
                        cached_status = get_cached_status()
                        if current_selected == 0:  # All
                            if all(cached_status.values()):
                                stop_all()
                            else:
                                start_all()
                        elif current_selected == 1:  # BE
                            if cached_status["backend"]:
                                stop_backend()
                            else:
                                start_backend()
                        elif current_selected == 2:  # FE
                            if cached_status["frontend"]:
                                stop_frontend()
                            else:
                                start_frontend()
                        elif current_selected == 3:  # Infra
                            if cached_status["infra"]:
                                stop_infrastructure()
                            else:
                                start_infrastructure()
                        elif current_selected == 4:  # Exit
                            running = False
                            break
                        # Update cache in background after action
                        def update_cache_async():
                            time.sleep(0.5)  # Wait a bit for service to start/stop
                            new_status = get_status()
                            with status_lock:
                                status_cache.update(new_status)
                        threading.Thread(target=update_cache_async, daemon=True).start()
                    elif choice == "exit":
                        running = False
                        break
                except queue.Empty:
                    pass
    except KeyboardInterrupt:
        pass
    finally:
        running = False
        stop_all()
        stop_log_monitoring()


def main():
    """Main CLI entry point."""
    if len(sys.argv) < 2:
        interactive_menu()
        return
    
    command = sys.argv[1].lower()
    status = get_status()
    
    if command in ["backend", "be"]:
        if status["backend"]:
            stop_backend()
        else:
            start_backend(foreground=True)
    elif command in ["frontend", "fe"]:
        if status["frontend"]:
            stop_frontend()
        else:
            start_frontend(foreground=True)
    elif command == "infra":
        if status["infra"]:
            stop_infrastructure()
        else:
            start_infrastructure()
    elif command == "all":
        if all(status.values()):
            stop_all()
        else:
            start_all()
    elif command == "status":
        status = get_status()
        def status_icon(running: bool) -> str:
            return "[green]●[/green]" if running else "[red]○[/red]"
        console.print(f"[bold]Backend[/bold]      {status_icon(status['backend'])}  http://localhost:{BACKEND_PORT}")
        console.print(f"[bold]Frontend[/bold]     {status_icon(status['frontend'])}  http://localhost:{FRONTEND_PORT}")
        for service in DOCKER_SERVICES:
            running = check_docker_service(service)
            console.print(f"[bold]{service.capitalize():<10}[/bold]  {status_icon(running)}")
    else:
        console.print(f"[red]Unknown command: {command}[/red]")
        console.print("Commands: backend|be, frontend|fe, infra, all, status")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        stop_all()
        stop_log_monitoring()
        sys.exit(0)
