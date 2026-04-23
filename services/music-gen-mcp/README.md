# Music Gen MCP

Standalone MCP server for Chat UI that generates music clips with a Hugging Face music model and serves the resulting audio over HTTP.

## What It Exposes

- `generate_music`: turns a music prompt into an audio clip
- `/mcp`: stateless MCP endpoint for Chat UI
- `/media/<file>`: public audio hosting for generated clips
- `/healthcheck`: Railway health endpoint

The tool returns:

- `audio_url`
- `chat_ui_markdown`
- `mime_type`
- `model`

The `chat_ui_markdown` field is designed for Chat UI's markdown renderer:

```md
![Generated music](https://your-service/media/clip.wav)
```

That renders as an inline audio player in this repo's chat UI.

## Environment

Copy `.env.example` and set:

- `HUGGINGFACE_API_KEY`: required
- `MUSIC_MODEL_ID`: default Hugging Face model ID
- `PUBLIC_BASE_URL`: public base URL used in returned `audio_url` values
- `HF_ENDPOINT_URL`: optional dedicated Hugging Face Inference Endpoint
- `PORT`: default `3000`

## Local Run

```bash
cd services/music-gen-mcp
npm install
npm run dev
```

Health check:

```bash
curl http://localhost:3000/healthcheck
```

## Railway

Create a separate Railway service with its root directory set to:

```text
services/music-gen-mcp
```

Set these Railway variables:

- `HUGGINGFACE_API_KEY`
- `MUSIC_MODEL_ID`
- `PUBLIC_BASE_URL`

If Railway provides `RAILWAY_PUBLIC_DOMAIN`, the service can derive its public URL automatically, but setting `PUBLIC_BASE_URL` explicitly is safer.

## Chat UI Wiring

Once deployed, add the MCP server URL to Chat UI:

```env
MCP_SERVERS=[
  {"name":"Music Gen","url":"https://your-music-gen-service.up.railway.app/mcp"}
]
```

Then enable the server in Chat UI's MCP Servers panel.

## Notes

- The service stores generated audio files under `storage/generated`.
- For production, attach persistent storage or move finished files to object storage.
- The default model in this scaffold is `facebook/musicgen-small`, but you can override it per deployment or per tool call.
