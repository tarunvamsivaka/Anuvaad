import math
import operator
import time


def cosine_sim_old(vec1, vec2):
    dot = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = math.sqrt(sum(a * a for a in vec1))
    norm2 = math.sqrt(sum(b * b for b in vec2))
    return dot / (norm1 * norm2)


def cosine_sim_new(vec1, vec2):
    dot = sum(map(operator.mul, vec1, vec2))
    norm1 = math.sqrt(sum(map(operator.mul, vec1, vec1)))
    norm2 = math.sqrt(sum(map(operator.mul, vec2, vec2)))
    return dot / (norm1 * norm2)


v1 = [float(i) for i in range(1536)]
v2 = [float(i + 1) for i in range(1536)]

t0 = time.time()
for _ in range(10000):
    cosine_sim_old(v1, v2)
t1 = time.time()

t2 = time.time()
for _ in range(10000):
    cosine_sim_new(v1, v2)
t3 = time.time()

print(f"Old: {t1 - t0:.4f}s")
print(f"New: {t3 - t2:.4f}s")
