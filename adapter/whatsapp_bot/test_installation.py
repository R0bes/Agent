"""
Test-Skript für WhatsApp Bot Installation
Überprüft ob alle Abhängigkeiten korrekt installiert sind
"""

import sys
import importlib

def test_imports():
    """Testet alle benötigten Imports"""
    print("Testing WhatsApp Bot Dependencies...")
    print("=" * 50)
    
    required_modules = [
        'selenium',
        'seleniumwire',
        'pywhatkit',
        'qrcode',
        'PIL',
        'webdriver_manager'
    ]
    
    failed_imports = []
    
    for module in required_modules:
        try:
            importlib.import_module(module)
            print(f"✅ {module}")
        except ImportError as e:
            print(f"❌ {module}: {e}")
            failed_imports.append(module)
    
    print("\n" + "=" * 50)
    
    if failed_imports:
        print(f"❌ {len(failed_imports)} imports failed:")
        for module in failed_imports:
            print(f"   - {module}")
        print("\nInstallation command:")
        print("pip install -r requirements.txt")
        return False
    else:
        print("✅ All dependencies installed successfully!")
        return True

def test_agent_imports():
    """Testet Agent-spezifische Imports"""
    print("\nTesting Agent Dependencies...")
    print("=" * 50)
    
    try:
        # Füge Projektpfad hinzu
        import os
        import sys
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        sys.path.append(project_root)
        
        # Teste Agent Imports
        from agent.core import Core
        print("✅ agent.core.Core")
        
        from agent.utils.log import get_logger
        print("✅ agent.utils.log.get_logger")
        
        print("✅ All agent dependencies available!")
        return True
        
    except ImportError as e:
        print(f"❌ Agent import failed: {e}")
        return False

def test_bot_creation():
    """Testet Bot-Erstellung"""
    print("\nTesting Bot Creation...")
    print("=" * 50)
    
    try:
        # Füge Projektpfad hinzu
        import os
        import sys
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        sys.path.append(project_root)
        
        from adapter.whatsapp_bot import SimpleWhatsAppBot, ImprovedWhatsAppBot
        from agent.core import Core
        
        # Teste Bot-Erstellung
        agent_core = Core()
        
        simple_bot = SimpleWhatsAppBot(agent_core=agent_core)
        print("✅ SimpleWhatsAppBot created")
        
        improved_bot = ImprovedWhatsAppBot(agent_core=agent_core)
        print("✅ ImprovedWhatsAppBot created")
        
        print("✅ All bots can be created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Bot creation failed: {e}")
        return False

def main():
    """Hauptfunktion für Installationstest"""
    print("WhatsApp Bot Installation Test")
    print("=" * 50)
    
    # Teste alle Imports
    deps_ok = test_imports()
    agent_ok = test_agent_imports()
    bot_ok = test_bot_creation()
    
    print("\n" + "=" * 50)
    print("SUMMARY:")
    print(f"Dependencies: {'✅ OK' if deps_ok else '❌ FAILED'}")
    print(f"Agent Imports: {'✅ OK' if agent_ok else '❌ FAILED'}")
    print(f"Bot Creation: {'✅ OK' if bot_ok else '❌ FAILED'}")
    
    if deps_ok and agent_ok and bot_ok:
        print("\n🎉 All tests passed! WhatsApp Bot is ready to use.")
        print("\nNext steps:")
        print("1. Run: python adapter/whatsapp_bot/example_usage.py")
        print("2. Follow the instructions to scan QR code")
        print("3. Start chatting with your bot!")
    else:
        print("\n❌ Some tests failed. Please fix the issues above.")
        print("\nCommon solutions:")
        print("1. Install dependencies: pip install -r requirements.txt")
        print("2. Make sure you're in the project root directory")
        print("3. Check if Chrome/Chromium is installed")

if __name__ == "__main__":
    main()
