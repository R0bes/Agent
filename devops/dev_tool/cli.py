#!/usr/bin/env python3
"""Agent Development Tool CLI."""

import sys
import os
import subprocess
import shutil
import socket
import time
import threading
import queue
import re
from pathlib import Path
from typing import Optional, Dict, List, Tuple
import psutil
import requests
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.prompt import Prompt, Confirm
from rich.live import Live
from rich.layout import Layout
from rich.text import Text

# Optional: color support for Windows terminals
try:
    import colorama
    colorama.just_fix_windows_console()
except ImportError:  # pragma: no cover
    colorama = None

# Optional: interactive prompt for arrow-key menu
try:
    import questionary
except ImportError:  # pragma: no cover
    questionary = None

console = Console()


def strip_ansi(text: str) -> str:
    """Strip ANSI escape codes from text for width calculation."""
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    return ansi_escape.sub('', text)


def remove_agent_containers():
    """Force-remove lingering agent-* containers to avoid name conflicts."""
    names = [f"agent-{service}" for service in DOCKER_SERVICES]
    for name in names:
        try:
            subprocess.run(
                ["docker", "rm", "-f", name],
                capture_output=True,
                text=True,
                timeout=5
            )
        except FileNotFoundError:
            console.print(f"[red]Docker not found. Please install Docker.[/red]")
            return False
        except Exception as e:
            console.print(f"[yellow]Warning: Failed to remove container {name}: {e}[/yellow]")
    return True


def colorize_log_line(line: str) -> str:
    """Colorize a backend log line based on log level indicator.
    
    Log format: "HH:MM:SS L message" where L is:
    - T (trace) -> dim
    - D (debug) -> dim
    - I (info) -> green
    - W (warn) -> yellow
    - E (error) -> red
    - F (fatal) -> red bold
    """
    # Strip any existing ANSI codes first
    line = strip_ansi(line)
    
    # Match pattern: "HH:MM:SS L rest"
    match = re.match(r'^(\d{2}:\d{2}:\d{2})\s+([TDIWEF])\s+(.*)$', line)
    if match:
        time_part = match.group(1)
        level = match.group(2)
        message = match.group(3)
        
        # Color mapping for Rich markup
        level_colors = {
            'T': 'dim',      # trace
            'D': 'dim',      # debug
            'I': 'green',    # info
            'W': 'yellow',   # warn
            'E': 'red',      # error
            'F': 'red bold', # fatal
        }
        
        color = level_colors.get(level, '')
        if color:
            return f"[dim]{time_part}[/dim] [{color}]{message}[/{color.split()[0]}]"
        return line
    
    # If no match, return as-is
    return line


# Project paths (go up from devops/dev_tool to project root)
ROOT_DIR = Path(__file__).parent.parent.parent.resolve()
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
DOCKER_COMPOSE_FILE = ROOT_DIR / "devops" / "docker-compose.yml"

# Service ports
BACKEND_PORT = 3001
FRONTEND_PORT = 5173

# Docker services
DOCKER_SERVICES = ["postgres", "redis", "qdrant", "nats"]


def get_npm_command() -> List[str]:
    """Get the correct npm command for the current platform."""
    if sys.platform == "win32":
        # On Windows, try npm.cmd first, fallback to npm
        if shutil.which("npm.cmd"):
            return ["npm.cmd"]
        elif shutil.which("npm"):
            return ["npm"]
        else:
            # Fallback: use npm directly (will use shell=True)
            return ["npm"]
    return ["npm"]


def run_npm_command(args: List[str], cwd: Path, **kwargs) -> subprocess.Popen:
    """Run npm command with proper Windows handling."""
    npm_cmd = get_npm_command()
    cmd = npm_cmd + args
    
    # On Windows, if npm is not found, use shell=True
    if sys.platform == "win32":
        npm_path = shutil.which(npm_cmd[0])
        if not npm_path:
            # Use shell=True as fallback
            shell_kwargs = kwargs.copy()
            shell_kwargs['shell'] = True
            return subprocess.Popen(
                " ".join(cmd),
                cwd=cwd,
                **shell_kwargs
            )
    
    return subprocess.Popen(cmd, cwd=cwd, **kwargs)


