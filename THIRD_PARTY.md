Third-Party Components
======================

Piper TTS (planned)
-------------------
- License: GPL-3.0-only
- Source: https://github.com/rhasspy/piper
- Usage: Runs as a separate sidecar service (HTTP or CLI). Not bundled with this repository. When enabled, the backend connects to Piper over HTTP or invokes the `piper` binary. This separation ensures license boundaries are respected.

OpenAI TTS
----------
- Terms: https://openai.com/policies
- Usage: Accessed via OpenAI API for text-to-speech. See environment variables in `.env.example` for configuration.

