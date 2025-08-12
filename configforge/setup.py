from setuptools import setup, find_packages

setup(
    name="configforge",
    version="0.1.0",
    author="Robs",
    author_email="",
    description="A standardized configuration management library with schema validation, TOML/.env/argparse integration, and on_config_change callbacks.",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    python_requires='>=3.8',
    install_requires=[
        "pydantic",
        "toml"
    ],
)