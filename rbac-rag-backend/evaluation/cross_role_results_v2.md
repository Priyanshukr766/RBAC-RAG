# RBAC Cross-Role Isolation Benchmark Matrix

| Requester Role | Target Domain | Queries Executed | Chunks Inspected | Unauthorized Leaks | Isolation Rate | Avg Latency |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `engineering` | `finance` | 20 | 100 | **0** | **100.0%** | 2056.3 ms |
| `engineering` | `hr` | 15 | 75 | **0** | **100.0%** | 2048.14 ms |
| `finance` | `engineering` | 20 | 100 | **0** | **100.0%** | 2028.12 ms |
| `finance` | `hr` | 15 | 75 | **0** | **100.0%** | 2079.18 ms |
| `hr` | `engineering` | 20 | 100 | **0** | **100.0%** | 2159.84 ms |
| `hr` | `finance` | 20 | 100 | **0** | **100.0%** | 2146.43 ms |
| `all_employees` | `engineering` | 20 | 100 | **0** | **100.0%** | 1734.46 ms |
| `all_employees` | `finance` | 20 | 100 | **0** | **100.0%** | 1809.07 ms |
| `all_employees` | `hr` | 15 | 75 | **0** | **100.0%** | 1754.37 ms |

### Summary Statistics
- **Total Cross-Boundary Queries Tested**: 165
- **Total Chunks Inspected**: 825
- **Total Unauthorized Leaks**: **0**
- **Cross-Role Isolation Rate**: **100.00%**

### Security Conclusion
Even when an unauthorized user provides exact keyword anchors or domain-specific questions targeting another department's confidential documents, PostgreSQL Row-Level Security (`SET LOCAL app.current_user_role`) filters all rows prior to ranking and generation.
Zero cross-tenant or cross-department data was leaked to unauthorized roles.
