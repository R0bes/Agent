"""
WhatsApp Bot Adapter für den Agent
"""

from .whatsapp_bot import WhatsAppBot
from .simple_whatsapp_bot import SimpleWhatsAppBot
from .improved_whatsapp_bot import ImprovedWhatsAppBot, BotStatus, MessageData

__all__ = [
    'WhatsAppBot',
    'SimpleWhatsAppBot', 
    'ImprovedWhatsAppBot',
    'BotStatus',
    'MessageData'
]
