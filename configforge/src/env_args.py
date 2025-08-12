# configforge/src/env_args.py.py
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
    """Parse command-line arguments based on provided definition."""
    parser = argparse.ArgumentParser()
    for arg, opts in args_def.items():
        parser.add_argument(f"--{arg}", **opts)
    return vars(parser.parse_args())
