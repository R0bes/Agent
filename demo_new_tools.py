#!/usr/bin/env python3
"""
Demo script showing agent usage with new tools.
"""

import asyncio
from agent.core.core import Core
from agent.utils.log import setup_logging

async def demo_new_tools():
    """Demonstrate agent usage with new tools."""
    setup_logging(debug=True)
    
    print("🤖 Initializing Agent with new tools...")
    core = Core()
    
    # Test queries that should trigger new tool usage
    test_queries = [
        "Execute this Python code: print('Hello World'); x = [1,2,3,4,5]; print(f'Sum: {sum(x)}')",
        "What's the current system time and date?",
        "Show me the system memory usage",
        "Check the recent log entries for any errors"
    ]
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n🔍 Test {i}: {query}")
        print("=" * 60)
        
        try:
            result = await core.ask(query)
            print(f"✅ Result: {result}")
        except Exception as e:
            print(f"❌ Error: {e}")
        
        print("-" * 60)

if __name__ == "__main__":
    asyncio.run(demo_new_tools())
