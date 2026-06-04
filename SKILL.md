---
name: worldcup-predictor
description: Use when an agent must act as 世界杯预测机 for World Cup prediction, 2026 世界杯模拟, 世界杯胜平负概率, 90-minute match probabilities, champion or qualification probability explanation, audited offline input checks, completed-result tournament continuation, or cautious China football lottery 3/1/0 reference lists.
---

# 世界杯预测机 / World Cup Predictor

Use this skill to run deterministic World Cup predictions from an offline audited snapshot. Users may call it 世界杯预测机 in Chinese prompts; the internal skill name remains `worldcup-predictor`. The bundled `core/` is a portable snapshot of `prediction-core v0.2.0`; do not recreate probability formulas in prose or with an LLM.

## Workflow

1. Obtain a structured audited snapshot. Do not scrape or invent missing official facts.
2. Read `references/data-schema.md` and validate source versions, one complete strength version, and completed match fields.
3. If official provenance is relevant, read `references/official-data-sources.md`; use its source index only to audit snapshot lineage, not as live prediction input.
4. Run the relevant CLI from the skill directory:

```bash
node scripts/predict-match.mjs --data <snapshot> --home FRA --away BRA
node scripts/simulate-tournament.mjs --data <snapshot> --simulations 10000 --seed 2026
node scripts/generate-lottery-slip.mjs --issue <issue> --strategy balanced --budget 288
```

5. Explain only the returned probabilities and audit metadata. State uncertainty and fallback status.
6. Keep `90minResult` and `advanceResult` separate in every report.

## Non-Negotiable Rules

- Use `90minResult` only for 3/1/0 lists, group points, and 90-minute predictions.
- Use `advanceResult` only for knockout progression and champion paths.
- Preserve completed group scores and completed knockout advancing teams.
- Apply host advantage only when `venueCountryCode` matches the team's country.
- Treat `officialFacts`, weather, and news as audit context only.
- Ignore `llm_extraction` adjustments. Apply only `manual_review` or versioned `deterministic_rule` adjustments.
- Never claim guaranteed accuracy, returns, purchasing advice, or official endorsement.

## Bundled Data

- `assets/sample-data/worldcup-2026.json`: compact synthetic audited smoke-test snapshot.
- `assets/sample-data/synthetic-48-team.json`: synthetic 48-team snapshot with 73 completed matches.
- `assets/official-sources.json`: lightweight official source registry metadata only.
- Samples are not official feeds and contain no licensed marks or crests. The source registry does not include official data, raw responses, media, or live feeds.

## References

- Read `references/data-schema.md` before preparing or validating snapshots.
- Read `references/official-data-sources.md` before assessing official source provenance or deciding whether a source may affect predictions.
- Read `references/model-methodology.md` when explaining calculations and limitations.
- Read `references/tournament-rules.md` for completed-result continuation and 2026 paths.
- Read `references/lottery-rules.md` before producing a 3/1/0 reference list.
