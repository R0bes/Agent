"""
WhatsApp Bot für inoffizielle WhatsApp Web API
Verwendet pywhatkit für die Kommunikation
"""

import asyncio
import time
import threading
from typing import Optional, Callable, Dict, Any
from datetime import datetime
import pywhatkit as pwk
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import qrcode
from PIL import Image
import os

from agent.utils.log import get_logger
from agent.core import Core

logger = get_logger(__name__)

class WhatsAppBot:
    """
    Inoffizieller WhatsApp Bot mit pywhatkit
    """
    
    def __init__(self, agent_core: Optional[Core] = None):
        self.agent_core = agent_core or Core()
        self.driver = None
        self.is_connected = False
        self.message_handler: Optional[Callable] = None
        self.running = False
        self.last_message_time = None
        
    async def initialize(self):
        """Initialisiert den WhatsApp Bot"""
        try:
            logger.info("Initializing WhatsApp Bot...")
            
            # Browser Setup
            options = webdriver.ChromeOptions()
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            options.add_argument("--disable-gpu")
            options.add_argument("--window-size=1920,1080")
            
            # Optional: Headless mode
            # options.add_argument("--headless")
            
            self.driver = webdriver.Chrome(options=options)
            self.driver.get("https://web.whatsapp.com")
            
            logger.info("WhatsApp Web opened, waiting for QR code scan...")
            
            # Warte auf QR Code Scan
            await self._wait_for_login()
            
            self.is_connected = True
            logger.info("WhatsApp Bot successfully connected!")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize WhatsApp Bot: {e}")
            return False
    
    async def _wait_for_login(self, timeout: int = 300):
        """Wartet auf das Scannen des QR Codes"""
        try:
            # Warte auf das Verschwinden des QR Codes
            WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((By.ID, "side"))
            )
            logger.info("QR Code scanned successfully!")
            
        except TimeoutException:
            logger.error("Timeout waiting for QR code scan")
            raise
    
    def set_message_handler(self, handler: Callable):
        """Setzt den Message Handler für eingehende Nachrichten"""
        self.message_handler = handler
    
    async def send_message(self, phone_number: str, message: str) -> bool:
        """
        Sendet eine Nachricht an eine Telefonnummer
        
        Args:
            phone_number: Telefonnummer im Format +49123456789
            message: Zu sendende Nachricht
            
        Returns:
            bool: True wenn erfolgreich gesendet
        """
        try:
            if not self.is_connected:
                logger.error("WhatsApp not connected")
                return False
            
            # Formatiere Telefonnummer für WhatsApp
            if not phone_number.startswith('+'):
                phone_number = '+' + phone_number
            
            # Verwende pywhatkit für das Senden
            pwk.sendwhatmsg_instantly(
                phone_no=phone_number,
                message=message,
                wait_time=10,
                tab_close=True,
                close_time=3
            )
            
            logger.info(f"Message sent to {phone_number}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send message to {phone_number}: {e}")
            return False
    
    async def send_message_to_group(self, group_name: str, message: str) -> bool:
        """
        Sendet eine Nachricht an eine WhatsApp Gruppe
        
        Args:
            group_name: Name der Gruppe
            message: Zu sendende Nachricht
            
        Returns:
            bool: True wenn erfolgreich gesendet
        """
        try:
            if not self.is_connected:
                logger.error("WhatsApp not connected")
                return False
            
            # Verwende pywhatkit für Gruppen
            pwk.sendwhatmsg_to_group(
                group_name=group_name,
                message=message,
                wait_time=10,
                tab_close=True,
                close_time=3
            )
            
            logger.info(f"Message sent to group: {group_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send message to group {group_name}: {e}")
            return False
    
    async def _monitor_messages(self):
        """Überwacht eingehende Nachrichten"""
        while self.running:
            try:
                if not self.is_connected:
                    await asyncio.sleep(5)
                    continue
                
                # Suche nach neuen Nachrichten
                messages = self._get_unread_messages()
                
                for message in messages:
                    if self.message_handler:
                        await self.message_handler(message)
                
                await asyncio.sleep(2)  # Kurze Pause zwischen Checks
                
            except Exception as e:
                logger.error(f"Error in message monitoring: {e}")
                await asyncio.sleep(5)
    
    def _get_unread_messages(self) -> list:
        """Holt ungelesene Nachrichten von WhatsApp Web"""
        messages = []
        
        try:
            # Suche nach ungelesenen Nachrichten
            unread_elements = self.driver.find_elements(
                By.CSS_SELECTOR, 
                '[data-testid="icon-unread-count"]'
            )
            
            for element in unread_elements:
                try:
                    # Klicke auf die ungelesene Nachricht
                    element.click()
                    time.sleep(1)
                    
                    # Hole die Nachricht
                    message_elements = self.driver.find_elements(
                        By.CSS_SELECTOR,
                        '[data-testid="msg-meta"]'
                    )
                    
                    if message_elements:
                        latest_message = message_elements[-1]
                        message_text = latest_message.text
                        
                        # Hole Sender-Information
                        sender_element = self.driver.find_element(
                            By.CSS_SELECTOR,
                            '[data-testid="conversation-title"]'
                        )
                        sender = sender_element.text
                        
                        messages.append({
                            'sender': sender,
                            'message': message_text,
                            'timestamp': datetime.now().isoformat(),
                            'type': 'text'
                        })
                        
                        # Markiere als gelesen
                        self._mark_as_read()
                        
                except Exception as e:
                    logger.error(f"Error processing unread message: {e}")
                    continue
                    
        except Exception as e:
            logger.error(f"Error getting unread messages: {e}")
        
        return messages
    
    def _mark_as_read(self):
        """Markiert Nachrichten als gelesen"""
        try:
            # Doppelklick auf die Nachricht um sie als gelesen zu markieren
            message_elements = self.driver.find_elements(
                By.CSS_SELECTOR,
                '[data-testid="msg-meta"]'
            )
            
            if message_elements:
                message_elements[-1].click()
                
        except Exception as e:
            logger.error(f"Error marking message as read: {e}")
    
    async def start_monitoring(self):
        """Startet die Nachrichtenüberwachung"""
        if not self.is_connected:
            logger.error("Cannot start monitoring - not connected")
            return False
        
        self.running = True
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
        logger.info("Message monitoring stopped")
    
    async def process_incoming_message(self, message_data: Dict[str, Any]):
        """
        Verarbeitet eingehende Nachrichten mit dem Agent
        
        Args:
            message_data: Dictionary mit Nachrichtendaten
        """
        try:
            sender = message_data.get('sender', 'Unknown')
            message_text = message_data.get('message', '')
            
            logger.info(f"Processing message from {sender}: {message_text}")
            
            # Verwende den Agent Core um die Nachricht zu verarbeiten
            if self.agent_core:
                response = await self.agent_core.ask(message_text)
                
                # Sende Antwort zurück
                await self.send_message(sender, response)
                
            else:
                # Fallback Antwort
                fallback_response = f"Nachricht empfangen: {message_text}"
                await self.send_message(sender, fallback_response)
                
        except Exception as e:
            logger.error(f"Error processing incoming message: {e}")
    
    async def close(self):
        """Schließt den WhatsApp Bot"""
        try:
            self.running = False
            
            if self.driver:
                self.driver.quit()
                self.driver = None
            
            self.is_connected = False
            logger.info("WhatsApp Bot closed")
            
        except Exception as e:
            logger.error(f"Error closing WhatsApp Bot: {e}")
    
    def get_status(self) -> Dict[str, Any]:
        """Gibt den aktuellen Status des Bots zurück"""
        return {
            'connected': self.is_connected,
            'running': self.running,
            'last_message_time': self.last_message_time
        }
