
from configforge.src.configforge.schema import ConfigSchema, ConfigManager
from configforge.src.configforge.env_args import load_env_vars, parse_args
from pydantic import Field

class MyConfig(ConfigSchema):
    app_name: str = Field(default="ConfigForgeApp")
    debug: bool = Field(default=False)
    port: int = Field(default=8000)

def on_config_update(cfg: MyConfig):
    print("[CONFIG UPDATED]", cfg.model_dump())

if __name__ == "__main__":
    # Load from TOML
    cfg_manager = ConfigManager(MyConfig, "config.toml")
    cfg_manager.on_change(on_config_update)

    # Load from .env
    env_vars = load_env_vars()

    # Load from argparse
    cli_args = parse_args({
        "debug": {"help": "Enable debug mode", "action": "store_true"},
        "port": {"help": "Port to run the app", "type": int}
    })

    # Merge configurations
    merged = {**cfg_manager.config.dict(), **env_vars, **cli_args}
    cfg_manager.update(**merged)

    print("Final config:", cfg_manager.config.dict())
