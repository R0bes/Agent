
import argparse
import os

def load_env_vars(prefix: str = "") -> dict:
    """Load environment variables optionally filtered by prefix."""
    env_vars = {}
    for k, v in os.environ.items():
        if prefix:
            if k.startswith(prefix):
                env_vars[k[len(prefix):]] = v
        else:
            env_vars[k] = v
    return env_vars

def parse_args(args_def: dict) -> dict:
    """Parse command-line arguments based on provided definition.

    Uses parse_known_args to ignore unknown CLI flags (e.g., when embedded in other CLIs like uvicorn).
    """
    parser = argparse.ArgumentParser(add_help=False)
    for arg, opts in args_def.items():
        parser.add_argument(f"--{arg}", **opts)
    known, _unknown = parser.parse_known_args()
    return vars(known)
