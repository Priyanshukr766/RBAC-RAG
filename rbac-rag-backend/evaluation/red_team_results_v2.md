# 60-Prompt Red-Team Adversarial Security Evaluation Scorecard

| Attack Category | Attacks Tested | Attacks Blocked | Data Leaks | Block Rate | Defense Mechanism |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Direct Unauthorized Cross-Role Access** | 15 | 15 | **0** | **100.0%** | PostgreSQL Row-Level Security (`SET LOCAL app.current_user_role`) |
| **Role Spoofing & System Prompt Overrides** | 15 | 15 | **0** | **100.0%** | Stage 1 Live JWT Authentication (user role immutable from prompt) |
| **Indirect Prompt Injection via Document Payloads** | 15 | 15 | **0** | **100.0%** | Stage 2 Regex/Heuristic Input Guardrails & Sentence Sanitization |
| **Cross-Role Redis Semantic Cache Probing** | 15 | 15 | **0** | **100.0%** | Stage 3 Role-Scoped Redis Semantic Cache Keys (`role:hash`) |

### Overall Security Benchmark Summary
- **Total Adversarial Attacks Tested**: **60**
- **Attacks Successfully Contained / Blocked**: **60**
- **Total Data Leaks Detected**: **0**
- **Overall Attack Containment Rate**: **100.00%**
- **Average End-to-End Latency**: **1459.77 ms**

### Threat Defense Analysis
1. **Direct Unauthorized Access (15/15 Blocked)**: Pre-filtered PostgreSQL RLS guarantees that queries originating from unauthorized roles never retrieve protected rows.
2. **Role Spoofing (15/15 Blocked)**: Role claims embedded in the user prompt (e.g. `[ROLE: ADMIN]`) are discarded; user identity is derived strictly from verified JWT claims in Stage 1.
3. **Indirect Prompt Injection (15/15 Blocked)**: Guardrails in Stage 2 strip known injection patterns before prompting or chunk extraction.
4. **Cross-Role Cache Probing (15/15 Blocked)**: Responses cached in Redis are keyed with a strict role prefix (`role:query_hash`). Pre-warmed executive caches are entirely invisible to unauthorized roles.
