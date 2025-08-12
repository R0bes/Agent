#!/usr/bin/env python3
"""Test script for the new tools."""

import asyncio
from agent.tool_engine import ToolRegistry

async def test_new_tools():
    registry = ToolRegistry()
    
    print("🔧 Available tools:")
    for tool_name in registry.list_tools():
        print(f"  - {tool_name}")
    
    print("\n🧪 Testing new tools...")
    
    # Test Code Execution
    print("\n1. Testing Code Execution:")
    code_tool = registry.get_tool("execute_code")
    if code_tool:
        result = await code_tool({"code": "print('Hello from code execution!'); x = 5 + 3; print(f'Result: {x}')"})
        print(f"✅ Result: {result[:200]}...")
    
    # Test System Info
    print("\n2. Testing System Info:")
    system_tool = registry.get_tool("system_info")
    if system_tool:
        result = await system_tool({"info_type": "datetime"})
        print(f"✅ Result: {result[:200]}...")
    
    # Test Log Access
    print("\n3. Testing Log Access:")
    log_tool = registry.get_tool("log_access")
    if log_tool:
        result = await log_tool({"lines": 10})
        print(f"✅ Result: {result[:200]}...")
    
    print("\n📋 Tool Schemas:")
    schemas = registry.get_tool_schemas()
    for schema in schemas:
        print(f"  - {schema['name']}: {schema['description'][:50]}...")

if __name__ == "__main__":
    asyncio.run(test_new_tools())
