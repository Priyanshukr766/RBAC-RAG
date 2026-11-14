# LinkedIn Post & Resume Package: Production RBAC RAG

---

## 1. Resume / CV Section (Copy-Paste Ready)

### Project Entry for Resume:

**Enterprise RBAC RAG System | FastAPI, PostgreSQL (pgvector, RLS), Redis, PyTorch, Sentence-Transformers**
*GitHub: [github.com/your-username/rbac-rag] | Live Demo: [your-link]*
- Engineered a multi-tenant enterprise RAG engine over a 199-page corpus across 4 departments (Eng, Finance, HR, All-Employees) using FastAPI, PostgreSQL, and Redis.
- Implemented zero-trust permission isolation via **PostgreSQL Row-Level Security (RLS)** and pre-filtered HNSW cosine vector search (`hnsw.iterative_scan`), achieving **100% tenant isolation (0 leaks across 165 cross-department test queries)**.
- Designed a 4-stage retrieval pipeline combining PostgreSQL **BM25 lexical search**, **BGE-base dense embeddings**, **Reciprocal Rank Fusion (RRF)**, and **Cross-Encoder reranking**, lifting Recall@5 from 81.4% (vector-only) to **92.86%** (MRR@5: 0.768).
- Built a role-scoped Redis semantic cache (`role:query_hash`) with TTL invalidation, preventing cross-role cache leakage while delivering <10ms response times for repeated queries.
- Validated system security through an automated 60-prompt red-team harness testing prompt injection, role spoofing jailbreaks, and cache poisoning with a **100% block rate**.

---

## 2. Concise LinkedIn Post Options (High-Engagement Hooks)

### Option 1: "The Intern & Salary" Hook (Curiosity-Driven, ~180 words)

An intern asks your company RAG bot: "What was the VP's salary last quarter?"

If you followed a standard YouTube tutorial... the bot just happily answers it.

Prompt guardrails like *"please don't share confidential data"* fail against basic prompt injection. Real security has to live at the database layer.

I built an **Enterprise RBAC RAG backend** to solve this, and benchmarked it across a 199-page corporate corpus:

**What the data showed:**
1. **BM25 beat Vector Search on technical queries**: Dense embeddings struggled with exact error codes (`ERR-001`) and IDs (81.4% Recall). BM25 hit 88.5% at just 35ms.
2. **Hybrid + Cross-Encoder is the real sweet spot**: Combining BM25 + Vector Search (RRF) with a Cross-Encoder reranker pushed Recall@5 to **92.86%**.
3. **PostgreSQL RLS is bulletproof**: Pushing permissions into the database engine (`SET LOCAL app.current_user_role`) yielded **0 leaks across 165 cross-department test queries**.
4. **Redis caches leak data unless role-scoped**: Keying by `role:query_hash` prevented unauthorized users from hitting pre-warmed executive cache entries.

Tested against 60 adversarial attacks (jailbreaks, role-spoofing, cache probing) with a 100% block rate.

Tech: FastAPI | PostgreSQL (pgvector, RLS) | Redis | PyTorch

Full GitHub repo & evaluation report: [Link in comments/bio]

#SoftwareEngineering #RAG #PostgreSQL #FastAPI #SystemDesign #Python #Backend

---

### Option 2: "The 95% Tutorial Flaw" Hook (Direct & Punchy, ~160 words)

95% of RAG tutorials teach you a massive security flaw:

They filter permissions *after* retrieval in Python code.

If an intern asks about executive compensation, your vector database retrieves the confidential chunks into memory first. When your Python code drops them, you're left with 0 relevant results—or worse, prompt injection leaks the data.

I built a production **RBAC RAG backend** to fix this at the database level and benchmarked it over a 199-page corpus.

**Key Engineering Highlights:**
- **Zero-Trust Postgres RLS**: Filtered rows inside PostgreSQL (`pgvector` + RLS). 0 unauthorized leaks across 165 cross-department test queries.
- **BM25 vs Vector Search**: BM25 outperformed vector search on technical codes (88.5% vs 81.4% Recall).
- **Hybrid + Cross-Encoder**: Combining both via RRF + reranker reached **92.86% Recall@5**.
- **Role-Scoped Caching**: Scoped Redis keys by user role to eliminate cross-tenant cache contamination.
- **Red-Team Tested**: 60/60 adversarial jailbreaks and injections blocked.

Tech: FastAPI, PostgreSQL (pgvector), Redis, PyTorch.

Full code & benchmark report: [GitHub Link]

#RAG #PostgreSQL #FastAPI #SystemDesign #SoftwareEngineering #Python

