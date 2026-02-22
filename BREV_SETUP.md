# Brev + NIM Setup Guide for Nootes

Step-by-step guide to deploy Nemotron models on NVIDIA Brev and connect them to the Nootes backend.

---

## Step 1: Install Brev CLI

```bash
# macOS
brew install brevdev/homebrew-brev/brev

# Linux
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/brevdev/brev-cli/main/bin/install-latest.sh)"
```

Then log in:

```bash
brev login
```

This opens a browser window to authenticate.

---

## Step 2: Get your NVIDIA NGC API Key

You need this to pull NIM container images from NVIDIA's registry.

1. Go to **[build.nvidia.com](https://build.nvidia.com)**
2. Sign in (or create an NVIDIA developer account)
3. Click your avatar → **Setup** → **Keys/Secrets**
4. Click **Generate Personal Key**
5. Enable permissions: **Catalog**, **Registry**, **Build**
6. **Copy and save the key** (`nvapi-...`) — you'll need it in Step 4

---

## Step 3: Launch a GPU Instance

### Option A: Via Brev Console (easiest)

1. Go to **[console.brev.dev](https://console.brev.dev)** → **Instances** tab
2. Click **New +**
3. Configure:
   - **Mode:** VM Mode
   - **GPU:** H100 80GB (fits all 4 models in bf16 on a single GPU)
   - **Name:** `nootes-nim`
4. Click **Deploy** — wait ~2-3 min until status shows **Running**

### Option B: Via CLI

```bash
brev create nootes-nim --gpu H100
```

---

## Step 4: SSH In and Set Up Docker

```bash
# Connect to your instance
brev shell nootes-nim
```

Once inside the VM:

```bash
# Set your NGC API key
export NGC_CLI_API_KEY="nvapi-your-key-here"
echo "export NGC_CLI_API_KEY=$NGC_CLI_API_KEY" >> ~/.bashrc

# Log into NVIDIA container registry
echo "$NGC_CLI_API_KEY" | docker login nvcr.io --username '$oauthtoken' --password-stdin

# Verify GPU is visible
docker run --rm --runtime=nvidia --gpus all ubuntu nvidia-smi
```

You should see your L40S/H100 listed.

---

## Step 5: Deploy NIM Containers

Create a local cache directory for model weights:

```bash
export LOCAL_NIM_CACHE=~/.cache/nim
mkdir -p "$LOCAL_NIM_CACHE"
```

### 5a: Nano 8B (merge model)

```bash
docker run -d --name nim-nano \
  --runtime=nvidia --gpus '"device=0"' \
  -e NGC_API_KEY="$NGC_CLI_API_KEY" \
  -v "$LOCAL_NIM_CACHE:/opt/nim/.cache" \
  -p 8001:8000 \
  nvcr.io/nim/nvidia/llama-3.1-nemotron-nano-8b-v1:latest
```

### 5b: Content Safety 4B (moderation)

```bash
docker run -d --name nim-safety \
  --runtime=nvidia --gpus '"device=0"' \
  -e NGC_API_KEY="$NGC_CLI_API_KEY" \
  -v "$LOCAL_NIM_CACHE:/opt/nim/.cache" \
  -p 8002:8000 \
  nvcr.io/nim/nvidia/nemotron-content-safety-reasoning-4b:latest
```

### 5c: Embed VL 1B (embeddings)

```bash
docker run -d --name nim-embed \
  --runtime=nvidia --gpus '"device=0"' \
  -e NGC_API_KEY="$NGC_CLI_API_KEY" \
  -v "$LOCAL_NIM_CACHE:/opt/nim/.cache" \
  -p 8003:8000 \
  nvcr.io/nim/nvidia/llama-nemotron-embed-vl-1b-v2:latest
```

### 5d: Super 49B (graph agent)

```bash
docker run -d --name nim-graph \
  --runtime=nvidia --gpus '"device=0"' \
  -e NGC_API_KEY="$NGC_CLI_API_KEY" \
  -v "$LOCAL_NIM_CACHE:/opt/nim/.cache" \
  -p 8004:8000 \
  nvcr.io/nim/nvidia/llama-3.3-nemotron-super-49b-v1:latest
```

---

## Step 6: Verify Models are Running

Wait 2-5 min for models to load weights, then test each:

```bash
# Check which models are loaded
curl http://localhost:8001/v1/models  # nano
curl http://localhost:8002/v1/models  # safety
curl http://localhost:8003/v1/models  # embed
curl http://localhost:8004/v1/models  # graph (if same instance)

# Test a chat completion
curl http://localhost:8001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nvidia/llama-3.1-nemotron-nano-8b-v1",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 32
  }'
```

---

## Step 7: Enable Brev Tunnels

This exposes your NIM endpoints publicly so your backend can reach them.

1. Go to **[console.brev.dev](https://console.brev.dev)** → click your **nootes-nim** instance
2. Go to the **Access** tab
3. Under **Tunnels**, enable tunnels for each port:
   - Port `8001` → you'll get a URL like `https://abc123-8001.brev.dev`
   - Port `8002` → `https://abc123-8002.brev.dev`
   - Port `8003` → `https://abc123-8003.brev.dev`
   - Port `8004` → `https://abc123-8004.brev.dev`
4. Copy each tunnel URL

---

## Step 8: Update your `.env`

In `Frontend/.env`, set the tunnel URLs (one per container port):

```env
NVIDIA_NIM_API_KEY=nvapi-your-key-here

# Per-model base URLs (Brev tunnel URLs)
NIM_MERGE_BASE_URL=https://abc123-8001.brev.dev
NIM_MODERATE_BASE_URL=https://abc123-8002.brev.dev
NIM_EMBED_BASE_URL=https://abc123-8003.brev.dev
NIM_GRAPH_BASE_URL=https://abc123-8004.brev.dev
```

---

## Step 9: Test End-to-End

```bash
# Test moderation through your backend
curl -X POST http://localhost:3001/api/moderate \
  -H "Content-Type: application/json" \
  -d '{"message": "Can someone help me with eigenvalues?"}'

# Test graph generation
curl -X POST http://localhost:3001/api/prompt \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Build a todo app"}]}'

# Test merge (needs master + fork docs to exist)
curl -X POST http://localhost:3001/api/repos/math-ua-140/merge
```

---

## Quick Reference

| Container | Port | Tunnel URL | Model |
|-----------|------|------------|-------|
| nim-nano | 8001 | `https://...-8001.brev.dev` | llama-3.1-nemotron-nano-8b-v1 |
| nim-safety | 8002 | `https://...-8002.brev.dev` | nemotron-content-safety-reasoning-4b |
| nim-embed | 8003 | `https://...-8003.brev.dev` | llama-nemotron-embed-vl-1b-v2 |
| nim-graph | 8004 | `https://...-8004.brev.dev` | llama-3.3-nemotron-super-49b-v1 |

## Shutting Down

```bash
# Stop all containers (stop billing for compute)
docker stop nim-nano nim-safety nim-embed nim-graph

# Or stop the entire Brev instance
brev stop nootes-nim
```

**Remember to stop your Brev instance when not in use to avoid charges!**
