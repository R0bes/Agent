"""
Hauptanwendung für das Chat-Backend.
Startet den Server und konfiguriert das Logging.
"""

import logging
import uvicorn
from config import get_settings

# Konfiguration laden
settings = get_settings()

# Logging konfigurieren
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()), format=settings.log_format
)

logger = logging.getLogger(__name__)

if __name__ == "__main__":
    logger.info("Starte Chat Backend Server...")

    try:
        uvicorn.run(
            "api:app",
            host=settings.host,
            port=settings.port,
            log_level=settings.log_level.lower(),
            reload=settings.reload,
        )
    except KeyboardInterrupt:
        logger.info("Server wird beendet...")
    except Exception as e:
        logger.error(f"Fehler beim Starten des Servers: {e}")
    finally:
        logger.info("Server beendet.")
