import json
from backend.db.session import get_admin_cursor

def build_golden_dataset():
    with get_admin_cursor() as cur:
        cur.execute(
            """
            SELECT c.chunk_id::text, d.filename, c.page_number, c.allowed_roles, c.content
            FROM document_chunks c
            JOIN documents d ON c.doc_id = d.doc_id
            ORDER BY d.filename, c.chunk_index;
            """
        )
        chunks = cur.fetchall()

    def get_chunk(role, search_terms):
        for c in chunks:
            if role in c["allowed_roles"]:
                text = c["content"].lower()
                if all(term.lower() in text for term in search_terms):
                    return c["chunk_id"], c["filename"], c["page_number"], c["content"]
        raise ValueError(f"No chunk found for role '{role}' with terms: {search_terms}")

    dataset = []

    # =========================================================================
    # 1. ENGINEERING (20 Questions - Natural Human Phrasing)
    # =========================================================================
    eng_specs = [
        ("ENG-01", ["ERR-001", "payment-events", "partition 3"],
         "How do I resolve error ERR-001 when Kafka consumer lag spikes on partition 3?"),
        ("ENG-02", ["kafka-consumer-groups.sh", "payment-settlement-cg"],
         "What command should I run to inspect the lag for payment-settlement-cg?"),
        ("ENG-03", ["jcmd 1 Thread.print", "partition3-stall.tdump"],
         "How can I take a JVM thread dump on a stuck payment worker pod?"),
        ("ENG-04", ["ERR-002", "ledger-db-primary", "pg_stat_activity"],
         "What is the triage procedure when ledger-db-primary hits connection pool exhaustion?"),
        ("ENG-05", ["ledger-db-primary.cxyz.ap-south-1.rds.amazonaws.com", "rds_superuser"],
         "How do I connect directly to the primary ledger database endpoint as superuser?"),
        ("ENG-06", ["ERR-004", "Vault auto-unseal", "EKS node replacement"],
         "What causes HashiCorp Vault to fail auto-unsealing after an EKS node replacement?"),
        ("ENG-07", ["cache-shard-02", "5461-10922"],
         "How do I fix a stale Redis cluster master claiming slots 5461 to 10922?"),
        ("ENG-08", ["kubectl rollout restart deploy/auth-session-manager"],
         "What is the command to restart the auth session manager to force a DNS refetch?"),
        ("ENG-09", ["ap-south-1", "ap-southeast-1"],
         "Which AWS regions are designated as our primary and disaster recovery failover sites?"),
        ("ENG-10", ["Dead Letter Queue", "SeekToCurrentErrorHandler", "payment-events-dlq"],
         "How is the Spring Kafka Dead Letter Queue configured for failed payment events?"),
        ("ENG-11", ["ERR-024", "ImagePullBackOff", "Docker image pull rate limit"],
         "How do we handle Docker Hub 429 rate limit errors during Karpenter cluster scale-outs?"),
        ("ENG-12", ["imagePullPolicy: IfNotPresent", "kube-image-keeper"],
         "How do we prevent pull storms on large ML images across new worker nodes?"),
        ("ENG-13", ["Karpenter", "maxUnavailable"],
         "Why did Karpenter terminate half the pod fleet simultaneously during the February outage?"),
        ("ENG-14", ["Rohan Sharma", "Data Platform Lead"],
         "Who is the technical escalation point for data platform and Kafka messaging issues?"),
        ("ENG-15", ["Vikram Desai", "Infrastructure Lead"],
         "Who should be escalated to for HashiCorp Vault and infrastructure incidents?"),
        ("ENG-16", ["ISO 8583", "4,500 Transactions Per Second"],
         "How many transactions per second does our corporate disbursements engine process over ISO 8583?"),
        ("ENG-17", ["Axis Bank", "4.2% uplift in transaction success rates"],
         "What transaction success rate uplift did Axis Bank achieve with our dynamic routing?"),
        ("ENG-18", ["sub-100ms", "NEFT and RTGS"],
         "What is our latency SLA for bulk NEFT and RTGS corporate payouts?"),
        ("ENG-19", ["pg_terminate_backend", "pg_stat_activity"],
         "How do I terminate a blocked PostgreSQL query that is stalling database replication?"),
        ("ENG-20", ["ADR-001", "pgvector", "Elasticsearch"],
         "What were the key architectural reasons for migrating from Elasticsearch to pgvector?"),
    ]

    for qid, terms, qtext in eng_specs:
        cid, fname, pno, content = get_chunk("engineering", terms)
        dataset.append({
            "question_id": qid,
            "role": "engineering",
            "question": qtext,
            "ground_truth_chunk_id": cid,
            "source_document": fname,
            "source_page": pno,
            "anchor_terms": terms
        })

    # =========================================================================
    # 2. FINANCE (20 Questions - Natural Human Phrasing)
    # =========================================================================
    fin_specs = [
        ("FIN-01", ["target corridor of 76.5% to 79.2%"],
         "What is our board-mandated target corridor for gross margin?"),
        ("FIN-02", ["120 basis points from Q2 FY25", "cloud cost optimization"],
         "How much did our gross margin expand between Q2 and Q3 FY25?"),
        ("FIN-03", ["Exchange Rate: 1 USD = ₹83.45"],
         "What USD to INR exchange rate was assumed in our Q3 board financial model?"),
        ("FIN-04", ["GROSS PROFIT", "$12.87M", "₹107.40 Cr"],
         "What was our gross profit for Q3 FY25 in both dollars and rupees?"),
        ("FIN-05", ["Total OpEx for Q3 was tightly controlled at $10.73M"],
         "What was our total operating expenditure (OpEx) for Q3 FY25?"),
        ("FIN-06", ["unrestricted cash and cash equivalents stand at a robust $46.2M"],
         "How much unrestricted cash and cash equivalents do we currently hold?"),
        ("FIN-07", ["excluding the $3.5M restricted in the Project Lotus"],
         "How much cash is held in escrow specifically for the Project Lotus acquisition?"),
        ("FIN-08", ["Office of the Chief Financial Officer", "Q3 Board Financial Report"],
         "Which executive office prepared the Q3 Board Financial Report and statutory audit dossier?"),
        ("FIN-09", ["CEO Townhall Address", "third quarter of 2025 has been a transformative period"],
         "What top-line business milestones did the CEO announce in the Q3 townhall address?"),
        ("FIN-10", ["Zero-Trust mTLS Rollout", "Kong API gateway alongside the new Envoy/Istio"],
         "What dual gateway architecture was run during the Zero-Trust mTLS migration?"),
        ("FIN-11", ["Locked Rate: ₹84.15 per USD"],
         "What forward contract strike rate did treasury lock in for USD-INR hedging?"),
        ("FIN-12", ["Maturity: Staggered monthly tranches through August 2026"],
         "What is the maturity schedule for our USD-INR foreign exchange forward contracts?"),
        ("FIN-13", ["GST ITC Reconciliation Audit Provision", "₹1,85,00,000"],
         "How much did finance provision for the Maharashtra State GST reconciliation audit?"),
        ("FIN-14", ["EBIT Margin %", "13.0%"],
         "What was our Q3 FY25 EBIT margin percentage?"),
        ("FIN-15", ["Procurement teams are enforcing rigorous infosec audits", "SOC2 Type II"],
         "Why are enterprise clients requiring SOC2 Type II reports before signing MSAs?"),
        ("FIN-16", ["Total T&E expenditure for Q3 FY25 was $285,000"],
         "What was our total Travel and Entertainment (T&E) expenditure in Q3 FY25?"),
        ("FIN-17", ["Overnight Sovereign Repos", "CCIL", "$12.40M"],
         "How much treasury cash is invested in Overnight Sovereign Repos via CCIL and at what yield?"),
        ("FIN-18", ["Project Lotus Escrow Funding", "SWIFT confirmation"],
         "What wire transfer and SWIFT steps are required to finalize the Project Lotus escrow?"),
        ("FIN-19", ["Senior Leadership Compensation", "75th percentile"],
         "What compensation adjustments did the Compensation Committee approve for senior technical leadership?"),
        ("FIN-20", ["Grand Hyatt Goa, Bambolim, Goa"],
         "Where is the company holding the annual offsite retreat in Goa?"),
    ]

    for qid, terms, qtext in fin_specs:
        cid, fname, pno, content = get_chunk("finance", terms)
        dataset.append({
            "question_id": qid,
            "role": "finance",
            "question": qtext,
            "ground_truth_chunk_id": cid,
            "source_document": fname,
            "source_page": pno,
            "anchor_terms": terms
        })

    # =========================================================================
    # 3. HR (15 Questions - Natural Human Phrasing)
    # =========================================================================
    hr_specs = [
        ("HR-01", ["Radford/Aon Hewitt", "Survey Data"],
         "Which benchmark survey did the compensation committee use to establish salary bands?"),
        ("HR-02", ["merit salary increase pool of 8.5%", "FY25"],
         "What percentage was approved for the company-wide merit salary increase pool in FY25?"),
        ("HR-03", ["10.2% pool authorized in FY24"],
         "What was our merit salary increase pool percentage back in FY24?"),
        ("HR-04", ["COL modifier is discounted by 12%", "Tier-2"],
         "What cost-of-living discount percentage applies to Tier-2 locations like Pune and Hyderabad?"),
        ("HR-05", ["identical to their Tier-1 peers", "leveling band"],
         "Do employees in Tier-2 locations retain the exact same leveling band as Tier-1 employees?"),
        ("HR-06", ["voluntary attrition rate in the Indian SaaS industry", "attrition models"],
         "What baseline voluntary attrition rate does our internal model track for the Indian SaaS sector?"),
        ("HR-07", ["Office of the CHRO", "bespoke benchmarking"],
         "Why did the Office of the CHRO engage Aon Hewitt for compensation benchmarking?"),
        ("HR-08", ["Neha Sharma, EMP-1001", "Exceeds Expectations"],
         "What performance rating and calibration notes were recorded for VP of Engineering Neha Sharma?"),
        ("HR-09", ["Rohan Verma (Senior Backend Engineer) Karan Malhotra (DevOps"],
         "Which engineers are currently placed on the confidential Performance Improvement Plan roster?"),
        ("HR-10", ["EMP-1005", "Karan Malhotra", "remote-first contract in Delhi"],
         "What specific attendance violations led to Karan Malhotra being placed on a PIP?"),
        ("HR-11", ["Group Product Manager, Senior Finance Manager", "₹53,50,00"],
         "What is the base salary band for Level 4 roles like Group Product Manager?"),
        ("HR-12", ["₹2,85,00,0", "250,000"],
         "What is the executive base salary and option grant range for L7 and L8 leadership?"),
        ("HR-13", ["Q4 Executive Retention Pool", "specialized fintech engineering"],
         "Why was the Q4 Executive Retention Pool authorized following our recent M&A momentum?"),
        ("HR-14", ["Merit Review Calibration", "75th"],
         "What market percentile corridor must HR calibration align with for year-end salary reviews?"),
        ("HR-15", ["Series C", "$42.50 per share", "ESOP"],
         "What fair market share price was established under our Series C valuation for the employee ESOP buyback program?"),
    ]

    for qid, terms, qtext in hr_specs:
        cid, fname, pno, content = get_chunk("hr", terms)
        dataset.append({
            "question_id": qid,
            "role": "hr",
            "question": qtext,
            "ground_truth_chunk_id": cid,
            "source_document": fname,
            "source_page": pno,
            "anchor_terms": terms
        })

    # =========================================================================
    # 4. ALL EMPLOYEES (15 Questions - Natural Human Phrasing)
    # =========================================================================
    all_specs = [
        ("ALL-01", ["POL-LEAVE-01", "Annual Paid Leave"],
         "What are our annual paid leave entitlements and accrual rules under policy POL-LEAVE-01?"),
        ("ALL-02", ["6 days of Casual Leave", "Emergency Personal Time Off"],
         "How many days of casual leave or emergency personal time off do employees get each year?"),
        ("ALL-03", ["CL cannot be combined with Annual Privilege Leave"],
         "Can I combine my casual leave with annual privilege leave, and does unused casual leave carry over?"),
        ("ALL-04", ["Envoy mobile application", "book their workstations"],
         "Which mobile app do we use to reserve our desks on mandatory office days?"),
        ("ALL-05", ["15 days of temporary", "relocation"],
         "How many days of company-sponsored guest house stay are covered if I relocate for work?"),
        ("ALL-06", ["Annual Corporate Offsite Retreat (Goa 2025)", "strategic objectives for FY2026"],
         "Why is the company organizing the annual offsite retreat in Goa for 2025?"),
        ("ALL-07", ["mandatory core days without approved exceptions will result in disciplinary action"],
         "What happens if an employee misses the mandatory in-office core days without approval?"),
        ("ALL-08", ["POL-WFH-02", "Hybrid Work"],
         "What is the policy code for our hybrid work and office attendance guidelines?"),
        ("ALL-09", ["Empowering frictionless B2B enterprise payments and core banking infrastructure"],
         "What is Meridian Fintech's official corporate mission statement?"),
        ("ALL-10", ["BKC Ground G-Block", "Primary Assembly Point"],
         "Where is the primary outdoor evacuation assembly point for the Mumbai BKC office?"),
        ("ALL-11", ["Jio World Drive", "Secondary Assembly Point"],
         "Where is the secondary evacuation point if G-Block at BKC is blocked or unsafe?"),
        ("ALL-12", ["Floor 10 (Platform & SRE): Amit Desai"],
         "Who is the safety floor warden for Floor 10 in our Mumbai office?"),
        ("ALL-13", ["Floor 4 (Product & Design): Karthik Reddy"],
         "Who is the emergency floor warden for Product and Design on Floor 4 in Bengaluru?"),
        ("ALL-14", ["Floor 3 (Data Science & QA): Priya Venkatesh"],
         "Who is the emergency floor warden for Data Science and QA on Floor 3 in Bengaluru?"),
        ("ALL-15", ["Effective Date: January 1, 2025", "Mumbai, Bengaluru, Pune, Singapore"],
         "Which office locations are covered under the 2025 Global Employee Handbook?"),
    ]

    for qid, terms, qtext in all_specs:
        cid, fname, pno, content = get_chunk("all_employees", terms)
        dataset.append({
            "question_id": qid,
            "role": "all_employees",
            "question": qtext,
            "ground_truth_chunk_id": cid,
            "source_document": fname,
            "source_page": pno,
            "anchor_terms": terms
        })

    # Save to evaluation/golden_dataset_v2.json
    out_path = "evaluation/golden_dataset_v2.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)

    print(f"SUCCESS: Generated {len(dataset)} verified golden questions in {out_path}!")

    role_counts = {}
    for item in dataset:
        role_counts[item["role"]] = role_counts.get(item["role"], 0) + 1
    print("Role distribution:", role_counts)

if __name__ == "__main__":
    build_golden_dataset()
