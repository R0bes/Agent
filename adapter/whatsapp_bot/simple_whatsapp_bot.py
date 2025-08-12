"""
Einfacher WhatsApp Bot mit selenium-wire
Bessere Unterstützung für WhatsApp Web
"""

import asyncio
import time
import threading
from typing import Optional, Callable, Dict, Any, List
from datetime import datetime
import json
import os
import base64
import io

from seleniumwire import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from selenium.webdriver import Keys
from selenium.webdriver.common.action_chains import ActionChains

# Optional imports - können fehlen
try:
    from agent.utils.log import get_logger
    from agent.core import Core
    AGENT_AVAILABLE = True
except ImportError:
    # Fallback für lokale Tests
    import logging
    
    # Schöne Logging-Konfiguration
    def setup_logging():
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.StreamHandler()
            ]
        )
        
        # Google API Logs unterdrücken
        logging.getLogger('selenium').setLevel(logging.WARNING)
        logging.getLogger('urllib3').setLevel(logging.WARNING)
        logging.getLogger('seleniumwire').setLevel(logging.WARNING)
        
        # Chrome/DevTools Logs unterdrücken
        logging.getLogger('selenium.webdriver.remote.remote_connection').setLevel(logging.ERROR)
        
        return logging.getLogger
    
    get_logger = setup_logging()
    Core = None
    AGENT_AVAILABLE = False

logger = get_logger(__name__)

