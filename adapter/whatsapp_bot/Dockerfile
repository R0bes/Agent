# WhatsApp Bot Dockerfile
FROM python:3.11-slim

# Installiere System-Abhängigkeiten für Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    curl \
    xvfb \
    # Chrome Abhängigkeiten
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libu2f-udev \
    libvulkan1 \
    && rm -rf /var/lib/apt/lists/*

# Installiere Google Chrome
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable && \
    rm -rf /var/lib/apt/lists/*

# Installiere ChromeDriver
RUN CHROMEDRIVER_VERSION=`curl -sS chromedriver.storage.googleapis.com/LATEST_RELEASE` && \
    wget -O /tmp/chromedriver.zip http://chromedriver.storage.googleapis.com/$CHROMEDRIVER_VERSION/chromedriver_linux64.zip && \
    unzip /tmp/chromedriver.zip chromedriver -d /usr/local/bin/ && \
    rm /tmp/chromedriver.zip && \
    chmod +x /usr/local/bin/chromedriver

# Setze Arbeitsverzeichnis
WORKDIR /app

# Kopiere Requirements
COPY requirements.txt .

# Installiere Python Abhängigkeiten
RUN pip install --no-cache-dir -r requirements.txt

# Kopiere Bot-Interface aus dem Template
COPY adapter/bot_template/bot_interface.py /app/

# Kopiere WhatsApp Bot
COPY adapter/whatsapp_bot/whatsapp_bot_interface.py /app/whatsapp_bot/

# Kopiere Konfiguration
COPY adapter/whatsapp_bot/config.toml /app/

# Erstelle Logs Verzeichnis
RUN mkdir -p /app/logs

# Umgebungsvariablen
ENV PYTHONPATH=/app
ENV DISPLAY=:99

# Expose Port für mögliche Web-UI
EXPOSE 8001

# Standard-Konfiguration
ENV WHATSAPP_HEADLESS=true
ENV WHATSAPP_MAX_RETRIES=3
ENV WHATSAPP_MONITORING_INTERVAL=3

# Startskript
COPY adapter/whatsapp_bot/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Benutzer für Sicherheit
RUN useradd -m -u 1000 whatsapp && \
    chown -R whatsapp:whatsapp /app

USER whatsapp

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["python", "-m", "whatsapp_bot.whatsapp_bot_interface"]


