export interface SnippetPreset {
  langName: string;
  code: string;
  english: string;
  targetCode?: string;
}

export const SAMPLE_SNIPPETS: Record<string, SnippetPreset> = {
  python: {
    langName: "Python",
    code: `def quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + middle + quicksort(right)`,
    english:
      "This is a recursive QuickSort algorithm in Python. It picks the middle element as the pivot, partitions the array into elements less than, equal to, and greater than the pivot using list comprehensions, and recursively combines sorted partitions in O(N log N) average time.",
    targetCode: `function quicksort<T>(arr: T[]): T[] {\n  if (arr.length <= 1) return arr;\n  const pivot = arr[Math.floor(arr.length / 2)];\n  return [\n    ...quicksort(arr.filter(x => x < pivot)),\n    ...arr.filter(x => x === pivot),\n    ...quicksort(arr.filter(x => x > pivot))\n  ];\n}`,
  },
  typescript: {
    langName: "TypeScript",
    code: `interface CacheEntry<T> {\n    value: T;\n    expiry: number;\n}\nclass TTLCache<K, V> {\n    private store = new Map<K, CacheEntry<V>>();\n    set(key: K, value: V, ttlMs: number) {\n        this.store.set(key, { value, expiry: Date.now() + ttlMs });\n    }\n}`,
    english:
      "A generic in-memory Time-To-Live (TTL) cache class in TypeScript. Entries store the generic value along with an epoch expiration timestamp to enforce automated expiration checks.",
    targetCode: `type CacheEntry[T any] struct {\n    Value T\n    Expiry time.Time\n}\ntype TTLCache[K comparable, V any] struct {\n    store map[K]CacheEntry[V]\n    mu    sync.RWMutex\n}`,
  },
  rust: {
    langName: "Rust",
    code: `pub fn find_median(mut numbers: Vec<f64>) -> Option<f64> {\n    if numbers.is_empty() { return None; }\n    numbers.sort_by(|a, b| a.partial_cmp(b).unwrap());\n    let mid = numbers.len() / 2;\n    if numbers.len() % 2 == 0 {\n        Some((numbers[mid - 1] + numbers[mid]) / 2.0)\n    } else {\n        Some(numbers[mid])\n    }\n}`,
    english:
      "Calculates the statistical median of a vector of floats in Rust. Sorts the values safely with partial_cmp, handles empty slice boundaries with Option::None, and averages middle values for even-length vectors.",
    targetCode: `def find_median(numbers: list[float]) -> float | None:\n    if not numbers:\n        return None\n    s = sorted(numbers)\n    mid = len(s) // 2\n    return (s[mid - 1] + s[mid]) / 2.0 if len(s) % 2 == 0 else s[mid]`,
  },
  go: {
    langName: "Go",
    code: `func FanOut[T, R any](in <-chan T, worker func(T) R, workers int) <-chan R {\n    out := make(chan R)\n    var wg sync.WaitGroup\n    for i := 0; i < workers; i++ {\n        wg.Add(1)\n        go func() {\n            defer wg.Done()\n            for item := range in {\n                out <- worker(item)\n            }\n        }()\n    }\n    go func() { wg.Wait(); close(out) }()\n    return out\n}`,
    english:
      "A concurrent Fan-Out pattern in Go utilizing generics. Dispatches incoming tasks across a worker pool of goroutines, syncs completion via sync.WaitGroup, and cleanly closes the output channel.",
    targetCode: `import asyncio\nasync def fan_out(stream, worker_fn, num_workers=4):\n    queue = asyncio.Queue()\n    async def _worker():\n        while True:\n            item = await queue.get()\n            await worker_fn(item)\n            queue.task_done()\n    tasks = [asyncio.create_task(_worker()) for _ in range(num_workers)]`,
  },
  cpp: {
    langName: "C++",
    code: `template <typename T>\nclass ThreadSafeQueue {\n    std::queue<T> q;\n    mutable std::mutex m;\n    std::condition_variable cv;\npublic:\n    void push(T val) {\n        std::lock_guard<std::mutex> lock(m);\n        q.push(std::move(val));\n        cv.notify_one();\n    }\n};`,
    english:
      "A thread-safe generic queue in C++ utilizing std::mutex and std::condition_variable for blocking synchronization between producer and consumer threads.",
    targetCode: `use std::sync::{Arc, Mutex, Condvar};\npub struct ThreadSafeQueue<T> {\n    queue: Mutex<Vec<T>>,\n    cvar: Condvar,\n}`,
  },
  sql: {
    langName: "SQL",
    code: `WITH ranked_payments AS (\n    SELECT user_id, amount, created_at,\n           DENSE_RANK() OVER (PARTITION BY user_id ORDER BY amount DESC) as rnk\n    FROM transactions\n)\nSELECT user_id, amount FROM ranked_payments WHERE rnk <= 3;`,
    english:
      "A Common Table Expression (CTE) in SQL that ranks user transactions by transaction volume using the DENSE_RANK() window function, extracting each user's top 3 highest transactions.",
    targetCode: `SELECT user_id, amount\nFROM (\n    SELECT user_id, amount, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY amount DESC) as r\n    FROM transactions\n) t WHERE r <= 3;`,
  },
};
