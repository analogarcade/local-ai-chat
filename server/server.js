const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = Number(process.env.PORT || 3000);
const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:1b';
const REQUEST_TIMEOUT_MS = 45_000;
const starterSets = [
  ['Explain Docker in simple terms', 'Help me brainstorm a project', 'Summarize a topic for me'],
  ['Write a simple workout plan', 'Teach me something surprising', 'Help me plan a productive day'],
  ['Explain how the internet works', 'Help me name a new project', 'Create a healthy dinner idea'],
  ['Review this idea with me', 'Write a friendly professional email', 'Compare two technologies for me'],
  ['Help me learn a new skill', 'Give me three book recommendations', 'What can I automate with JavaScript?']
];
let starterCursor = 0;

app.use(express.json({ limit: '1mb' }));
app.get('/', (_req, res) => {
  const [one, two, three] = starterSets[starterCursor++ % starterSets.length];
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8')
    .replace('Explain Docker in simple terms', one)
    .replace('Help me brainstorm a project', two)
    .replace('Summarize a topic for me', three);
  res.set('Cache-Control', 'no-store').type('html').send(html);
});
app.use(express.static(path.join(__dirname, '..', 'public'), { etag: false, maxAge: 0, setHeaders: response => response.set('Cache-Control', 'no-store') }));

async function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

app.post('/api/chat', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ error: 'Please enter a message.' });
  if (message.length > 12_000) return res.status(400).json({ error: 'Message is too long. Please keep it under 12,000 characters.' });

  try {
    const response = await fetchWithTimeout(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant.' },
          { role: 'user', content: message }
        ],
        stream: false
      })
    });
    let data;
    try { data = await response.json(); } catch { throw new Error('Ollama returned an invalid response.'); }
    if (!response.ok) return res.status(502).json({ error: data.error || 'Ollama could not process the message.' });
    if (typeof data.message?.content !== 'string') return res.status(502).json({ error: 'Ollama returned no usable reply.' });
    return res.json({ reply: data.message.content });
  } catch (error) {
    if (error.name === 'AbortError') return res.status(504).json({ error: 'Ollama took too long to respond. Please try again.' });
    return res.status(502).json({ error: 'Unable to connect to Ollama. Make sure Ollama is running locally.' });
  }
});

app.get('/api/health', async (_req, res) => {
  try {
    const response = await fetchWithTimeout(`${OLLAMA_URL}/api/tags`, {}, 3_000);
    res.json({ ok: true, ollama: response.ok, model: OLLAMA_MODEL });
  } catch {
    res.json({ ok: true, ollama: false, model: OLLAMA_MODEL });
  }
});

app.use((_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && error.status === 400) return res.status(400).json({ error: 'Invalid JSON request.' });
  console.error(error);
  return res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => console.log(`Local AI chat running at http://localhost:${PORT}`));
