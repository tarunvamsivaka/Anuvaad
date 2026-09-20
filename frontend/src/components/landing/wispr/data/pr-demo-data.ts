export interface PrFileEntry {
  id: string;
  filename: string;
  changes: string;
  risk: "Low" | "Medium" | "High";
  summary: string;
  diff: string;
  refactoredDiff?: string;
  generatedTests?: string;
  plainEnglishExplanation?: string;
}

export const PR_FILES: PrFileEntry[] = [
  {
    id: "auth-handler",
    filename: "src/auth/session_manager.ts",
    changes: "+28 -12",
    risk: "Low",
    summary:
      "Migrates session validation from monolithic in-memory store to distributed Redis token cache with asymmetric JWKS signature verification.",
    diff: `@@ -14,8 +14,14 @@ export async function validateSession(token: string) {
-  const session = memoryStore.get(token);
-  if (!session || session.expiresAt < Date.now()) return null;
+  const payload = await jwtVerify(token, JWKS_KEYSET);
+  const cached = await redis.get(\`session:\${payload.sub}\`);
+  if (!cached) throw new AuthenticationError("Session expired");
+  return { userId: payload.sub, tenant: payload.tenantId };
 }`,
    refactoredDiff: `@@ -14,8 +14,16 @@ export async function validateSession(token: string) {
+  // Anuvaad AI Refactor: Added constant-time token comparison and LRU local cache
+  const payload = await jwtVerify(token, JWKS_KEYSET, { algorithms: ['ES256', 'RS256'] });
+  const cached = await redis.get(\`session:\${payload.sub}\`);
+  if (!cached) throw new AuthenticationError("Session expired");
+  return { userId: payload.sub, tenant: payload.tenantId, verifiedAt: Date.now() };
 }`,
    generatedTests: `describe("SessionManager", () => {
  it("rejects expired token before contacting redis", async () => {
    await expect(validateSession("expired-token")).rejects.toThrow("Session expired");
  });
  it("validates signature with JWKS keyset and extracts tenantId", async () => {
    const res = await validateSession("valid-jwt");
    expect(res.tenant).toBe("tenant_42");
  });
});`,
    plainEnglishExplanation:
      "This change upgrades how user logins are validated. Instead of keeping sessions in a single server's local RAM (which caused users to get randomly logged out when servers restarted), it now securely checks digital signatures and caches sessions in a shared fast database (Redis).",
  },
  {
    id: "db-pool",
    filename: "src/database/pool_manager.go",
    changes: "+45 -8",
    risk: "Medium",
    summary:
      "Introduces connection pooling with exponential backoff retry and circuit breaker logic for high-concurrency read replicas.",
    diff: `@@ -42,6 +42,12 @@ func (p *Pool) Acquire(ctx context.Context) (*Conn, error) {
+    select {
+    case conn := <-p.idle:
+        return conn, nil
+    case <-time.After(p.timeout):
+        return nil, ErrPoolExhausted
+    }`,
    refactoredDiff: `@@ -42,6 +42,14 @@ func (p *Pool) Acquire(ctx context.Context) (*Conn, error) {
+    select {
+    case <-ctx.Done():
+        return nil, ctx.Err()
+    case conn := <-p.idle:
+        return conn, nil
+    case <-time.After(p.timeout):
+        return nil, ErrPoolExhausted
+    }`,
    generatedTests: `func TestPoolAcquireTimeout(t *testing.T) {
    p := NewPool(0, 10*time.Millisecond)
    ctx := context.Background()
    _, err := p.Acquire(ctx)
    if !errors.Is(err, ErrPoolExhausted) {
        t.Fatalf("expected ErrPoolExhausted, got %v", err)
    }
}`,
    plainEnglishExplanation:
      "This update prevents database overload under heavy traffic. When all database connections are busy, incoming requests wait safely up to a timeout limit instead of crashing or locking up the entire server.",
  },
  {
    id: "api-router",
    filename: "api/routes/translator.py",
    changes: "+19 -4",
    risk: "Low",
    summary:
      "Adds rate-limiting middleware and streaming SSE response formatting for low-latency client chunks.",
    diff: `@@ -88,4 +88,10 @@ async def stream_translation(request: Request):
+    async for chunk in translation_engine.stream(req.code):
+        yield f"data: {json.dumps(chunk)}\\n\\n"`,
    refactoredDiff: `@@ -88,4 +88,12 @@ async def stream_translation(request: Request):
+    async for chunk in translation_engine.stream(req.code):
+        if await request.is_disconnected():
+            break
+        yield f"data: {json.dumps(chunk)}\\n\\n"`,
    generatedTests: `async def test_stream_translation_disconnect(client):
    res = await client.post("/api/routes/translator/stream", json={"code": "print(1)"})
    assert res.status_code == 200
    assert "data:" in res.text`,
    plainEnglishExplanation:
      "This adds live streaming for code translations so developers see results word-by-word instantly in under 3 seconds, rather than waiting for the entire translation to finish before anything appears on screen.",
  },
];
