#!/usr/bin/env python3
"""
Test script for LLM provider interfaces
Tests if the configured LLM providers are reachable and working correctly
"""

import asyncio
import sys
import os

# Add the agent directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'agent'))

from agent.llm_engine.manager import llm_manager
from agent.llm_engine.providers.ollama_provider import OllamaProvider
from agent.llm_engine.providers.lm_studio_provider import LMStudioProvider
from agent.utils.config import config

async def test_ollama_provider():
    """Test Ollama provider connectivity"""
    print("🔍 Testing Ollama provider...")
    
    try:
        provider = OllamaProvider("http://localhost:11434")
        
        # Test server connectivity
        is_connected = await provider.check_server()
        print(f"   Server reachable: {'✅' if is_connected else '❌'}")
        
        if is_connected:
            # Test model listing
            models = await provider.list_models()
            print(f"   Available models: {len(models)}")
            for model in models[:3]:  # Show first 3 models
                print(f"     - {model.get('name', 'unknown')}")
            
            # Test simple generation
            try:
                response = await provider.generate("gpt-oss:20b", "Hello, how are you?", max_tokens=10)
                print(f"   Generation test: ✅ (Response length: {len(response)})")
            except Exception as e:
                print(f"   Generation test: ❌ ({e})")
        else:
            print("   ⚠️  Ollama server not reachable at http://localhost:11434")
            
    except Exception as e:
        print(f"   ❌ Error testing Ollama: {e}")

async def test_lmstudio_provider():
    """Test LM Studio provider connectivity"""
    print("🔍 Testing LM Studio provider...")
    
    try:
        provider = LMStudioProvider("http://localhost:1234")
        
        # Test server connectivity
        is_connected = await provider.check_server()
        print(f"   Server reachable: {'✅' if is_connected else '❌'}")
        
        if is_connected:
            # Test model listing
            models = await provider.list_models()
            print(f"   Available models: {len(models)}")
            for model in models[:3]:  # Show first 3 models
                print(f"     - {model.get('id', 'unknown')}")
            
            # Test simple generation
            try:
                response = await provider.generate("default", "Hello, how are you?", max_tokens=10)
                print(f"   Generation test: ✅ (Response length: {len(response)})")
            except Exception as e:
                print(f"   Generation test: ❌ ({e})")
        else:
            print("   ⚠️  LM Studio server not reachable at http://localhost:1234")
            
    except Exception as e:
        print(f"   ❌ Error testing LM Studio: {e}")

async def test_llm_manager():
    """Test LLM manager functionality"""
    print("🔍 Testing LLM Manager...")
    
    try:
        # List available models
        models = llm_manager.list_available_models()
        print(f"   Registered models: {len(models)}")
        for model_key in models:
            print(f"     - {model_key}")
        
        # Test auto-registration
        print("   Testing auto-registration...")
        try:
            # Try to get a model (this should auto-register if not exists)
            model = llm_manager.get("ollama:test-model")
            print(f"     Auto-registration: ✅ ({type(model).__name__})")
        except Exception as e:
            print(f"     Auto-registration: ❌ ({e})")
            
    except Exception as e:
        print(f"   ❌ Error testing LLM Manager: {e}")

async def test_config():
    """Test configuration settings"""
    print("🔍 Testing Configuration...")
    
    print(f"   LLM Provider: {config.llm_provider}")
    print(f"   LLM Base URL: {config.llm_base_url}")
    print(f"   LLM Model: {config.llm_model}")
    print(f"   Environment: {config.env}")
    print(f"   Debug: {config.debug}")

async def main():
    """Main test function"""
    print("🚀 LLM Provider Interface Test")
    print("=" * 50)
    
    # Test configuration
    await test_config()
    print()
    
    # Test individual providers
    await test_ollama_provider()
    print()
    
    await test_lmstudio_provider()
    print()
    
    # Test LLM manager
    await test_llm_manager()
    print()
    
    print("✅ Test completed!")

if __name__ == "__main__":
    asyncio.run(main())
