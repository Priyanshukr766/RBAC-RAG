# 4-Way Retrieval Ablation Study Results (60 Golden Enterprise Questions)

| Retrieval Mode | Recall@5 | MRR@5 | p95 Latency (ms) | Unauthorized RLS Leaks |
| :--- | :---: | :---: | :---: | :---: |
| `bm25_only` | 1.0000 | 1.0000 | 10.25 ms | 0 |
| `vector_only` | 1.0000 | 1.0000 | 99.65 ms | 0 |
| `hybrid_rrf` | 1.0000 | 1.0000 | 96.34 ms | 0 |
| `hybrid_rerank` | 1.0000 | 0.9917 | 506.64 ms | 0 |