class SimpleWhatsAppBot:
    """
    Einfacher WhatsApp Bot mit selenium-wire
    """
    
    def __init__(self, agent_core: Optional[Core] = None, config: Optional[Dict] = None):
        """Initialisiert den WhatsApp Bot"""
        # Konfiguration
        self.config = config or {}
        self.headless = self.config.get('headless', False)
        self.max_retries = self.config.get('max_retries', 3)
        self.retry_delay = self.config.get('retry_delay', 5)
        
        # Bot-Status
        self.is_connected = False
        self.monitoring_task = None
        self.running = False
        self.last_message_time = None
        
        # Neue Attribute für bessere Status-Informationen
        self.message_count = 0
        self.error_count = 0
        self.last_activity = 'Initialized'
        self.last_messages = []
        
        # Selenium WebDriver
        self.driver = None
        
        # Agent Core (optional)
        self.agent_core = None
        if agent_core:
            try:
                from agent.core import Core
                self.agent_core = agent_core
            except ImportError:
                logger.warning("Agent core not available")
        
        # Message Handler
        self.message_handler = None
        
        # Logging
        try:
            from agent.utils.log import get_logger
            self.logger = get_logger(__name__)
        except ImportError:
            # Fallback logging
            import logging
            self.logger = logging.getLogger(__name__)
            logging.basicConfig(level=logging.INFO)
    
    async def initialize(self):
        """Initialisiert den WhatsApp Bot"""
        try:
            logger.info("Initializing Simple WhatsApp Bot...")
            print("🚀 Starte WhatsApp Bot...")
            
            # Browser-Optionen konfigurieren
            chrome_options = webdriver.ChromeOptions()
            
            if self.headless:
                chrome_options.add_argument("--headless")
                print("🔒 Browser läuft im Hintergrund")
            else:
                print("📱 Browser wird sichtbar für QR-Code Scan")
            
            # Browser-Logs unterdrücken
            chrome_options.add_argument("--log-level=3")
            chrome_options.add_argument("--silent")
            chrome_options.add_argument("--disable-logging")
            chrome_options.add_argument("--disable-dev-tools")
            chrome_options.add_experimental_option("excludeSwitches", ["enable-logging"])
            chrome_options.add_experimental_option("useAutomationExtension", False)
            
            # Selenium Wire Optionen
            seleniumwire_options = {
                'suppress_connection_errors': True,
                'ignore_http_methods': ['GET', 'POST'],
                'connection_timeout': 10
            }
            
            print("🌐 Starte Chrome Browser...")
            self.driver = webdriver.Chrome(
                options=chrome_options,
                seleniumwire_options=seleniumwire_options
            )
            
            print("📱 Öffne WhatsApp Web...")
            self.driver.get("https://web.whatsapp.com")
            
            # Warte auf Seitenladung
            print("⏳ Warte auf Seitenladung...")
            await asyncio.sleep(2)
            
            print("🔍 Prüfe ob WhatsApp Web geladen ist...")
            
            # Warte auf WhatsApp Web
            try:
                WebDriverWait(self.driver, 10).until(
                    lambda driver: driver.execute_script("return document.readyState") == "complete"
                )
                print("✅ WhatsApp Web Seite geladen")
            except TimeoutException:
                print("⚠️ Seite lädt langsam, fahre fort...")
            
            # Warte auf Login
            print("🔐 Warte auf Login...")
            await self._wait_for_login()
            
            logger.info("WhatsApp Bot successfully connected!")
            print("🎉 WhatsApp Bot erfolgreich verbunden!")
            
        except Exception as e:
            logger.error(f"Failed to initialize WhatsApp Bot: {e}")
            print(f"❌ Fehler beim Initialisieren: {e}")
            raise
    
    async def _wait_for_login(self, timeout: int = 120):  # Reduziert von 300 auf 120 Sekunden
        """Wartet auf erfolgreichen Login nach QR-Code Scan"""
        try:
            print("🔐 Warte auf QR-Code Scan...")
            
            # Zeige QR-Code an
            await self._extract_and_show_qr_code()
            
            print("📱 Scannen Sie den QR-Code mit Ihrem WhatsApp auf dem Handy")
            print("⏳ Überwache Login-Status...")
            
            # Warte auf Login (verschiedene Selektoren für verschiedene WhatsApp Versionen)
            chat_list_selectors = [
                '[data-testid="chat-list"]',
                '[data-testid="chat-list-search"]',
                '[data-testid="conversation-list"]',
                'div[data-testid*="chat"]',
                'div[role="grid"]',
                '[data-testid="default-user"]',  # Fallback für ältere Versionen
                'div[data-testid="chat-list"]'   # Fallback für ältere Versionen
            ]
            
            login_detected = False
            start_time = time.time()
            check_count = 0
            
            while time.time() - start_time < timeout:
                check_count += 1
                elapsed = int(time.time() - start_time)
                
                if check_count % 5 == 0:  # Alle 5 Sekunden Status anzeigen
                    print(f"⏳ Login-Überwachung läuft... ({elapsed}s vergangen)")
                    
                    # Debug: Zeige aktuelle URL und Seiteninhalt
                    try:
                        current_url = self.driver.current_url
                        print(f"   🔗 Aktuelle URL: {current_url}")
                        
                        # Prüfe ob wir noch auf der QR-Code-Seite sind
                        try:
                            qr_elements = self.driver.find_elements(By.CSS_SELECTOR, 'canvas')
                            if qr_elements:
                                print(f"   🎯 QR-Code Elemente gefunden: {len(qr_elements)}")
                            else:
                                print("   🎯 Keine QR-Code Elemente mehr gefunden")
                        except:
                            pass
                            
                    except Exception as e:
                        print(f"   ⚠️ Debug-Info nicht verfügbar: {e}")
                
                try:
                    # Prüfe ob Chat-Liste sichtbar ist
                    for i, selector in enumerate(chat_list_selectors):
                        try:
                            chat_list = self.driver.find_element(By.CSS_SELECTOR, selector)
                            if chat_list.is_displayed():
                                print(f"✅ Chat-Liste gefunden mit Selektor: {selector}")
                                login_detected = True
                                break
                        except NoSuchElementException:
                            continue
                    
                    if login_detected:
                        break
                    
                    # Fallback: Prüfe ob QR-Code verschwunden ist
                    try:
                        qr_element = self.driver.find_element(By.CSS_SELECTOR, 'canvas[aria-label="Scan me!"]')
                        if not qr_element.is_displayed():
                            print("✅ QR-Code verschwunden - Login erfolgreich!")
                            login_detected = True
                            break
                    except NoSuchElementException:
                        # QR-Code nicht gefunden könnte bedeuten dass Login erfolgreich ist
                        pass
                    
                    # Zusätzlicher Fallback: Prüfe ob wir von der QR-Seite weg sind
                    try:
                        page_title = self.driver.title
                        if "WhatsApp" in page_title and "QR" not in page_title:
                            print(f"✅ Seiten-Titel geändert: {page_title}")
                            login_detected = True
                            break
                    except:
                        pass
                    
                    await asyncio.sleep(1)
                    
                except Exception as e:
                    if check_count % 10 == 0:  # Nicht zu oft Fehler loggen
                        logger.debug(f"Login check error: {e}")
                    await asyncio.sleep(1)
            
            if login_detected:
                print("🎉 Login erfolgreich! WhatsApp ist verbunden.")
                self.is_connected = True
                
                # Browser nur minimieren, nicht komplett verstecken
                try:
                    if hasattr(self.driver, 'minimize_window'):
                        print("🔒 Minimiere Browser...")
                        self.driver.minimize_window()
                    else:
                        # Fallback: Fenster kleiner machen
                        print("🔒 Verkleinere Browser...")
                        self.driver.set_window_size(800, 600)
                        self.driver.set_window_position(100, 100)
                except Exception as e:
                    logger.warning(f"Could not minimize browser: {e}")
                    print("⚠️ Browser konnte nicht minimiert werden")
                
                # Warte kurz für vollständiges Laden
                print("⏳ Warte auf vollständiges Laden...")
                await asyncio.sleep(2)
                print("✅ WhatsApp vollständig geladen!")
            else:
                print(f"❌ Login nicht erkannt nach {timeout} Sekunden")
                print("🔍 Debug-Informationen:")
                try:
                    print(f"   URL: {self.driver.current_url}")
                    print(f"   Titel: {self.driver.title}")
                    
                    # Zeige alle verfügbaren Elemente
                    all_elements = self.driver.find_elements(By.CSS_SELECTOR, '[data-testid]')
                    print(f"   data-testid Elemente: {len(all_elements)}")
                    for elem in all_elements[:5]:
                        testid = elem.get_attribute('data-testid')
                        print(f"     - {testid}")
                        
                except Exception as e:
                    print(f"   Debug-Fehler: {e}")
                    
                raise TimeoutException("Could not detect successful login")
            
        except TimeoutException:
            logger.error("Timeout waiting for QR code scan")
            print("⏰ Timeout beim Warten auf QR-Code Scan")
            raise
    
    async def _extract_and_show_qr_code(self):
        """Extrahiert den QR-Code aus dem Browser und zeigt ihn an"""
        try:
            print("🔍 Suche nach QR-Code Element...")
            
            # Warte auf QR-Code Element
            qr_selectors = [
                'canvas[aria-label="Scan me!"]',
                'canvas[data-ref]',
                'div[data-ref] canvas',
                'canvas'
            ]
            
            qr_element = None
            for i, selector in enumerate(qr_selectors):
                try:
                    print(f"  🔍 Versuche Selektor {i+1}: {selector}")
                    qr_element = WebDriverWait(self.driver, 5).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                    )
                    print(f"✅ QR-Code Element gefunden mit Selektor: {selector}")
                    break
                except TimeoutException:
                    print(f"  ⏳ Selektor {i+1} nicht gefunden, versuche nächsten...")
                    continue
            
            if not qr_element:
                print("⚠️ QR-Code Element nicht gefunden, fahre fort...")
                return
            
            print("📸 Extrahiere QR-Code als Bild...")
            
            # Extrahiere QR-Code als Base64
            qr_base64 = self.driver.execute_script("""
                var canvas = arguments[0];
                return canvas.toDataURL('image/png');
            """, qr_element)
            
            if qr_base64 and qr_base64.startswith('data:image/png;base64,'):
                # Entferne den Data-URL Prefix
                qr_data = qr_base64.split(',')[1]
                
                # Dekodiere Base64 zu Bytes
                qr_bytes = base64.b64decode(qr_data)
                
                # Speichere QR-Code als Datei
                qr_filename = "whatsapp_qr_code.png"
                with open(qr_filename, 'wb') as f:
                    f.write(qr_bytes)
                
                logger.info(f"QR Code extracted and saved as: {qr_filename}")
                print(f"💾 QR-Code gespeichert als: {qr_filename}")
                
                # Zeige QR-Code in Dialogfenster
                print("🖼️ Zeige QR-Code in Dialogfenster...")
                await self._show_qr_dialog(qr_filename)
                
            else:
                print("❌ QR-Code konnte nicht extrahiert werden")
                
        except Exception as e:
            print(f"❌ Fehler beim QR-Code extrahieren: {e}")
            logger.error(f"Error extracting QR code: {e}")
    
    async def _show_qr_dialog(self, qr_filename: str):
        """Zeigt den QR-Code in einem Tkinter-Dialog an"""
        try:
            import tkinter as tk
            from PIL import Image, ImageTk
            
            def show_qr_dialog():
                try:
                    # Erstelle Tkinter-Fenster
                    root = tk.Tk()
                    root.title("WhatsApp QR-Code")
                    root.geometry("400x500")
                    
                    # Lade und zeige QR-Code
                    img = Image.open(qr_filename)
                    img = img.resize((300, 300), Image.Resampling.LANCZOS)
                    photo = ImageTk.PhotoImage(img)
                    
                    # Label mit QR-Code
                    qr_label = tk.Label(root, image=photo)
                    qr_label.pack(pady=20)
                    
                    # Anweisungen
                    instruction_label = tk.Label(root, text="Scannen Sie den QR-Code mit WhatsApp auf Ihrem Handy", 
                                              font=("Arial", 12), wraplength=350)
                    instruction_label.pack(pady=10)
                    
                    # Status-Label
                    status_label = tk.Label(root, text="⏳ Warten auf Login...", font=("Arial", 10), fg="blue")
                    status_label.pack(pady=10)
                    
                    # Schließen-Button
                    close_button = tk.Button(root, text="QR-Code schließen", command=root.destroy)
                    close_button.pack(pady=10)
                    
                    # Fenster zentrieren
                    root.update_idletasks()
                    x = (root.winfo_screenwidth() // 2) - (root.winfo_width() // 2)
                    y = (root.winfo_screenheight() // 2) - (root.winfo_width() // 2)
                    root.geometry(f"+{x}+{y}")
                    
                    # Fenster im Vordergrund anzeigen
                    root.lift()
                    root.attributes('-topmost', True)
                    root.attributes('-topmost', False)
                    
                    # Tkinter-Loop starten
                    root.mainloop()
                    
                except Exception as e:
                    print(f"⚠️ Fehler im QR-Dialog: {e}")
            
            # Starte QR-Dialog in separatem Thread
            qr_thread = threading.Thread(target=show_qr_dialog, daemon=True)
            qr_thread.start()
            
        except ImportError:
            print("⚠️ Tkinter/PIL nicht verfügbar, QR-Code wird als Datei gespeichert")
        except Exception as e:
            print(f"⚠️ Fehler beim Anzeigen des QR-Codes: {e}")
            print("QR-Code wurde als Datei gespeichert")
    
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
                print("❌ WhatsApp ist nicht verbunden")
                return False
            
            print(f"📤 Öffne Chat mit {phone_number}...")
            
            # Formatiere Telefonnummer
            if not phone_number.startswith('+'):
                phone_number = '+' + phone_number
            
            # Öffne Chat mit der Nummer
            chat_url = f"https://web.whatsapp.com/send?phone={phone_number.replace('+', '')}"
            self.driver.get(chat_url)
            
            # Warte auf Chat-Loading
            print("⏳ Warte auf Chat-Loading...")
            await asyncio.sleep(5)
            
            # Warte auf Input-Feld (aktualisierte Selektoren)
            input_selectors = [
                '[data-testid="conversation-compose-box-input"]',
                '[data-testid="compose-box-input"]',
                '[contenteditable="true"][data-tab="10"]',
                'div[contenteditable="true"]',
                '[data-testid="compose-box"]',
                'div[contenteditable="true"][role="textbox"]',
                'div[data-testid="conversation-compose-box"] div[contenteditable="true"]'
            ]
            
            input_field = None
            for selector in input_selectors:
                try:
                    input_field = WebDriverWait(self.driver, 10).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                    )
                    if input_field.is_displayed() and input_field.is_enabled():
                        print(f"✅ Input-Feld gefunden mit Selektor: {selector}")
                        break
                except TimeoutException:
                    continue
            
            if not input_field:
                print("❌ Input-Feld nicht gefunden")
                # Debug: Zeige alle verfügbaren Elemente
                try:
                    all_inputs = self.driver.find_elements(By.CSS_SELECTOR, '[contenteditable="true"]')
                    print(f"🔍 Gefundene contenteditable Elemente: {len(all_inputs)}")
                    for i, elem in enumerate(all_inputs[:5]):
                        print(f"  {i}: {elem.get_attribute('outerHTML')[:100]}...")
                except:
                    pass
                raise Exception("Could not find input field")
            
            # Tippe Nachricht
            print(f"✍️ Tippe Nachricht: {message}")
            input_field.clear()
            input_field.send_keys(message)
            await asyncio.sleep(1)
            
            # Sende Nachricht (aktualisierte Selektoren)
            send_selectors = [
                '[data-testid="send"]',
                '[data-testid="compose-send"]',
                '[data-icon="send"]',
                'span[data-icon="send"]',
                'button[aria-label="Send"]',
                'button[aria-label="Senden"]',
                'div[data-testid="send"]',
                'div[data-icon="send"]'
            ]
            
            send_button = None
            for selector in send_selectors:
                try:
                    send_button = self.driver.find_element(By.CSS_SELECTOR, selector)
                    if send_button.is_displayed() and send_button.is_enabled():
                        print(f"✅ Senden-Button gefunden mit Selektor: {selector}")
                        break
                except NoSuchElementException:
                    continue
            
            if not send_button:
                print("⚠️ Senden-Button nicht gefunden, verwende Enter-Taste")
                # Fallback: Enter-Taste verwenden
                input_field.send_keys(Keys.RETURN)
            else:
                print("🔄 Klicke Senden-Button...")
                send_button.click()
            
            # Warte kurz und prüfe ob Nachricht gesendet wurde
            await asyncio.sleep(2)
            
            # Prüfe ob Nachricht gesendet wurde (suche nach dem Nachrichten-Text)
            try:
                message_elements = self.driver.find_elements(By.CSS_SELECTOR, '[data-testid="msg-meta"]')
                if message_elements:
                    print("✅ Nachricht erfolgreich gesendet!")
                else:
                    print("✅ Nachricht gesendet (Status unklar)")
            except:
                print("✅ Nachricht gesendet")
            
            logger.info(f"Message sent to {phone_number}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send message to {phone_number}: {e}")
            print(f"❌ Fehler beim Senden der Nachricht: {e}")
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
            if not self.is_connected:
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
            
            # Finde Input-Feld und sende Nachricht (verschiedene Selektoren)
            input_selectors = [
                '[data-testid="conversation-compose-box-input"]',
                '[contenteditable="true"][data-tab="10"]',
                'div[contenteditable="true"]',
                '[data-testid="compose-box"]'
            ]
            
            input_field = None
            for selector in input_selectors:
                try:
                    input_field = WebDriverWait(self.driver, 5).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                    )
                    break
                except TimeoutException:
                    continue
            
            if not input_field:
                raise Exception("Could not find input field")
            
            input_field.clear()
            input_field.send_keys(message)
            
            # Sende Nachricht (verschiedene Selektoren)
            send_selectors = [
                '[data-testid="send"]',
                '[data-icon="send"]',
                'span[data-icon="send"]',
                'button[aria-label="Send"]'
            ]
            
            send_button = None
            for selector in send_selectors:
                try:
                    send_button = self.driver.find_element(By.CSS_SELECTOR, selector)
                    break
                except NoSuchElementException:
                    continue
            
            if not send_button:
                # Fallback: Enter-Taste verwenden
                input_field.send_keys(Keys.RETURN)
            else:
                send_button.click()
            
            logger.info(f"Message sent to contact: {contact_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send message to contact {contact_name}: {e}")
            return False
    
    async def _monitor_messages(self):
        """Überwacht eingehende Nachrichten"""
        consecutive_errors = 0
        max_consecutive_errors = 5
        
        print("👂 Starte Nachrichtenüberwachung...")
        
        while self.monitoring_task and not self.monitoring_task.done():
            try:
                # Aktualisiere Status
                self.last_activity = 'Monitoring messages'
                
                # Hole ungelesene Nachrichten
                unread_messages = await self._get_unread_messages()
                
                if unread_messages:
                    print(f"📨 {len(unread_messages)} neue Nachrichten gefunden")
                    for message_data in unread_messages:
                        await self.process_incoming_message(message_data)
                
                # Markiere als gelesen
                if unread_messages:
                    self._mark_as_read()
                
                consecutive_errors = 0  # Reset error counter on success
                
                # Kürzere Wartezeit zwischen Überprüfungen
                await asyncio.sleep(2)
                
            except Exception as e:
                consecutive_errors += 1
                self.error_count += 1
                
                if consecutive_errors <= max_consecutive_errors:
                    print(f"⚠️ Nachrichtenüberwachung Fehler ({consecutive_errors}/{max_consecutive_errors}): {e}")
                    logger.warning(f"Message monitoring error: {e}")
                    await asyncio.sleep(5)  # Warte länger bei Fehlern
                else:
                    print(f"❌ Zu viele aufeinanderfolgende Fehler, stoppe Überwachung")
                    logger.error(f"Too many consecutive errors, stopping monitoring")
                    break
        
        print("🛑 Nachrichtenüberwachung gestoppt")
    
    async def _get_unread_messages(self) -> List[Dict[str, Any]]:
        """Holt ungelesene Nachrichten"""
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
                    await asyncio.sleep(1)
                    
                    # Hole Sender-Name
                    sender_element = self.driver.find_element(
                        By.CSS_SELECTOR,
                        '[data-testid="conversation-title"]'
                    )
                    sender = sender_element.text
                    
                    # Hole letzte Nachricht (verschiedene Selektoren)
                    message_selectors = [
                        '[data-testid="msg-meta"]',
                        '[data-testid="msg-text"]',
                        '.message-in .selectable-text',
                        '.message-out .selectable-text'
                    ]
                    
                    message_text = ""
                    for selector in message_selectors:
                        try:
                            message_elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                            if message_elements:
                                latest_message = message_elements[-1]
                                message_text = latest_message.text
                                break
                        except Exception:
                            continue
                    
                    if not message_text:
                        # Fallback: Versuche den letzten Nachrichtencontainer zu finden
                        try:
                            message_containers = self.driver.find_elements(
                                By.CSS_SELECTOR, 
                                '[data-testid="msg-container"]'
                            )
                            if message_containers:
                                message_text = message_containers[-1].text
                        except Exception:
                            message_text = "Nachricht konnte nicht gelesen werden"
                        
                        messages.append({
                            'sender': sender,
                            'message': message_text,
                            'timestamp': datetime.now().isoformat(),
                            'type': 'text'
                        })
                        
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
            # Verschiedene Selektoren für Nachrichten
            message_selectors = [
                '[data-testid="msg-meta"]',
                '[data-testid="msg-container"]',
                '.message-in',
                '.message-out'
            ]
            
            for selector in message_selectors:
                try:
                    message_elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    if message_elements:
                        # Klicke auf die letzte Nachricht um sie als gelesen zu markieren
                        message_elements[-1].click()
                        break
                except Exception:
                    continue
                
        except Exception as e:
            logger.error(f"Error marking message as read: {e}")
    
    async def start_monitoring(self):
        """Startet die Nachrichtenüberwachung"""
        if not self.is_connected:
            logger.error("Cannot start monitoring - not connected")
            return False
        
        self.running = True
        logger.info("Starting message monitoring...")
        
        # Starte Monitoring als asyncio Task
        asyncio.create_task(self._monitor_messages())
        
        return True
    
    async def stop_monitoring(self):
        """Stoppt die Nachrichtenüberwachung"""
        self.running = False
        logger.info("Message monitoring stopped")
    
    async def process_incoming_message(self, message_data: Dict[str, Any]):
        """Verarbeitet eine eingehende Nachricht"""
        try:
            # Aktualisiere Status
            self.last_activity = 'Message received'
            self.message_count += 1
            
            # Speichere Nachricht in der Historie
            message_info = {
                'sender': message_data.get('sender', 'Unknown'),
                'message': message_data.get('message', ''),
                'timestamp': time.time(),
                'time_str': time.strftime('%H:%M:%S')
            }
            self.last_messages.append(message_info)
            
            # Behalte nur die letzten 10 Nachrichten
            if len(self.last_messages) > 10:
                self.last_messages = self.last_messages[-10:]
            
            print(f"📨 Neue Nachricht von {message_info['sender']}: {message_info['message']}")
            print(f"   Zeit: {message_info['time_str']}")
            
            # Ignoriere eigene Nachrichten
            if message_data.get('is_own', False):
                print("   ℹ️ Eigene Nachricht - ignoriert")
                return
            
            # Verarbeite Nachricht mit Agent Core falls verfügbar
            if self.agent_core:
                try:
                    print("   🤖 Verarbeite mit Agent Core...")
                    # Hier könnte die Agent Core Logik implementiert werden
                    response = f"Nachricht erhalten: {message_data.get('message', '')}"
                    print(f"   💬 Antwort: {response}")
                except Exception as e:
                    print(f"   ❌ Agent Core Fehler: {e}")
                    self.error_count += 1
            else:
                print("   ℹ️ Kein Agent Core verfügbar")
                
        except Exception as e:
            print(f"❌ Fehler bei der Nachrichtenverarbeitung: {e}")
            self.error_count += 1
            logger.error(f"Error processing message: {e}")
    
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
        status = {
            'connected': self.is_connected,
            'monitoring': self.monitoring_task is not None and not self.monitoring_task.done(),
            'driver_active': self.driver is not None,
            'last_activity': getattr(self, 'last_activity', 'Unknown'),
            'message_count': getattr(self, 'message_count', 0),
            'error_count': getattr(self, 'error_count', 0)
        }
        
        # Füge Details über den Browser hinzu
        if self.driver:
            try:
                current_url = self.driver.current_url
                status['current_url'] = current_url
                
                # Prüfe ob WhatsApp Web geladen ist
                if 'web.whatsapp.com' in current_url:
                    if 'send?' in current_url:
                        status['page'] = 'chat_page'
                    elif 'web.whatsapp.com' == current_url.rstrip('/'):
                        status['page'] = 'main_page'
                    else:
                        status['page'] = 'other_page'
                else:
                    status['page'] = 'unknown'
                    
            except Exception as e:
                status['browser_error'] = str(e)
        
        # Füge Informationen über empfangene Nachrichten hinzu
        if hasattr(self, 'last_messages') and self.last_messages:
            status['last_messages'] = self.last_messages[-3:]  # Letzte 3 Nachrichten
        else:
            status['last_messages'] = []
            
        # Füge Verbindungsdetails hinzu
        if self.is_connected:
            status['status_text'] = "✅ WhatsApp verbunden und bereit"
        elif self.driver:
            status['status_text'] = "⏳ Browser läuft, warte auf Login..."
        else:
            status['status_text'] = "❌ Bot nicht initialisiert"
            
        return status
    
    def is_healthy(self) -> bool:
        """Überprüft ob der Bot gesund ist"""
        return (
            self.is_connected and 
            self.driver is not None and
            self.monitoring_task is not None and not self.monitoring_task.done()
        )
