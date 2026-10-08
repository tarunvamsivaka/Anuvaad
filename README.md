# Anuvaad: AI Code Translation & Repository Modernization Platform

Anuvaad is a high-performance, developer-grade code translation and codebase understanding platform engineered for modernizing legacy codebases with **Deterministic Tree-sitter AST boundary verification**, **Verifiable Zero Code Retention (ZDR)**, and **Cross-File Symbol Contract Memory**.

---

## Key Highlights

- **Deterministic AST Syntax Boundary Validation**: Every translated function/class is checked using Tree-sitter 0.23 (`node.has_error == False`) before output serialization, eliminating malformed code.
- **Verifiable Zero Code Retention (ZDR)**: Source code inputs stream exclusively through transient RAM buffers. Every translation generates a deterministic HMAC-SHA256 audit digest (`sha256(secret, user_id + timestamp + code_hash)`).
- **Multi-File Topological Dependency DAG**: Ingests multi-file repositories, maps cross-module import paths, resolves circular dependencies, and translates base models/types before dependent consumer services.
- **Cross-File Symbol Contract Memory (`pgvector`)**: Integrates with Supabase PostgreSQL `repo_embeddings` using vector similarity to dynamically inject translated interface signatures into dependent file translation prompts.
- **Compiler-Guided Coordinate Self-Healing**: Automatically extracts Tree-sitter row/col syntax error frames and feeds surgical repair directives back into the inference tier until clean.
- **3-Column Enterprise IDE Workspace**: Modern developer console built with Next.js 16.3, React 19.2, and Tailwind v4 adhering to the Wispr Flow dark aesthetic and WCAG 2.2 AA accessibility standards.
- **Zero-Budget Operational Discipline ($0.00 / month)**: Operates entirely on free-tier infrastructure (Supabase PostgreSQL, Upstash Redis, Cerebras Cloud LPU, Google Gemini 2.0 Flash).

---

## Architectural Stack

```
Anuvaad Platform
├── Backend (FastAPI 0.139, Python 3.12, Pydantic V2)
│   ├── app/services/ast_parser.py      # Tree-sitter 0.23 AST parser & boundary validator
│   ├── app/services/zdr_receipt.py     # Cryptographic HMAC-SHA256 audit engine
│   ├── app/services/repo_ingestion.py  # Topological dependency DAG engine
│   ├── app/services/vector_memory.py   # pgvector cross-file symbol memory
│   ├── app/services/ai_gateway.py      # Multi-tier gateway with self-healing loop
│   └── app/core/database.py            # SQLAlchemy 2.0 asyncpg with keyset pagination
└── Frontend (Next.js 16.3, React 19.2, Tailwind CSS v4)
    ├── src/components/editor/          # Monaco dual-pane split diff editor
    ├── src/components/workspace/       # 3-column IDE (GlobalSidebar, ContextFileTree, SymbolGraphView, AuditLedgerView)
    ├── src/components/zdr/             # Cryptographic ZDR receipt verification modal
    └── src/stores/translationStore.ts  # Zustand reactive client store
```

---

## Quickstart

### 1. Backend Service
```bash
# Install dependencies
pip install -r requirements.txt

# Start backend with Scalar interactive docs
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Frontend Workspace
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the developer workspace.

---

## Automated Verification

```bash
# Run backend test suite
pytest tests/ -v

# Run frontend tests
cd frontend
npm run test
```

---

## License
MIT License. Created by Antigravity Platform Engineering.
