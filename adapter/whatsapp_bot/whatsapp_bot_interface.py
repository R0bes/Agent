"""
WhatsApp Bot Implementierung mit BotInterface
Implementiert das einheitliche Bot-Interface für WhatsApp
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

# Import des Bot-Interfaces
from adapter.bot_template.bot_interface import BotInterface, BotStatus, MessageType, MessageData

logger = get_logger(__name__)

class WhatsAppBotInterface(BotInterface):
    """
    WhatsApp Bot Implementierung mit BotInterface
    """
    
    def __init__(self, agent_core: Optional[Core] = None, config: Optional[Dict] = None):
        super().__init__(config)
        self.agent_core = agent_core or Core()
        self.driver = None
        self.contacts = {}
        self.monitoring_thread = None
        
        # WhatsApp-spezifische Konfiguration
        self.headless = self.config.get('headless', True)
        self.qr_timeout = self.config.get('qr_timeout', 300)
        self.chrome_options = self.config.get('chrome_options', {})
        
    async def initialize(self) -> bool:
        """Initialisiert den WhatsApp Bot"""
        try:
            logger.info("Initializing WhatsApp Bot Interface...")
            self.status = BotStatus.CONNECTING
            self.start_time = datetime.now()
            
            # Browser Setup
            options = webdriver.ChromeOptions()
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            options.add_argument("--disable-gpu")
            options.add_argument("--window-size=1920,1080")
            options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            
            # Headless Mode
            if self.headless:
                options.add_argument("--headless")
            
            # Zusätzliche Chrome-Optionen
            for option in self.chrome_options:
                options.add_argument(option)
            
            # Selenium Wire Options
            seleniumwire_options = {
                'verify_ssl': False,
                'suppress_connection_errors': False
            }
            
            # ChromeDriver Installation
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
            
            # WhatsApp Web öffnen
            self.driver.get("https://web.whatsapp.com")
            logger.info("WhatsApp Web opened, waiting for QR code scan...")
            
            # Warte auf QR Code Scan
            await self._wait_for_login()
            
            self.status = BotStatus.CONNECTED
            self.update_activity()
            logger.info("WhatsApp Bot Interface successfully connected!")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize WhatsApp Bot Interface: {e}")
            self.status = BotStatus.ERROR
            self.error_count += 1
            return False
    
    async def _wait_for_login(self, timeout: int = None):
        """Wartet auf das Scannen des QR Codes"""
        timeout = timeout or self.qr_timeout
        try:
            # Warte auf das Verschwinden des QR Codes
            WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((By.ID, "side"))
            )
            logger.info("QR Code scanned successfully!")
            
        except TimeoutException:
            logger.error("Timeout waiting for QR code scan")
            raise
    
    async def send_message(self, recipient: str, message: str, 
                          message_type: MessageType = MessageType.TEXT,
                          metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Sendet eine Nachricht an einen Empfänger
        
        Args:
            recipient: Telefonnummer, Kontaktname oder Chat-ID
            message: Zu sendende Nachricht
            message_type: Typ der Nachricht
            metadata: Zusätzliche Metadaten
            
        Returns:
            bool: True wenn erfolgreich gesendet
        """
        try:
            if not self.is_healthy():
                logger.error("Bot is not healthy, cannot send message")
                return False
            
            # Versuche zuerst als Telefonnummer zu senden
            if recipient.startswith('+') or recipient.isdigit():
                success = await self._send_to_phone(recipient, message)
            else:
                # Versuche als Kontaktname zu senden
                success = await self._send_to_contact(recipient, message)
            
            if success:
                self.update_activity()
                logger.info(f"Message sent successfully to {recipient}")
                return True
            else:
                logger.error(f"Failed to send message to {recipient}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending message to {recipient}: {e}")
            self.error_count += 1
            return False
    
    async def _send_to_phone(self, phone_number: str, message: str) -> bool:
        """Sendet eine Nachricht an eine Telefonnummer"""
        try:
            # Formatiere Telefonnummer
            if not phone_number.startswith('+'):
                phone_number = '+' + phone_number
            
            # Erstelle WhatsApp Web URL
            url = f"https://web.whatsapp.com/send?phone={phone_number.replace('+', '')}&text={message}"
            self.driver.get(url)
            
            # Warte auf Chat-Laden
            WebDriverWait(self.driver, 30).until(
                EC.presence_of_element_located((By.ID, "main"))
            )
            
            # Sende Nachricht
            send_button = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//span[@data-icon='send']"))
            )
            send_button.click()
            
            # Warte kurz für das Senden
            await asyncio.sleep(2)
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending to phone {phone_number}: {e}")
            return False
    
    async def _send_to_contact(self, contact_name: str, message: str) -> bool:
        """Sendet eine Nachricht an einen Kontaktnamen"""
        try:
            # Suche nach dem Kontakt
            search_box = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.XPATH, "//div[@contenteditable='true'][@data-tab='3']"))
            )
            
            # Lösche vorherigen Inhalt
            search_box.clear()
            search_box.send_keys(contact_name)
            
            # Warte auf Suchergebnisse
            await asyncio.sleep(2)
            
            # Klicke auf den ersten Kontakt
            contact = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//div[@data-testid='cell-0-0']"))
            )
            contact.click()
            
            # Warte auf Chat-Laden
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.ID, "main"))
            )
            
            # Finde Nachrichtenfeld und sende
            message_box = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.XPATH, "//div[@contenteditable='true'][@data-tab='6']"))
            )
            
            message_box.clear()
            message_box.send_keys(message)
            message_box.send_keys(Keys.ENTER)
            
            # Warte kurz für das Senden
            await asyncio.sleep(2)
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending to contact {contact_name}: {e}")
            return False
    
    async def start_monitoring(self) -> bool:
        """Startet das Monitoring für eingehende Nachrichten"""
        try:
            if self.monitoring_thread and self.monitoring_thread.is_alive():
                logger.warning("Monitoring already running")
                return True
            
            self.running = True
            self.monitoring_thread = threading.Thread(target=self._monitor_messages)
            self.monitoring_thread.daemon = True
            self.monitoring_thread.start()
            
            self.status = BotStatus.MONITORING
            self.update_activity()
            logger.info("WhatsApp message monitoring started")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to start monitoring: {e}")
            self.error_count += 1
            return False
    
    async def stop_monitoring(self):
        """Stoppt das Monitoring"""
        try:
            self.running = False
            if self.monitoring_thread and self.monitoring_thread.is_alive():
                self.monitoring_thread.join(timeout=5)
            
            self.status = BotStatus.CONNECTED
            logger.info("WhatsApp message monitoring stopped")
            
        except Exception as e:
            logger.error(f"Error stopping monitoring: {e}")
    
    def _monitor_messages(self):
        """Überwacht eingehende Nachrichten in einem separaten Thread"""
        while self.running:
            try:
                # Hole ungelesene Nachrichten
                unread_messages = self._get_unread_messages()
                
                for message_data in unread_messages:
                    # Verarbeite Nachricht asynchron
                    asyncio.create_task(self.process_incoming_message(message_data))
                
                # Markiere als gelesen
                if unread_messages:
                    self._mark_as_read()
                
                # Warte bis zum nächsten Check
                time.sleep(self.monitoring_interval)
                
            except Exception as e:
                logger.error(f"Error in message monitoring: {e}")
                self.error_count += 1
                time.sleep(self.retry_delay)
    
    def _get_unread_messages(self) -> List[MessageData]:
        """Holt ungelesene Nachrichten"""
        messages = []
        try:
            # Suche nach ungelesenen Chats
            unread_chats = self.driver.find_elements(By.XPATH, "//div[@data-testid='cell-0-0']//span[@data-testid='icon-unread']")
            
            for chat in unread_chats:
                try:
                    # Klicke auf Chat
                    chat.click()
                    await asyncio.sleep(1)
                    
                    # Hole Nachrichten
                    message_elements = self.driver.find_elements(By.XPATH, "//div[@data-testid='msg-container']")
                    
                    for msg_elem in message_elements:
                        try:
                            # Extrahiere Nachrichteninhalt
                            text_elem = msg_elem.find_element(By.XPATH, ".//span[@dir='ltr']")
                            text = text_elem.text if text_elem else ""
                            
                            # Extrahiere Sender
                            sender_elem = msg_elem.find_element(By.XPATH, ".//span[@data-testid='msg-meta']")
                            sender = sender_elem.text if sender_elem else "Unknown"
                            
                            # Erstelle MessageData
                            message_data = MessageData(
                                sender=sender,
                                message=text,
                                timestamp=datetime.now(),
                                message_type=MessageType.TEXT,
                                chat_id=str(hash(chat)),
                                metadata={"source": "whatsapp"}
                            )
                            
                            messages.append(message_data)
                            
                        except Exception as e:
                            logger.debug(f"Error parsing message element: {e}")
                            continue
                    
                except Exception as e:
                    logger.debug(f"Error processing chat: {e}")
                    continue
                    
        except Exception as e:
            logger.error(f"Error getting unread messages: {e}")
        
        return messages
    
    def _mark_as_read(self):
        """Markiert Nachrichten als gelesen"""
        try:
            # Klicke auf den Chat um als gelesen zu markieren
            # WhatsApp markiert automatisch als gelesen beim Öffnen
            pass
        except Exception as e:
            logger.debug(f"Error marking as read: {e}")
    
    async def close(self):
        """Schließt den WhatsApp Bot"""
        try:
            await self.stop_monitoring()
            
            if self.driver:
                self.driver.quit()
                self.driver = None
            
            self.status = BotStatus.DISCONNECTED
            self.running = False
            logger.info("WhatsApp Bot Interface closed")
            
        except Exception as e:
            logger.error(f"Error closing bot: {e}")
    
    def get_whatsapp_status(self) -> Dict[str, Any]:
        """Gibt WhatsApp-spezifischen Status zurück"""
        base_status = self.get_status()
        whatsapp_status = {
            **base_status.dict(),
            "driver_active": self.driver is not None,
            "whatsapp_web_open": self.driver.current_url if self.driver else None,
            "contacts_count": len(self.contacts)
        }
        return whatsapp_status
