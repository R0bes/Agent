#!/usr/bin/env python3
"""
Test script for tool usage through the Agent API
"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_tool_usage():
    """Test tool usage through the think endpoint"""
    print("Testing tool usage...")
    
    # Test query that should trigger tool usage
    test_query = "Lies die Datei 'data/mila.txt' und fasse den Inhalt zusammen."
    
    payload = {
        "query": test_query,
        "allow_subtasks": True,
        "max_subtask_depth": 3
    }
    
    try:
        print(f"Sending query: {test_query}")
        response = requests.post(f"{BASE_URL}/think", json=payload)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Check if tools were used
            if "metadata" in data and data["metadata"]:
                print("✅ Tool usage detected in metadata")
            else:
                print("ℹ️ No tool usage metadata found")
                
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Request failed: {e}")
        return False

def test_system_info_tool():
    """Test system info tool specifically"""
    print("\nTesting system info tool...")
    
    test_query = "Zeige mir die aktuellen Systeminformationen."
    
    payload = {
        "query": test_query,
        "allow_subtasks": True,
        "max_subtask_depth": 2
    }
    
    try:
        print(f"Sending query: {test_query}")
        response = requests.post(f"{BASE_URL}/think", json=payload)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Request failed: {e}")
        return False

if __name__ == "__main__":
    print("Starting tool usage tests...")
    print("Make sure the FastAPI server is running on http://localhost:8000")
    print("=" * 60)
    
    # Wait a moment for server to be ready
    time.sleep(2)
    
    # Run tests
    tool_usage_ok = test_tool_usage()
    system_info_ok = test_system_info_tool()
    
    print("\n" + "=" * 60)
    print("Tool Usage Test Results:")
    print(f"File reading tool: {'✓' if tool_usage_ok else '✗'}")
    print(f"System info tool: {'✓' if system_info_ok else '✗'}")
    
    if all([tool_usage_ok, system_info_ok]):
        print("\n🎉 All tool usage tests passed!")
    else:
        print("\n❌ Some tool usage tests failed!")
