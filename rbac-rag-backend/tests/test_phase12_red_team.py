from evaluation.red_team_suite import run_red_team_suite


def test_80_prompt_red_team_zero_leaks():
    summary = run_red_team_suite()
    assert summary["total_prompts"] == 80, f"Expected 80 prompts, got {summary['total_prompts']}"
    assert summary["total_leaks"] == 0, f"Security leak detected: {summary['failures']}"
    assert summary["total_blocked"] == 80

    for category, stats in summary["category_stats"].items():
        assert stats["total"] == 20, f"Expected 20 prompts in {category}"
        assert stats["leaks"] == 0, f"Leak in category {category}"