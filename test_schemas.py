#!/usr/bin/env python3
"""Test script for tool schemas."""

from agent.tool_engine import ToolRegistry

def main():
    registry = ToolRegistry()
    print("Tool Schemas:")
    schemas = registry.get_tool_schemas()
    for schema in schemas:
        print(f"{schema['name']}: {schema['description']}")
    
    print("\nFormatted for planning:")
    print(registry.format_tool_list_for_planning())

if __name__ == "__main__":
    main()
