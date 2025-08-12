"""
Telegram Bot Implementierung mit BotInterface
Implementiert das einheitliche Bot-Interface für Telegram
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

from telegram import Bot, Update, Message, Chat, User
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from telegram.error import TelegramError, NetworkError, Unauthorized

from agent.utils.log import get_logger
from agent.core import Core

# Import des Bot-Interfaces
from adapter.bot_template.bot_interface import BotInterface, BotStatus, MessageType, MessageData

logger = get_logger(__name__)

class TelegramBotInterface(BotInterface):
    """
    Telegram Bot Implementierung mit BotInterface
    """
    
    def __init__(self, agent_core: Optional[Core] = None, config: Optional[Dict] = None):
        super().__init__(config)
        self.agent_core = agent_core or Core()
        self.bot: Optional[Bot] = None
        self.application: Optional[Application] = None
        self.monitoring_thread = None
        
        # Telegram-spezifische Konfiguration
        self.token = self.config.get('token')
        if not self.token:
            raise ValueError("Telegram Bot Token is required in config")
        
        self.webhook_url = self.config.get('webhook_url')
        self.polling = self.config.get('polling', True)
        self.allowed_users = self.config.get('allowed_users', [])
        self.commands = self.config.get('commands', {})
        
        # Chat-Verwaltung
        self.active_chats = {}
        self.last_message_id = {}
        
    async def initialize(self) -> bool:
        """Initialisiert den Telegram Bot"""
        try:
            logger.info("Initializing Telegram Bot Interface...")
            self.status = BotStatus.CONNECTING
            self.start_time = datetime.now()
            
            # Bot-Instanz erstellen
            self.bot = Bot(token=self.token)
            
            # Bot-Informationen abrufen
            bot_info = await self.bot.get_me()
            logger.info(f"Bot initialized: @{bot_info.username} ({bot_info.first_name})")
            
            # Application erstellen
            self.application = Application.builder().token(self.token).build()
            
            # Handler registrieren
            self._setup_handlers()
            
            # Webhook oder Polling starten
            if self.webhook_url and not self.polling:
                await self._setup_webhook()
            else:
                await self._setup_polling()
            
            self.status = BotStatus.CONNECTED
            self.update_activity()
            logger.info("Telegram Bot Interface successfully connected!")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Telegram Bot Interface: {e}")
            self.status = BotStatus.ERROR
            self.error_count += 1
            return False
    
    def _setup_handlers(self):
        """Richtet die Message Handler ein"""
        
        # Command Handler
        async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
            """Handler für /start Befehl"""
            await self._handle_command(update, context, "start")
        
        async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
            """Handler für /help Befehl"""
            await self._handle_command(update, context, "help")
        
        async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
            """Handler für /status Befehl"""
            await self._handle_command(update, context, "status")
        
        # Message Handler
        async def message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
            """Handler für eingehende Nachrichten"""
            await self._handle_message(update, context)
        
        # Handler registrieren
        self.application.add_handler(CommandHandler("start", start_command))
        self.application.add_handler(CommandHandler("help", help_command))
        self.application.add_handler(CommandHandler("status", status_command))
        self.application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, message_handler))
        
        # Error Handler
        self.application.add_error_handler(self._error_handler)
    
    async def _setup_webhook(self):
        """Richtet Webhook ein"""
        try:
            await self.bot.set_webhook(url=self.webhook_url)
            logger.info(f"Webhook set to: {self.webhook_url}")
        except Exception as e:
            logger.error(f"Failed to set webhook: {e}")
            raise
    
    async def _setup_polling(self):
        """Startet Polling für Updates"""
        try:
            await self.application.initialize()
            await self.application.start()
            await self.application.updater.start_polling()
            logger.info("Polling started")
        except Exception as e:
            logger.error(f"Failed to start polling: {e}")
            raise
    
    async def _handle_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE, command: str):
        """Verarbeitet eingehende Befehle"""
        try:
            chat_id = update.effective_chat.id
            user = update.effective_user
            
            # Überprüfe Berechtigung
            if not self._is_user_allowed(user):
                await self._send_message(chat_id, "Du bist nicht berechtigt, diesen Bot zu verwenden.")
                return
            
            # Führe Befehl aus
            if command == "start":
                response = "Willkommen! Ich bin dein Telegram Bot. Verwende /help für verfügbare Befehle."
            elif command == "help":
                response = "Verfügbare Befehle:\n/start - Startet den Bot\n/help - Zeigt diese Hilfe\n/status - Bot-Status"
            elif command == "status":
                status = self.get_status()
                response = f"Bot Status: {status.status.value}\nGesund: {status.is_healthy}\nUptime: {status.uptime:.1f}s"
            else:
                response = f"Unbekannter Befehl: {command}"
            
            await self._send_message(chat_id, response)
            
        except Exception as e:
            logger.error(f"Error handling command {command}: {e}")
    
    async def _handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Verarbeitet eingehende Nachrichten"""
        try:
            message = update.message
            chat_id = message.chat.id
            user = message.from_user
            
            # Überprüfe Berechtigung
            if not self._is_user_allowed(user):
                await self._send_message(chat_id, "Du bist nicht berechtigt, diesen Bot zu verwenden.")
                return
            
            # Erstelle MessageData
            message_data = MessageData(
                sender=f"{user.first_name} {user.last_name or ''}".strip(),
                message=message.text or "",
                timestamp=datetime.fromtimestamp(message.date),
                message_type=MessageType.TEXT,
                chat_id=str(chat_id),
                message_id=str(message.message_id),
                metadata={
                    "source": "telegram",
                    "user_id": user.id,
                    "username": user.username,
                    "chat_type": message.chat.type
                }
            )
            
            # Verarbeite Nachricht
            await self.process_incoming_message(message_data)
            
            # Aktualisiere Chat-Informationen
            self.active_chats[chat_id] = {
                "user": user,
                "last_activity": datetime.now(),
                "message_count": self.active_chats.get(chat_id, {}).get("message_count", 0) + 1
            }
            
        except Exception as e:
            logger.error(f"Error handling message: {e}")
    
    async def _error_handler(self, update: object, context: ContextTypes.DEFAULT_TYPE):
        """Behandelt Fehler in der Bot-Anwendung"""
        try:
            logger.error(f"Exception while handling an update: {context.error}")
            
            if isinstance(context.error, Unauthorized):
                logger.error("Bot token is invalid or bot was blocked by user")
            elif isinstance(context.error, NetworkError):
                logger.error("Network error occurred")
                self.error_count += 1
            else:
                logger.error(f"Unexpected error: {context.error}")
                self.error_count += 1
                
        except Exception as e:
            logger.error(f"Error in error handler: {e}")
    
    def _is_user_allowed(self, user: User) -> bool:
        """Überprüft ob ein Benutzer berechtigt ist"""
        if not self.allowed_users:
            return True  # Alle Benutzer erlaubt wenn keine Einschränkung
        
        return (user.id in self.allowed_users or 
                user.username in self.allowed_users or
                f"{user.first_name} {user.last_name or ''}".strip() in self.allowed_users)
    
    async def send_message(self, recipient: str, message: str, 
                          message_type: MessageType = MessageType.TEXT,
                          metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Sendet eine Nachricht an einen Empfänger
        
        Args:
            recipient: Chat-ID, Username oder Telefonnummer
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
            
            # Konvertiere recipient zu chat_id
            chat_id = await self._resolve_recipient(recipient)
            if not chat_id:
                logger.error(f"Could not resolve recipient: {recipient}")
                return False
            
            # Sende Nachricht
            success = await self._send_message(chat_id, message)
            
            if success:
                self.update_activity()
                logger.info(f"Message sent successfully to {recipient} (chat_id: {chat_id})")
                return True
            else:
                logger.error(f"Failed to send message to {recipient}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending message to {recipient}: {e}")
            self.error_count += 1
            return False
    
    async def _resolve_recipient(self, recipient: str) -> Optional[int]:
        """Löst einen Empfänger zu einer Chat-ID auf"""
        try:
            # Versuche als Chat-ID zu parsen
            if recipient.isdigit() or (recipient.startswith('-') and recipient[1:].isdigit()):
                return int(recipient)
            
            # Versuche als Username zu verwenden
            if recipient.startswith('@'):
                recipient = recipient[1:]
            
            # Hole Chat-Informationen
            chat = await self.bot.get_chat(recipient)
            return chat.id
            
        except Exception as e:
            logger.debug(f"Could not resolve recipient {recipient}: {e}")
            return None
    
    async def _send_message(self, chat_id: int, message: str) -> bool:
        """Sendet eine Nachricht an eine Chat-ID"""
        try:
            await self.bot.send_message(chat_id=chat_id, text=message)
            return True
        except Exception as e:
            logger.error(f"Error sending message to chat {chat_id}: {e}")
            return False
    
    async def start_monitoring(self) -> bool:
        """Startet das Monitoring für eingehende Nachrichten"""
        try:
            if self.monitoring_thread and self.monitoring_thread.is_alive():
                logger.warning("Monitoring already running")
                return True
            
            # Für Telegram ist das Monitoring bereits durch die Handler aktiv
            self.running = True
            self.status = BotStatus.MONITORING
            self.update_activity()
            logger.info("Telegram message monitoring started")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to start monitoring: {e}")
            self.error_count += 1
            return False
    
    async def stop_monitoring(self):
        """Stoppt das Monitoring"""
        try:
            self.running = False
            
            if self.application:
                await self.application.updater.stop()
                await self.application.stop()
                await self.application.shutdown()
            
            self.status = BotStatus.CONNECTED
            logger.info("Telegram message monitoring stopped")
            
        except Exception as e:
            logger.error(f"Error stopping monitoring: {e}")
    
    async def close(self):
        """Schließt den Telegram Bot"""
        try:
            await self.stop_monitoring()
            
            if self.bot:
                await self.bot.close()
                self.bot = None
            
            self.status = BotStatus.DISCONNECTED
            self.running = False
            logger.info("Telegram Bot Interface closed")
            
        except Exception as e:
            logger.error(f"Error closing bot: {e}")
    
    def get_telegram_status(self) -> Dict[str, Any]:
        """Gibt Telegram-spezifischen Status zurück"""
        base_status = self.get_status()
        telegram_status = {
            **base_status.dict(),
            "bot_active": self.bot is not None,
            "application_active": self.application is not None,
            "active_chats_count": len(self.active_chats),
            "webhook_active": bool(self.webhook_url),
            "polling_active": self.polling
        }
        return telegram_status
    
    async def broadcast_message(self, message: str, chat_ids: Optional[List[int]] = None) -> Dict[int, bool]:
        """
        Sendet eine Nachricht an mehrere Chats
        
        Args:
            message: Zu sendende Nachricht
            chat_ids: Liste der Chat-IDs, wenn None werden alle aktiven Chats verwendet
            
        Returns:
            Dict[int, bool]: Mapping von Chat-ID zu Erfolg
        """
        if chat_ids is None:
            chat_ids = list(self.active_chats.keys())
        
        results = {}
        for chat_id in chat_ids:
            try:
                success = await self._send_message(chat_id, message)
                results[chat_id] = success
            except Exception as e:
                logger.error(f"Error broadcasting to chat {chat_id}: {e}")
                results[chat_id] = False
        
        return results
