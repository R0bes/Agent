FROM python:3.11-slim

# Setze Arbeitsverzeichnis
WORKDIR /app

# Installiere System-Abhängigkeiten
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Kopiere Requirements und installiere Python-Abhängigkeiten
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Kopiere Bot-Interface aus dem Template
COPY adapter/bot_template/bot_interface.py /app/

# Kopiere Telegram Bot
COPY adapter/telegram_bot/telegram_bot_interface.py /app/telegram_bot/

# Kopiere Konfiguration
COPY adapter/telegram_bot/config.toml /app/

# Erstelle Logs-Verzeichnis
RUN mkdir -p /app/logs

# Setze Umgebungsvariablen
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Exponiere Port
EXPOSE 8002

# Starte den Bot
CMD ["python", "-m", "telegram_bot.telegram_bot_interface"]
