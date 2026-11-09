# 4-Way Retrieval Ablation Study Results (60 Golden Enterprise Questions)

| Retrieval Mode | Recall@5 | MRR@5 | p95 Latency (ms) | Unauthorized RLS Leaks |
| :--- | :---: | :---: | :---: | :---: |
| `bm25_only` | 1.0000 | 1.0000 | 9.62 ms | 0 |
| `vector_only` | 1.0000 | 1.0000 | 87.81 ms | 0 |
| `hybrid_rrf` | 1.0000 | 1.0000 | 97.98 ms | 0 |
| `hybrid_rerank` | 1.0000 | 0.9917 | 470.69 ms | 0 |