def check_port(host: str, port: int, timeout: float = 0.5) -> bool:
    """Check if a port is open."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except Exception:
        return False


def check_http_service(url: str, timeout: float = 1.0) -> Tuple[bool, Optional[str]]:
    """Check if an HTTP service is responding."""
    try:
        response = requests.get(url, timeout=timeout)
        return True, f"HTTP {response.status_code}"
    except requests.exceptions.ConnectionError:
        return False, "Connection refused"
    except requests.exceptions.Timeout:
        return False, "Timeout"
    except Exception as e:
        return False, str(e)


def check_docker_service(service_name: str) -> Tuple[bool, Optional[str]]:
    """Check if a Docker service is running."""
    try:
        result = subprocess.run(
            ["docker", "ps", "--filter", f"name={service_name}", "--format", "{{.Status}}"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            status = result.stdout.strip()
            return True, status
        return False, "Not running"
    except FileNotFoundError:
        return False, "Docker not found"
    except Exception as e:
        return False, str(e)


def get_backend_status() -> Dict[str, any]:
    """Get backend service status."""
    port_open = check_port("localhost", BACKEND_PORT)
    # Always try HTTP check, as port check can be unreliable on Windows
    http_ok, http_msg = check_http_service(f"http://localhost:{BACKEND_PORT}/health")
    http_status = http_msg if http_ok else None
    # If HTTP check succeeds, consider port open even if socket check failed
    if http_ok and not port_open:
        port_open = True
    
    # Check for running process
    process_running = False
    process_info = None
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            cmdline = proc.info.get('cmdline', [])
            if cmdline and any('tsx' in str(cmd).lower() or 'server.ts' in str(cmd) for cmd in cmdline):
                if any('backend' in str(cmd).lower() or 'server.ts' in str(cmd) for cmd in cmdline):
                    process_running = True
                    process_info = f"PID {proc.info['pid']}"
                    break
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    
    return {
        "running": port_open and http_status is not None,
        "port_open": port_open,
        "http_status": http_status,
        "process_running": process_running,
        "process_info": process_info,
        "url": f"http://localhost:{BACKEND_PORT}"
    }


def get_frontend_status() -> Dict[str, any]:
    """Get frontend service status."""
    port_open = check_port("localhost", FRONTEND_PORT)
    # Always try HTTP check, as port check can be unreliable on Windows
    http_ok, http_msg = check_http_service(f"http://localhost:{FRONTEND_PORT}", timeout=2.0)
    http_status = http_msg if http_ok else None
    # If HTTP check succeeds, consider port open even if socket check failed
    if http_ok and not port_open:
        port_open = True
    
    # Check for running process
    process_running = False
    process_info = None
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            cmdline = proc.info.get('cmdline', [])
            if cmdline and any('vite' in str(cmd).lower() for cmd in cmdline):
                if any('frontend' in str(cmd).lower() or str(FRONTEND_DIR) in str(cmd) for cmd in cmdline):
                    process_running = True
                    process_info = f"PID {proc.info['pid']}"
                    break
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    
    return {
        "running": port_open and http_status is not None,
        "port_open": port_open,
        "http_status": http_status,
        "process_running": process_running,
        "process_info": process_info,
        "url": f"http://localhost:{FRONTEND_PORT}"
    }


def get_infrastructure_status() -> Dict[str, Dict[str, any]]:
    """Get infrastructure services status."""
    status = {}
    for service in DOCKER_SERVICES:
        running, info = check_docker_service(f"agent-{service}")
        status[service] = {
            "running": running,
            "status": info
        }
    return status


def get_status_lines() -> List[str]:
    """Get status lines for all services (one line per service)."""
    lines = []
    
    # Backend status - simplified
    backend = get_backend_status()
    backend_status = "[green]● Running[/green]" if backend["running"] else "[red]● Stopped[/red]"
    lines.append(f"[bold]Backend[/bold]      {backend_status}  {backend['url']}")
    
    # Frontend status - simplified
    frontend = get_frontend_status()
    frontend_status = "[green]● Running[/green]" if frontend["running"] else "[red]● Stopped[/red]"
    lines.append(f"[bold]Frontend[/bold]     {frontend_status}  {frontend['url']}")
    
    # Infrastructure status - one line per service, unified format
    infra = get_infrastructure_status()
    for service, status_info in infra.items():
        status_icon = "[green]●[/green]" if status_info["running"] else "[red]●[/red]"
        # Extract just the status text (e.g., "Up 9 hours" -> "Up 9 hours")
        status_text = status_info['status']
        lines.append(f"[bold]{service.capitalize():<10}[/bold]  {status_icon}  {status_text}")
    
    return lines


def display_status():
    """Display current status of all services."""
    status_lines = get_status_lines()
    for line in status_lines:
        console.print(line)


def install_dependencies():
    """Install npm dependencies."""
    console.print("[yellow]Installing dependencies...[/yellow]")
    try:
        # Install root dependencies
        npm_cmd = get_npm_command()
        cmd = npm_cmd + ["install"]
        
        # On Windows, use shell=True if npm is not found in PATH
        use_shell = False
        if sys.platform == "win32":
            npm_path = shutil.which(npm_cmd[0])
            if not npm_path:
                use_shell = True
                cmd = " ".join(cmd)
        
        cmd_str = " ".join(cmd) if isinstance(cmd, list) else cmd
        console.print(f"[dim]Running: {cmd_str} in {ROOT_DIR}[/dim]")
        result = subprocess.run(
            cmd,
            cwd=ROOT_DIR,
            capture_output=True,
            text=True,
            shell=use_shell
        )
        if result.returncode != 0:
            console.print(f"[red]Failed to install root dependencies: {result.stderr}[/red]")
            return False
        
        console.print("[green]Dependencies installed successfully[/green]")
        if result.stdout:
            # Show last few lines of output
            output_lines = result.stdout.strip().split('\n')
            if len(output_lines) > 5:
                console.print(f"[dim]... ({len(output_lines) - 5} more lines)[/dim]")
                for line in output_lines[-5:]:
                    console.print(f"[dim]{line}[/dim]")
            else:
                for line in output_lines:
                    console.print(f"[dim]{line}[/dim]")
        return True
    except Exception as e:
        console.print(f"[red]Failed to install dependencies: {e}[/red]")
        return False


def start_backend(show_output: bool = False):
    """Start backend service."""
    console.print("[yellow]Starting backend...[/yellow]")
    try:
        if show_output:
            # Start with output visible
            process = run_npm_command(
                ["run", "dev"],
                cwd=BACKEND_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
            )
            
            # Read output in a separate thread
            def read_output():
                for line in iter(process.stdout.readline, ''):
                    if line:
                        console.print(f"[blue][Backend][/blue] {colorize_log_line(line.rstrip())}")
            
            thread = threading.Thread(target=read_output, daemon=True)
            thread.start()
            
            console.print("[green]Backend started (showing output, press Ctrl+C to stop)[/green]")
            console.print("[dim]Press Ctrl+C to stop backend[/dim]\n")
            
            try:
                process.wait()
            except KeyboardInterrupt:
                console.print("\n[yellow]Stopping backend...[/yellow]")
                process.terminate()
                time.sleep(1)
                if process.poll() is None:
                    process.kill()
                console.print("[green]Backend stopped[/green]")
        else:
            # Start in background
            console.print(f"[dim]Running: npm run dev in {BACKEND_DIR}[/dim]")
            process = run_npm_command(
                ["run", "dev"],
                cwd=BACKEND_DIR,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
            )
            console.print("[green]Backend started[/green]")
    except Exception as e:
        console.print(f"[red]Failed to start backend: {e}[/red]")


def stop_backend():
    """Stop backend service."""
    console.print("[yellow]Stopping backend...[/yellow]")
    stopped = False
    try:
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                cmdline = proc.info.get('cmdline', [])
                if cmdline and any('tsx' in str(cmd).lower() or 'server.ts' in str(cmd) for cmd in cmdline):
                    if any('backend' in str(cmd).lower() or 'server.ts' in str(cmd) for cmd in cmdline):
                        pid = proc.info['pid']
                        console.print(f"[dim]Terminating backend process (PID {pid})...[/dim]")
                        proc.terminate()
                        time.sleep(1)
                        if proc.is_running():
                            console.print(f"[dim]Force killing backend process (PID {pid})...[/dim]")
                            proc.kill()
                        console.print(f"[green]Stopped backend process (PID {pid})[/green]")
                        stopped = True
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        if not stopped:
            console.print("[yellow]No backend process found to stop[/yellow]")
    except Exception as e:
        console.print(f"[red]Failed to stop backend: {e}[/red]")


def start_frontend(show_output: bool = False):
    """Start frontend service."""
    console.print("[yellow]Starting frontend...[/yellow]")
    try:
        if show_output:
            # Start with output visible
            process = run_npm_command(
                ["run", "dev"],
                cwd=FRONTEND_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
            )
            
            # Read output in a separate thread
            def read_output():
                for line in iter(process.stdout.readline, ''):
                    if line:
                        parsed = Text.from_ansi(line.rstrip())
                        console.print(f"[magenta][Frontend][/magenta] ", parsed)
            
            thread = threading.Thread(target=read_output, daemon=True)
            thread.start()
            
            console.print("[green]Frontend started (showing output, press Ctrl+C to stop)[/green]")
            console.print("[dim]Press Ctrl+C to stop frontend[/dim]\n")
            
            try:
                process.wait()
            except KeyboardInterrupt:
                console.print("\n[yellow]Stopping frontend...[/yellow]")
                process.terminate()
                time.sleep(1)
                if process.poll() is None:
                    process.kill()
                console.print("[green]Frontend stopped[/green]")
        else:
            # Start in background
            console.print(f"[dim]Running: npm run dev in {FRONTEND_DIR}[/dim]")
            process = run_npm_command(
                ["run", "dev"],
                cwd=FRONTEND_DIR,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
            )
            console.print("[green]Frontend started[/green]")
    except Exception as e:
        console.print(f"[red]Failed to start frontend: {e}[/red]")


def stop_frontend():
    """Stop frontend service."""
    console.print("[yellow]Stopping frontend...[/yellow]")
    stopped = False
    try:
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                cmdline = proc.info.get('cmdline', [])
                # Identify vite dev server by command line (Windows-safe)
                if cmdline and any('vite' in str(cmd).lower() for cmd in cmdline):
                    pid = proc.info['pid']
                    console.print(f"[dim]Terminating frontend process (PID {pid})...[/dim]")
                    proc.terminate()
                    time.sleep(1)
                    if proc.is_running():
                        console.print(f"[dim]Force killing frontend process (PID {pid})...[/dim]")
                        proc.kill()
                    console.print(f"[green]Stopped frontend process (PID {pid})[/green]")
                    stopped = True
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        if not stopped:
            console.print("[yellow]No frontend process found to stop[/yellow]")
    except Exception as e:
        console.print(f"[red]Failed to stop frontend: {e}[/red]")


def start_backend_frontend():
    """Start both backend and frontend services."""
    console.print("[yellow]Starting backend and frontend...[/yellow]")
    try:
        # Start backend
        console.print(f"[dim]Starting backend: npm run dev in {BACKEND_DIR}[/dim]")
        run_npm_command(
            ["run", "dev"],
            cwd=BACKEND_DIR,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
        )
        console.print("[green]Backend started[/green]")
        
        # Start frontend
        console.print(f"[dim]Starting frontend: npm run dev in {FRONTEND_DIR}[/dim]")
        run_npm_command(
            ["run", "dev"],
            cwd=FRONTEND_DIR,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
        )
        console.print("[green]Frontend started[/green]")
        
        console.print("[green]Backend and frontend started[/green]")
    except Exception as e:
        console.print(f"[red]Failed to start backend and frontend: {e}[/red]")


def stop_backend_frontend():
    """Stop both backend and frontend services."""
    console.print("[yellow]Stopping backend and frontend...[/yellow]")
    console.print("[dim]Stopping backend...[/dim]")
    stop_backend()
    console.print("[dim]Stopping frontend...[/dim]")
    stop_frontend()
    console.print("[green]Backend and frontend stopped[/green]")


def start_infrastructure():
    """Start infrastructure services."""
    console.print("[yellow]Starting infrastructure services...[/yellow]")
    try:
        # Clean up lingering containers to avoid name conflicts
        remove_agent_containers()

        services_str = ", ".join(DOCKER_SERVICES)
        console.print(f"[dim]Running: docker compose up -d {services_str}[/dim]")
        result = subprocess.run(
            ["docker", "compose", "-f", str(DOCKER_COMPOSE_FILE), "up", "-d"] + DOCKER_SERVICES,
            cwd=ROOT_DIR,
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            console.print("[green]Infrastructure services started[/green]")
            if result.stdout:
                console.print(f"[dim]{result.stdout.strip()}[/dim]")
        else:
            console.print(f"[red]Failed to start infrastructure: {result.stderr}[/red]")
    except FileNotFoundError:
        console.print("[red]Docker not found. Please install Docker.[/red]")
    except Exception as e:
        console.print(f"[red]Failed to start infrastructure: {e}[/red]")


def stop_infrastructure():
    """Stop infrastructure services."""
    console.print("[yellow]Stopping infrastructure services...[/yellow]")
    try:
        console.print(f"[dim]Running: docker compose down[/dim]")
        result = subprocess.run(
            ["docker", "compose", "-f", str(DOCKER_COMPOSE_FILE), "down"],
            cwd=ROOT_DIR,
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            console.print("[green]Infrastructure services stopped[/green]")
            if result.stdout:
                console.print(f"[dim]{result.stdout.strip()}[/dim]")
        else:
            console.print(f"[red]Failed to stop infrastructure: {result.stderr}[/red]")
    except FileNotFoundError:
        console.print("[red]Docker not found. Please install Docker.[/red]")
    except Exception as e:
        console.print(f"[red]Failed to stop infrastructure: {e}[/red]")

    # Ensure lingering containers are removed
    remove_agent_containers()
    time.sleep(1)


def format_status_inline(backend: Dict[str, any], frontend: Dict[str, any], infra_running: bool) -> str:
    """Return a compact one-line status."""
    def dot(on: bool) -> str:
        return "●" if on else "○"
    return f"Status: Backend {dot(backend['running'])} | Frontend {dot(frontend['running'])} | Infra {dot(infra_running)}"


def colored_dot(state: str) -> str:
    """
    Return a dot without ANSI (works in questionary):
    - running  -> ●
    - stopped  -> ○
    - partial  -> ◐
    - unknown  ->  (space)
    """
    if state == "running":
        return "●"
    if state == "stopped":
        return "○"
    if state == "partial":
        return "◐"
    return " "


def interactive_menu():
    """Interactive arrow-key menu (requires questionary)."""
    if questionary is None:
        console.print("[red]questionary is not installed. Install with: pip install questionary[/red]")
        sys.exit(1)

    # Fetch current status
    backend = get_backend_status()
    frontend = get_frontend_status()
    infra = get_infrastructure_status()
    infra_running = all(status_info["running"] for status_info in infra.values())
    all_running = backend["running"] and frontend["running"] and infra_running

    def label_text(name: str, state: str, running: bool):
        # Return prompt_toolkit formatted text tuples to color without showing markup
        start = "Stop" if running else "Start"
        text = f"{start} {name}"
        if state == "running":
            return [("fg:ansigreen", text)]
        if state == "partial":
            return [("fg:ansiyellow", text)]
        if state == "stopped":
            return [("fg:ansired", text)]
        return [("", text)]

    choices = [
        questionary.Choice(title=label_text("All", "running" if all_running else ("partial" if (backend["running"] or frontend["running"] or any(status_info["running"] for status_info in infra.values())) else "stopped"), all_running), value="all"),
        questionary.Choice(title=label_text("Backend", "running" if backend["running"] else "stopped", backend["running"]), value="backend"),
        questionary.Choice(title=label_text("Frontend", "running" if frontend["running"] else "stopped", frontend["running"]), value="frontend"),
        questionary.Choice(title=label_text("Infrastructure", "running" if infra_running else ("partial" if any(status_info["running"] for status_info in infra.values()) else "stopped"), infra_running), value="infra"),
        questionary.Choice(title="Exit", value="exit"),
    ]

    while True:
        answer = questionary.select(
            "Action:",
            choices=choices,
            qmark="",
            pointer="➜",
            use_indicator=True,
            instruction="",
        ).ask()

        if answer is None:
            break

        # Re-evaluate status before applying action
        backend = get_backend_status()
        frontend = get_frontend_status()
        infra = get_infrastructure_status()
        infra_running = all(status_info["running"] for status_info in infra.values())
        infra_any = any(status_info["running"] for status_info in infra.values())
        all_running = backend["running"] and frontend["running"] and infra_running

        if answer == "backend":
            if backend["running"]:
                stop_backend()
            else:
                start_backend()
        elif answer == "frontend":
            if frontend["running"]:
                stop_frontend()
            else:
                start_frontend()
        elif answer == "infra":
            if infra_running:
                stop_infrastructure()
            else:
                start_infrastructure()
        elif answer == "all":
            if all_running:
                stop_all()
            else:
                start_all()
        elif answer == "exit":
            break

        # Loop back with updated status


def stop_all():
    """Stop all services."""
    console.print("[yellow]Stopping all services...[/yellow]")
    stop_backend()
    stop_frontend()
    stop_infrastructure()
    console.print("[green]All services stopped[/green]")


def start_all():
    """Start all services (infrastructure, backend, frontend) with output."""
    console.print("[yellow]Starting all services...[/yellow]")
    
    # Start infrastructure first
    start_infrastructure()
    time.sleep(3)
    
    # Start backend and frontend with output
    console.print("\n[yellow]Starting backend and frontend...[/yellow]")
    console.print("[dim]Press Ctrl+C to stop all services[/dim]\n")
    
    backend_proc = run_npm_command(
        ["run", "dev"],
        cwd=BACKEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
    )
    
    frontend_proc = run_npm_command(
        ["run", "dev"],
        cwd=FRONTEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
    )
    
    def read_backend():
        for line in iter(backend_proc.stdout.readline, ''):
            if line:
                console.print(f"[blue][Backend][/blue] {colorize_log_line(line.rstrip())}")
    
    def read_frontend():
        for line in iter(frontend_proc.stdout.readline, ''):
            if line:
                parsed = Text.from_ansi(line.rstrip())
                console.print(f"[magenta][Frontend][/magenta] ", parsed)
    
    backend_thread = threading.Thread(target=read_backend, daemon=True)
    frontend_thread = threading.Thread(target=read_frontend, daemon=True)
    backend_thread.start()
    frontend_thread.start()
    
    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        console.print("\n[yellow]Stopping all services...[/yellow]")
        backend_proc.terminate()
        frontend_proc.terminate()
        time.sleep(1)
        if backend_proc.poll() is None:
            backend_proc.kill()
        if frontend_proc.poll() is None:
            frontend_proc.kill()
        stop_infrastructure()
        console.print("[green]All services stopped[/green]")


def control_menu():
    """Interactive control menu."""
    while True:
        # Gather statuses for dynamic toggle labels
        backend = get_backend_status()
        frontend = get_frontend_status()
        infra = get_infrastructure_status()
        infra_running = all(status_info["running"] for status_info in infra.values())
        all_running = backend["running"] and frontend["running"] and infra_running

        # Get status lines
        status_lines = get_status_lines()

        # Dynamic labels (single toggle per service)
        backend_label = "Stop Backend" if backend["running"] else "Start Backend"
        frontend_label = "Stop Frontend" if frontend["running"] else "Start Frontend"
        infra_label = "Stop Infrastructure" if infra_running else "Start Infrastructure"
        all_label = "Stop All" if all_running else "Start All"
        # Create menu text (compact, no extra blank line)
        menu_lines = [
            "[bold cyan]Control Menu[/bold cyan]",
            "1. Install Dependencies",
            f"2. {backend_label}",
            f"3. {frontend_label}",
            f"4. {infra_label}",
            f"5. {all_label} (with output)",
            "6. Refresh Status",
            "0. Exit"
        ]
        
        # Calculate column widths for manual formatting
        max_menu_width = max(len(strip_ansi(line)) for line in menu_lines) if menu_lines else 0
        padding_width = max_menu_width + 4
        
        # Print header row first (Control Menu and Services on same line)
        services_header = "[bold cyan]Services[/bold cyan]"
        menu_header = menu_lines[0]  # "Control Menu"
        menu_header_width = len(strip_ansi(menu_header))
        header_padding = " " * (padding_width - menu_header_width)
        console.print(f"{menu_header}{header_padding}{services_header}")
        
        # Print content lines side by side (menu left, status right)
        # Start from index 1 for menu (skip header) and 0 for status (start with first service)
        max_content_lines = max(len(status_lines), len(menu_lines) - 1)
        for i in range(max_content_lines):
            menu_line = menu_lines[i + 1] if (i + 1) < len(menu_lines) else ""
            status_line = status_lines[i] if i < len(status_lines) else ""
            
            # Pad menu line to align status (only if menu line exists)
            if menu_line:
                menu_width = len(strip_ansi(menu_line))
                padding = " " * (padding_width - menu_width)
                console.print(f"{menu_line}{padding}{status_line}")
            else:
                # If no menu line, just pad to align status
                console.print(f"{' ' * padding_width}{status_line}")
        
        # Add a blank line before prompt
        console.print()
        
        choice = Prompt.ask("[bold]Select option[/bold]", default="6")
        
        if choice == "1":
            install_dependencies()
        elif choice == "2":
            if backend["running"]:
                stop_backend()
            else:
                start_backend()
        elif choice == "3":
            if frontend["running"]:
                stop_frontend()
            else:
                start_frontend()
        elif choice == "4":
            if infra_running:
                stop_infrastructure()
            else:
                start_infrastructure()
        elif choice == "5":
            if all_running:
                stop_all()
            else:
                start_all()
        elif choice == "6":
            continue
        elif choice == "0":
            console.print("[yellow]Exiting...[/yellow]")
            break
        else:
            console.print("[red]Invalid option[/red]")
        
        time.sleep(1)


def main():
    """Main CLI entry point (no control menu, only top-level commands)."""
    # If no command: launch interactive menu (requires questionary)
    if len(sys.argv) < 2:
        if questionary is not None:
            interactive_menu()
            sys.exit(0)
        console.print("[red]Usage: agent <command>[/red]")
        console.print("Commands:")
        console.print("  backend | be    - Toggle backend (start/stop)")
        console.print("  frontend| fe    - Toggle frontend (start/stop)")
        console.print("  infra           - Toggle infrastructure (start/stop)")
        console.print("  all             - Toggle all services (start/stop with output)")
        console.print("")
        console.print("[yellow]Optional interactive menu requires: pip install questionary[/yellow]")
        sys.exit(1)
    
    command = sys.argv[1].lower()

    # Helper for toggles
    backend = get_backend_status()
    frontend = get_frontend_status()
    infra = get_infrastructure_status()
    infra_running = all(status_info["running"] for status_info in infra.values())
    all_running = backend["running"] and frontend["running"] and infra_running
    
    if command in ["backend", "be"]:
        if backend["running"]:
            stop_backend()
        else:
            start_backend()
    elif command in ["frontend", "fe"]:
        if frontend["running"]:
            stop_frontend()
        else:
            start_frontend()
    elif command == "infra":
        if infra_running:
            stop_infrastructure()
        else:
            start_infrastructure()
    elif command == "all":
        if all_running:
            stop_all()
        else:
            start_all()
    else:
        console.print(f"[red]Unknown command: {command}[/red]")
        console.print("Commands:")
        console.print("  backend | be    - Toggle backend (start/stop)")
        console.print("  frontend| fe    - Toggle frontend (start/stop)")
        console.print("  infra           - Toggle infrastructure (start/stop)")
        console.print("  all             - Toggle all services (start/stop with output)")
        console.print("[yellow]Optional interactive menu (no args) requires: pip install questionary[/yellow]")
        sys.exit(1)


if __name__ == "__main__":
    main()

