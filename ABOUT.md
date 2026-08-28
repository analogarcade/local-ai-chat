# About Local AI Chat

Local AI Chat is a small, private browser chat interface for an Ollama model running on your own computer. It is designed to feel familiar like ChatGPT or Claude while keeping the implementation easy to understand and operate locally.

## Principles

- Chat is the only focus.
- The browser talks to Express, never directly to Ollama.
- No cloud API key, database, account, or analytics is required.
- System light/dark preferences are respected automatically.
- Errors are presented clearly without exposing stack traces.

## Scope

This project is a local single-user interface. It sends the submitted message to the configured Ollama model and returns the model’s response. Conversations intentionally start fresh on page reload.
