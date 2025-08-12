import requests
import json


def ollama_stream(prompt, model="llama3", host="http://localhost:11434"):
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": True
    }
    response = requests.post(f"{host}/api/generate", json=payload, stream=True)
    for line in response.iter_lines():
        if line:
            data = json.loads(line.decode())
            print(data["response"], end="", flush=True)  # Ausgabe Stück für Stück

# Beispielaufruf
ollama_stream("Erzähle einen kurzen, nerdigen Witz.")