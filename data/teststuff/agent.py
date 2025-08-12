
import lmstudio as lms
from typing import Literal

SERVER_API_HOST = "localhost:1234"
lms.configure_default_client(SERVER_API_HOST)



def save_file(
    content: str,
    filename: str = "output.md",
    format: Literal["markdown", "txt"] = "markdown"
) -> str:
    """Save content to a local file.
    
    Args:
        content: The file content.
        filename: The file name (default: output.md).
        format: The file format, either 'markdown' or 'txt' (default: 'markdown').
    """
    if format == "markdown":
        filename = filename if filename.endswith(".md") else filename + ".md"
    elif format == "txt":
        filename = filename if filename.endswith(".txt") else filename + ".txt"
    else:
        raise ValueError("Unsupported format")
    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)
    return f"Saved to {filename}"

model = lms.llm("openai/gpt-oss-20b")

prompt = ("Zeige, dass ∃a∈R, (a^x) * d/dx = a^x. Verfasse ein kurzes, maximal einseitiges, wissenschaftliches Paper dazu. Du kannst markdownformatierung nutzen. Speichere dieses es als Datei ab.")

result = model.act( prompt, tools=[save_file], on_message=print)


response = model.respond(
    "Zeige, dass ∃a∈R, (a^x) * d/dx = a^x. Verfasse ein kurzes, maximal einseitiges, wissenschaftliches Paper dazu.",
    on_prompt_processing_progress = (lambda progress: print(f"{progress*100}% complete")),
)


#for fragment in result:
#    if hasattr(fragment, "content"):
#        print(fragment.content, end="", flush=True)
#    elif hasattr(fragment, "tool_call"):
#        print(f"\n[Tool Call]: {fragment.tool_call}\n")