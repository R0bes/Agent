# Agents Troubleshooting Guide

## Issue: Agents Hanging in the Terminal

Sometimes the agents get stuck in the terminal for a few reasons:

### Interactive Commands
They run commands that require user input, and then they just hang waiting for input that won't come.

### Commands Not Exiting
Some commands themselves just hang, causing the whole process to freeze.

### Terminal Not Returning to Prompt
After a command finishes, the terminal doesn't return to a normal prompt automatically, so the agent just sits there until you press Enter.

## Solutions

### Use Non-Interactive Flags
Wherever possible, run commands in a non-interactive mode so they don't wait for input.

### Timeout Wrappers
Wrap commands with a timeout so if they hang, they just stop after a certain period.

### Address Terminal Return Issue
Investigate why the terminal doesn't return to a prompt. If needed, send a newline programmatically after the command finishes.
