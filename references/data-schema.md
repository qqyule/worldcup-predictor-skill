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

## Official Sources And Versioning

Official source metadata lives in `assets/official-sources.json`; usage rules live in `references/official-data-sources.md`. These files are source indexes only, not bundled official data.

- `metadata.sourceVersions` must include the content hash for each prediction-affecting structured source, such as `fifa-calendar`, after quality gates pass.
- `metadata.sourceVersions` must not include audit-only pages, weather, news, squads, rankings, or other context unless the value has been promoted into a structured prediction input.
- `metadata.dataVersion` must be derived only from prediction-affecting `sourceVersions` and `strengthSnapshotVersion`.
- `officialFacts` and audit-only source changes may support explanation, but must not change `dataVersion` or probabilities by themselves.
- If a new official source fetch fails validation, keep the previous audited snapshot rather than mixing partial source versions.

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
