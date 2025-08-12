"""
Verbesserter WhatsApp Bot mit robuster Fehlerbehandlung
"""

import asyncio
import time
import threading
import json
import os
from typing import Optional, Callable, Dict, Any, List
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

from seleniumwire import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service

from agent.utils.log import get_logger
from agent.core import Core

logger = get_logger(__name__)

class BotStatus(Enum):
    """Status des WhatsApp Bots"""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ERROR = "error"
    MONITORING = "monitoring"

@dataclass
class MessageData:
    """Datenstruktur für Nachrichten"""
    sender: str
    message: str
    timestamp: datetime
    message_type: str = "text"
    chat_id: Optional[str] = None

class ImprovedWhatsAppBot:
    """
    Verbesserter WhatsApp Bot mit robuster Fehlerbehandlung
    """
    
    def __init__(self, agent_core: Optional[Core] = None, config: Optional[Dict] = None):
        self.agent_core = agent_core or Core()
        self.config = config or {}
        self.driver = None
        self.status = BotStatus.DISCONNECTED
        self.message_handler: Optional[Callable] = None
        self.running = False
        self.last_message_time = None
        self.contacts = {}
        self.error_count = 0
        self.max_retries = self.config.get('max_retries', 3)
        self.retry_delay = self.config.get('retry_delay', 5)
        
    async def initialize(self) -> bool:
        """Initialisiert den WhatsApp Bot mit Fehlerbehandlung"""
        try:
            logger.info("Initializing Improved WhatsApp Bot...")
            self.status = BotStatus.CONNECTING
            
            # Browser Setup
            options = webdriver.ChromeOptions()
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            options.add_argument("--disable-gpu")
            options.add_argument("--window-size=1920,1080")
            options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            
            # Headless Mode (optional)
            if self.config.get('headless', False):
                options.add_argument("--headless")
            
            # Selenium Wire Options
            seleniumwire_options = {
                'verify_ssl': False,
                'suppress_connection_errors': False
            }
            
            # Automatische ChromeDriver Installation
            try:
                service = Service(ChromeDriverManager().install())
                self.driver = webdriver.Chrome(
                    service=service,
                    options=options,
                    seleniumwire_options=seleniumwire_options
                )
            except Exception as e:
                logger.warning(f"ChromeDriverManager failed: {e}")
                # Fallback: Direkte ChromeDriver Verwendung
                self.driver = webdriver.Chrome(
                    options=options,
                    seleniumwire_options=seleniumwire_options
                )
            
            # Öffne WhatsApp Web
            self.driver.get("https://web.whatsapp.com")
            
            logger.info("WhatsApp Web opened, waiting for QR code scan...")
            
            # Warte auf QR Code Scan
            await self._wait_for_login()
            
            self.status = BotStatus.CONNECTED
            self.error_count = 0
            logger.info("WhatsApp Bot successfully connected!")
            
            return True
            
        except Exception as e:
            self.status = BotStatus.ERROR
            self.error_count += 1
            logger.error(f"Failed to initialize WhatsApp Bot: {e}")
            
            if self.error_count < self.max_retries:
                logger.info(f"Retrying in {self.retry_delay} seconds... (Attempt {self.error_count}/{self.max_retries})")
                await asyncio.sleep(self.retry_delay)
                return await self.initialize()
            
            return False
    
    async def _wait_for_login(self, timeout: int = 300):
        """Wartet auf das Scannen des QR Codes mit verbesserter Fehlerbehandlung"""
        try:
            # Warte auf das Verschwinden des QR Codes und das Erscheinen der Chat-Liste
            WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="chat-list"]'))
            )
            logger.info("QR Code scanned successfully!")
            
            # Warte kurz für vollständiges Laden
            await asyncio.sleep(3)
            
        except TimeoutException:
            logger.error("Timeout waiting for QR code scan")
            raise
        except Exception as e:
            logger.error(f"Error during login: {e}")
            raise
    
    def set_message_handler(self, handler: Callable):
        """Setzt den Message Handler für eingehende Nachrichten"""
        self.message_handler = handler
    
    async def send_message(self, phone_number: str, message: str) -> bool:
        """
        Sendet eine Nachricht an eine Telefonnummer mit Fehlerbehandlung
        
        Args:
            phone_number: Telefonnummer im Format +49123456789
            message: Zu sendende Nachricht
            
        Returns:
            bool: True wenn erfolgreich gesendet
        """
        try:
            if self.status != BotStatus.CONNECTED:
                logger.error("WhatsApp not connected")
                return False
            
            # Formatiere Telefonnummer
            if not phone_number.startswith('+'):
                phone_number = '+' + phone_number
            
            # Öffne Chat mit der Nummer
            chat_url = f"https://web.whatsapp.com/send?phone={phone_number.replace('+', '')}"
            self.driver.get(chat_url)
            
            # Warte auf Chat-Loading
            await asyncio.sleep(3)
            
            # Warte auf Input-Feld
            input_field = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="conversation-compose-box-input"]'))
            )
            
            # Tippe Nachricht
            input_field.clear()
            input_field.send_keys(message)
            
            # Sende Nachricht
            send_button = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="send"]')
            send_button.click()
            
            logger.info(f"Message sent to {phone_number}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send message to {phone_number}: {e}")
            return False
    
    async def send_message_to_contact(self, contact_name: str, message: str) -> bool:
        """
        Sendet eine Nachricht an einen Kontakt über Namen
        
        Args:
            contact_name: Name des Kontakts
            message: Zu sendende Nachricht
            
        Returns:
            bool: True wenn erfolgreich gesendet
        """
        try:
            if self.status != BotStatus.CONNECTED:
                logger.error("WhatsApp not connected")
                return False
            
            # Suche nach Kontakt
            search_box = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="chat-list-search"]'))
            )
            
            search_box.clear()
            search_box.send_keys(contact_name)
            await asyncio.sleep(2)
            
            # Klicke auf den ersten gefundenen Kontakt
            contact_element = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="cell-0-0"]'))
            )
            contact_element.click()
            
            # Warte auf Chat-Loading
            await asyncio.sleep(2)
            
            # Finde Input-Feld und sende Nachricht
            input_field = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="conversation-compose-box-input"]'))
            )
            
            input_field.clear()
            input_field.send_keys(message)
            
            # Sende Nachricht
            send_button = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="send"]')
            send_button.click()
            
            logger.info(f"Message sent to contact: {contact_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send message to contact {contact_name}: {e}")
            return False
    
    async def _monitor_messages(self):
        """Überwacht eingehende Nachrichten mit verbesserter Fehlerbehandlung"""
        consecutive_errors = 0
        max_consecutive_errors = 5
        
        while self.running:
            try:
                if self.status != BotStatus.CONNECTED:
                    await asyncio.sleep(5)
                    continue
                
                # Suche nach neuen Nachrichten
                messages = self._get_unread_messages()
                
                for message in messages:
                    if self.message_handler:
                        await self.message_handler(message)
                
                consecutive_errors = 0  # Reset error counter on success
                await asyncio.sleep(3)  # Pause zwischen Checks
                
            except Exception as e:
                consecutive_errors += 1
                logger.error(f"Error in message monitoring (attempt {consecutive_errors}): {e}")
                
                if consecutive_errors >= max_consecutive_errors:
                    logger.error("Too many consecutive errors, stopping monitoring")
                    self.status = BotStatus.ERROR
                    break
                
                await asyncio.sleep(5)
    
    def _get_unread_messages(self) -> List[MessageData]:
        """Holt ungelesene Nachrichten mit verbesserter Fehlerbehandlung"""
        messages = []
        
        try:
            # Suche nach ungelesenen Chats
            unread_chats = self.driver.find_elements(
                By.CSS_SELECTOR, 
                '[data-testid="icon-unread-count"]'
            )
            
            for chat in unread_chats:
                try:
                    # Klicke auf ungelesenen Chat
                    chat.click()
                    time.sleep(1)
                    
                    # Hole Sender-Name
                    sender_element = self.driver.find_element(
                        By.CSS_SELECTOR,
                        '[data-testid="conversation-title"]'
                    )
                    sender = sender_element.text
                    
                    # Hole letzte Nachricht
                    message_elements = self.driver.find_elements(
                        By.CSS_SELECTOR,
                        '[data-testid="msg-meta"]'
                    )
                    
                    if message_elements:
                        latest_message = message_elements[-1]
                        message_text = latest_message.text
                        
                        message_data = MessageData(
                            sender=sender,
                            message=message_text,
                            timestamp=datetime.now(),
                            message_type="text"
                        )
                        
                        messages.append(message_data)
                        
                        # Markiere als gelesen
                        self._mark_as_read()
                        
                except Exception as e:
                    logger.error(f"Error processing unread chat: {e}")
                    continue
                    
        except Exception as e:
            logger.error(f"Error getting unread messages: {e}")
        
        return messages
    
    def _mark_as_read(self):
        """Markiert Nachrichten als gelesen"""
        try:
            # Doppelklick auf die Nachricht
            message_elements = self.driver.find_elements(
                By.CSS_SELECTOR,
                '[data-testid="msg-meta"]'
            )
            
            if message_elements:
                message_elements[-1].click()
                
        except Exception as e:
            logger.error(f"Error marking message as read: {e}")
    
    async def start_monitoring(self) -> bool:
        """Startet die Nachrichtenüberwachung"""
        if self.status != BotStatus.CONNECTED:
            logger.error("Cannot start monitoring - not connected")
            return False
        
        self.running = True
        self.status = BotStatus.MONITORING
        logger.info("Starting message monitoring...")
        
        # Starte Monitoring in separatem Thread
        monitoring_thread = threading.Thread(
            target=lambda: asyncio.run(self._monitor_messages())
        )
        monitoring_thread.daemon = True
        monitoring_thread.start()
        
        return True
    
    async def stop_monitoring(self):
        """Stoppt die Nachrichtenüberwachung"""
        self.running = False
        if self.status == BotStatus.MONITORING:
            self.status = BotStatus.CONNECTED
        logger.info("Message monitoring stopped")
    
    async def process_incoming_message(self, message_data: MessageData):
        """
        Verarbeitet eingehende Nachrichten mit dem Agent
        
        Args:
            message_data: MessageData Objekt mit Nachrichtendaten
        """
        try:
            logger.info(f"Processing message from {message_data.sender}: {message_data.message}")
            
            # Verwende den Agent Core um die Nachricht zu verarbeiten
            if self.agent_core:
                response = await self.agent_core.ask(message_data.message)
                
                # Sende Antwort zurück
                await self.send_message_to_contact(message_data.sender, response)
                
            else:
                # Fallback Antwort
                fallback_response = f"Nachricht empfangen: {message_data.message}"
                await self.send_message_to_contact(message_data.sender, fallback_response)
                
        except Exception as e:
            logger.error(f"Error processing incoming message: {e}")
    
    async def reconnect(self) -> bool:
        """Versucht eine neue Verbindung herzustellen"""
        logger.info("Attempting to reconnect...")
        await self.close()
        return await self.initialize()
    
    async def close(self):
        """Schließt den WhatsApp Bot"""
        try:
            self.running = False
            self.status = BotStatus.DISCONNECTED
            
            if self.driver:
                self.driver.quit()
                self.driver = None
            
            logger.info("WhatsApp Bot closed")
            
        except Exception as e:
            logger.error(f"Error closing WhatsApp Bot: {e}")
    
    def get_status(self) -> Dict[str, Any]:
        """Gibt den aktuellen Status des Bots zurück"""
        return {
            'status': self.status.value,
            'running': self.running,
            'last_message_time': self.last_message_time,
            'error_count': self.error_count,
            'connected': self.status == BotStatus.CONNECTED
        }
    
    def is_healthy(self) -> bool:
        """Überprüft ob der Bot gesund ist"""
        return (
            self.status in [BotStatus.CONNECTED, BotStatus.MONITORING] and
            self.error_count < self.max_retries
        )
