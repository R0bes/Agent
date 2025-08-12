# agent/utils/config.py
from configforge import ConfigSchema, ConfigManager, load_env_vars, parse_args
from pydantic import Field
import os

class AppConfig(ConfigSchema):
    app_name: str = Field(default="AgentApp")
    env: str = Field(default="dev")  # dev, test, prod
    debug: bool = Field(default=False)
    llm_provider: str = Field(default="auto")  # auto, ollama, lmstudio
    llm_base_url: str = Field(default="http://localhost:11434")
    llm_model: str = Field(default="gpt-oss:20b")

# Globale ConfigManager-Instanz
CONFIG_PATH = os.environ.get("AGENT_CONFIG_PATH", "config.toml")
config_manager = ConfigManager(AppConfig, CONFIG_PATH)

# Load env + CLI overrides
env_vars = load_env_vars()

# Normalize selected env vars into our schema keys
normalized_env = {}
if "AGENT_ENV" in env_vars:
    normalized_env["env"] = env_vars["AGENT_ENV"]
if "LLM_PROVIDER" in env_vars:
    normalized_env["llm_provider"] = env_vars["LLM_PROVIDER"]
if "LLM_BASE_URL" in env_vars:
    normalized_env["llm_base_url"] = env_vars["LLM_BASE_URL"]
if "LLM_MODEL" in env_vars:
    normalized_env["llm_model"] = env_vars["LLM_MODEL"]
if "DEBUG" in env_vars:
    val = str(env_vars["DEBUG"]).lower()
    normalized_env["debug"] = val in ("1", "true", "yes", "on")

cli_args = parse_args({
    "debug": {"help": "Enable debug mode", "action": "store_true"},
    "env": {"help": "Environment: dev/test/prod", "choices": ["dev", "test", "prod"], "default": None},
})

# Remove None values from CLI args so they don't overwrite defaults
cli_args = {k: v for k, v in cli_args.items() if v is not None}

merged = {**config_manager.config.dict(), **normalized_env, **cli_args}
config_manager.update(**merged)

# If env=test and debug not explicitly set by CLI, enforce debug=True
if config_manager.config.env == "test" and ("debug" not in cli_args and "DEBUG" not in env_vars):
    config_manager.update(debug=True)

config = config_manager.config
