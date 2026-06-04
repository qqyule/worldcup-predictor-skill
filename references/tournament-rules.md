# Tournament Rules

## 2026 Format

- 48 teams in 12 groups of 4.
- Group winners and runners-up qualify.
- The best 8 third-place teams complete the round of 32.
- The bundled core uses the 2026 round-of-32 bracket and third-place slot mapping.

## Result Integrity

- `90minResult` includes stoppage time but excludes extra time and penalties.
- Group standings use only the actual or simulated 90-minute score.
- `advanceResult` identifies the knockout team that advances.
- A final knockout state must match the participants resolved from the bracket.
- Missing or conflicting completed-result fields cause simulation failure rather than inference.

## Ranking

The deterministic ranking fallback is:

1. points;
2. goal difference;
3. goals scored;
4. wins;
5. audited model strength;
6. stable team identifier.

This is a model simulation tiebreak path, not a claim that every official disciplinary or drawing-of-lots step has been reproduced.
