# Architecture

```text
Browser
  │  POST /api/chat { message }
  ▼
Express server
  │  POST /api/chat
  ▼
Ollama at 127.0.0.1:11434
  │  { message: { content } }
  ▼
Express returns { reply }
```

The server owns the Ollama connection and configuration. The frontend only calls the local Express API. Static files are served by the same process, so the project has no build step or frontend framework.
