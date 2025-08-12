import requests
import math
import lmstudio as lms

def ollama_generate(prompt, model="llama3", host="http://localhost:11434"):
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False
    }
    response = requests.post(f"{host}/api/generate", json=payload)
    data = response.json()
    return data["response"]

# Beispielaufruf
#result = ollama_generate("Erkläre Quantenverschränkung in einfachen Worten.")
#print(result)


model = lms.llm("openai/gpt-oss-20b")
model.respond("Erkläre Quantenverschränkung in einfachen Worten.", on_message=print)

