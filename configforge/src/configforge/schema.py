# configforge/src/schema.py
from pydantic import BaseModel
from typing import Any, Callable, Optional, List
import toml
import os

class ConfigSchema(BaseModel):
    """Base schema definition for configuration."""
    class Config:
        extra = "forbid"

class ConfigManager:
    def __init__(self, schema: type[ConfigSchema], config_path: str):
        self.schema_cls = schema
        self.config_path = config_path
        self.callbacks: List[Callable[[ConfigSchema], None]] = []
        self._config: Optional[ConfigSchema] = None
        self.load()

    def load(self):
        if os.path.exists(self.config_path):
            data = toml.load(self.config_path)
            self._config = self.schema_cls(**data)
        else:
            self._config = self.schema_cls()
            self.save()
        self._trigger_callbacks()

    def save(self):
        with open(self.config_path, "w") as f:
            toml.dump(self._config.dict(), f)

    def on_change(self, callback: Callable[[ConfigSchema], None]):
        self.callbacks.append(callback)

    def update(self, **kwargs: Any):
        new_data = self._config.dict()
        new_data.update(kwargs)
        self._config = self.schema_cls(**new_data)
        self.save()
        self._trigger_callbacks()

    def _trigger_callbacks(self):
        for cb in self.callbacks:
            cb(self._config)

    @property
    def config(self) -> ConfigSchema:
        return self._config
