# Audited Snapshot Schema

The CLI accepts one offline JSON snapshot:

```json
{
  "metadata": {
    "modelVersion": "model-v0.2-elo-dc",
    "dataVersion": "official-...",
    "sourceVersions": { "fifa-calendar": "<content-hash>" },
    "strengthSnapshotVersion": "<version>",
    "expectedTeamCount": 48,
    "generatedAt": "2026-06-04T00:00:00.000Z"
  },
  "teams": [],
  "matchStates": [],
  "contextAdjustments": [],
  "officialFacts": []
}
```

## Validation

- `sourceVersions` contains only sources that actually affect prediction inputs.
- `dataVersion` is the stable hash of `sourceVersions` plus `strengthSnapshotVersion`.
- `expectedTeamCount` must equal `teams.length`.
- Every team must use the same `strengthVersion`.
- `ratingValue` is preferred. `eloRating` and `fifaRank` are compatibility fallbacks.
- Static `isHost` values are ignored by the Skill. Host status comes from `venueCountryCode`.
- `officialFacts` are retained for explanation and audit only.

## Match States

`matchStates[]` may include:

- `matchId`, `matchNumber`, `stage`, `homeTeamId`, `awayTeamId`, `venueCountryCode`, `status`
- `actualScore90min`
- `actualScoreExtraTime`
- `penaltyScore`
- `advanceTeamId`

A final group match requires `actualScore90min`. A final knockout match requires an `advanceTeamId` matching one of the resolved participants. Never infer missing extra-time, penalty, or advancement fields.

## Context Adjustments

Only these adjustments may affect calculations:

- `derivation: "manual_review"`
- `derivation: "deterministic_rule"` with a non-empty `ruleVersion`

`llm_extraction` entries are always ignored.
