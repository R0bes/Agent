# agent/utils/log.py
import logging
import sys
import os
import structlog
from logging.handlers import RotatingFileHandler

# Farb-Codes
COLORS = {
    "DEBUG": "\033[37m",    # Weiß
    "INFO": "\033[36m",     # Cyan
    "WARNING": "\033[33m",  # Gelb
    "ERROR": "\033[31m",    # Rot
    "CRITICAL": "\033[41m", # Rot mit Hintergrund
    "RESET": "\033[0m",
}

def _console_formatter(_, __, event_dict):
    """Format console logs with colors and short style"""
    level = str(event_dict.get("level", "")).upper()
    color = COLORS.get(level, "")
    reset = COLORS["RESET"]
    msg = event_dict.get("event", "")
    return f"{color}[{level:<8}]{reset} {msg}"

_DEF_LOG_DIR = os.path.join("logs")
_DEF_APP_LOG = os.path.join(_DEF_LOG_DIR, "app.log")
_DEF_ERR_LOG = os.path.join(_DEF_LOG_DIR, "error.log")

_initialized = False

def setup_logging(debug: bool = False, console: bool = False):
    """Configure structlog for file logging and optional console logging"""
    global _initialized
    if _initialized:
        return

    os.makedirs(_DEF_LOG_DIR, exist_ok=True)

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.setLevel(logging.DEBUG if debug else logging.INFO)

    # File handler for app logs
    app_handler = RotatingFileHandler(_DEF_APP_LOG, maxBytes=2_000_000, backupCount=3, encoding="utf-8")
    app_handler.setLevel(logging.DEBUG if debug else logging.INFO)
    app_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    root_logger.addHandler(app_handler)

    # File handler for error logs
    err_handler = RotatingFileHandler(_DEF_ERR_LOG, maxBytes=2_000_000, backupCount=3, encoding="utf-8")
    err_handler.setLevel(logging.WARNING)
    err_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    root_logger.addHandler(err_handler)

    # Optional console handler (keine technischen Logs standardmäßig)
    if console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(logging.Formatter("%(message)s"))
        root_logger.addHandler(console_handler)

    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.stdlib.add_log_level,
            _console_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.make_filtering_bound_logger(logging.DEBUG if debug else logging.INFO),
        cache_logger_on_first_use=True,
    )

    _initialized = True

def get_logger(name: str = None):
    return structlog.get_logger(name)

# Beim Import konfigurieren (nur Files, keine Konsole)
setup_logging(debug=False, console=False)
