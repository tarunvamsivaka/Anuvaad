# 🔄 Anuvaad — Code Translator

> **Translate code to plain English and back. Understand any codebase instantly.**

[![Python](https://img.shields.io/badge/Python-3.10+-3776ab?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.136.1-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Gemini](https://img.shields.io/badge/Gemini_AI-2.5_Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![License](https://img.shields.io/badge/License-MIT-amber?style=flat-square)](LICENSE)

**Anuvaad** (Sanskrit: अनुवाद — "translation") is an AI-powered developer tool that breaks the "black box" of code by translating raw programming syntax into beginner-friendly, block-by-block English explanations. It's fully bidirectional — edit the English descriptions, and the code updates automatically.

---

## ✨ Features

| Category | Features |
|---|---|
| **🔄 Translation** | Code → English, English → Code, Code → Code (cross-language) |
| **🎨 Editor** | CodeMirror 6 with syntax highlighting for 7 languages |
| **🌙 Themes** | Dark/light mode with system-aware toggle |
| **📦 Cards** | Collapsible translation blocks with code snippet preview |
| **🔍 Search** | Real-time card filtering with match highlighting |
| **🎯 Auto-Detect** | Language auto-detection from pasted code patterns |
| **🔗 Linking** | Double-click a card to locate its code in the editor |
| **⌨️ Shortcuts** | Full keyboard shortcut panel (`?` to view) |
| **📊 Stats** | Word count, reading time, code lines, function count |
| **📜 History** | Persistent translation history (50 items, localStorage) |
| **📤 Export** | Markdown, JSON, and PDF export |
| **⏳ Progress** | Animated progress bar during translation |
| **📱 PWA** | Installable as a Progressive Web App |
| **⚡ Performance** | Backend rate limiting (15 req/min) + LRU response cache |
| **💳 Usage Tiers** | Free (10/day) and Pro usage tracking |

## 🗣️ Supported Languages

Python · JavaScript · Java · C++ · TypeScript · Rust · Go

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+**
- **Gemini API Key** → [Get one free](https://aistudio.google.com/apikey)

### 1. Clone & Install

```bash
git clone https://github.com/your-username/anuvaad.git
cd anuvaad
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### 3. Start Backend

```bash
uvicorn main:app --reload --port 8000
```

### 4. Start Frontend

```bash
python -m http.server 5500
```

### 5. Open Browser

Navigate to **[http://127.0.0.1:5500](http://127.0.0.1:5500)**

---

## 🐳 Docker Deployment

```bash
# Build and run with one command
docker-compose up --build

# Access at http://localhost:5500
```

---

## 📁 Project Structure

```
anuvaad/
├── index.html              # Main SPA (single-page application)
├── js/                     # Frontend ES modules
│   ├── main.js             # Entry point — orchestrates all modules
│   ├── state.js            # Shared mutable state & constants
│   ├── editor.js           # CodeMirror 6 setup & abstraction
│   ├── cards.js            # Translation card rendering & editing
│   ├── auth.js             # Supabase auth & Stripe checkout
│   ├── history.js          # Translation history (localStorage)
│   ├── export.js           # Markdown/JSON/PDF export
│   ├── shortcuts.js        # Keyboard shortcut handler
│   ├── ui.js               # Theme, toasts, search, stats, resizer
│   └── detect.js           # Auto language detection
├── styles.css              # Design system (~2400 lines)
├── main.py                 # FastAPI backend with Gemini integration
├── sw.js                   # Service worker for PWA offline caching
├── manifest.json           # PWA manifest
├── icon-512.png            # App icon (512x512)
├── requirements.txt        # Python dependencies
├── Dockerfile              # Container build config
├── docker-compose.yml      # Multi-service orchestration
├── nginx.conf              # Production nginx configuration
├── robots.txt              # SEO crawler directives
├── sitemap.xml             # XML sitemap for search engines
├── LICENSE                 # MIT License
├── .env.example            # Environment template
├── .gitignore              # Git exclusions
├── .github/
│   └── workflows/
│       └── ci.yml          # GitHub Actions CI/CD pipeline
└── tests/
    ├── conftest.py         # Shared fixtures (mocked Gemini)
    ├── test_api.py         # API endpoint tests (15 tests)
    ├── test_validation.py  # Input validation & edge cases (12 tests)
    └── test_cache.py       # LRU cache & rate limiter tests (13 tests)
```

---

## 🔧 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/code-to-english` | Translate code → English blocks |
| `POST` | `/api/english-to-code` | Update code from modified English |
| `POST` | `/api/generate-from-english` | Generate code from English prompt |
| `POST` | `/api/code-to-code` | Translate code between languages |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/create-checkout-session` | Stripe Pro upgrade |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Enter` | Translate code |
| `Ctrl + Shift + D` | Toggle dark/light mode |
| `Ctrl + Shift + F` | Focus search bar |
| `Ctrl + Shift + H` | Open history sidebar |
| `Ctrl + Shift + E` | Expand/collapse all cards |
| `Escape` | Close modal / clear search |
| `?` | Show shortcuts panel |

---

## 🏗️ Architecture

```
┌─────────────────┐    HTTP/JSON    ┌─────────────────┐    SDK    ┌──────────┐
│   Frontend SPA  │ ◄────────────►  │   FastAPI API   │ ◄──────► │ Gemini   │
│  (Vanilla JS)   │                 │   (Python)      │          │ 2.5 Flash│
│  + CodeMirror 6 │                 │  + Rate Limit   │          └──────────┘
│  + PWA/SW       │                 │  + LRU Cache    │
└─────────────────┘                 │  + CORS         │
                                    └─────────────────┘
```

---

## 📝 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `STRIPE_SECRET_KEY` | ❌ | Stripe secret for Pro tier |
| `STRIPE_PRO_PRICE_ID` | ❌ | Stripe price ID for subscription |
| `FRONTEND_URL` | ❌ | Frontend origin for CORS (default: `http://127.0.0.1:5500`) |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Built with ❤️ and ☕ — Anuvaad: अनुवाद</strong>
</p>
