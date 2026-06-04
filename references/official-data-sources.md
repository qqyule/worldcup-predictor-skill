# Official Data Sources

This skill bundles a lightweight source index, not official data. Use `assets/official-sources.json` and this reference to audit snapshot provenance. Do not treat URLs, page text, raw API responses, media, CSV files, or scraped content as direct prediction inputs.

## Rules

- Prediction CLIs accept only offline audited JSON snapshots.
- Only structured sources with `predictionInput: true` may affect `metadata.sourceVersions` after quality gates pass.
- `audit-only` sources may be retained in `officialFacts`, explanations, or review notes, but must not change probabilities by themselves.
- If a source changes but validation fails, keep the previous audited snapshot and report the failed source state.
- Do not bundle or redistribute FIFA media, PDFs, crests, raw HTML, raw API responses, or large generated data packages in this skill.

## Source Registry

| key | source | structured | prediction input | refresh | use |
| --- | --- | --- | --- | --- | --- |
| `fifa-calendar` | `https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idSeason=285023` | yes | yes | 240 min | Official 2026 fixture calendar, status, scores, venues, and match-centre URLs after validation. |
| `fifa-ranking` | `https://inside.fifa.com/fifa-world-ranking/men` | no | no | 1440 min | Audit context for ranking and strength explanations. |
| `fifa-squads` | `https://www.fifa.com/en/articles/fifa-world-cup-2026-squads-confirmed` | no | no | 720 min | Audit context for squads after manual review. |
| `fifa-match-centre` | `https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures` | no | no | 120 min | Audit context for match-centre pages and reviewable match facts. |
| `government-weather-us` | `https://www.weather.gov/documentation/services-web-api` | no | no | 60 min | Audit context for United States venue weather. |
| `government-weather-ca` | `https://api.weather.gc.ca/` | no | no | 60 min | Audit context for Canada venue weather. |
| `government-weather-mx` | `https://smn.conagua.gob.mx/es/web-service-api` | no | no | 60 min | Audit context for Mexico venue weather. |

## Quality Gates

For `fifa-calendar`, a promoted structured snapshot must:

- parse from the official calendar response;
- contain 104 unique fixtures and 104 unique match numbers;
- preserve official match IDs and match-centre URLs;
- preserve `actualScore90min` for completed group matches;
- preserve `advanceTeamId` for completed knockout matches, and ensure it matches one of the resolved participants;
- record the raw content hash in `metadata.sourceVersions["fifa-calendar"]`;
- update `metadata.dataVersion` only from prediction-affecting `sourceVersions` plus `strengthSnapshotVersion`.

For audit-only sources:

- record reviewable facts in `officialFacts` or external review notes;
- require `manual_review` or a versioned `deterministic_rule` before any adjustment can affect calculations;
- keep raw source changes out of `dataVersion` unless they are promoted into a structured prediction input.

## Relationship To Full Data Packages

The upstream application may maintain a full `data/fifa-worldcup-2026` package with raw API responses, rendered page snapshots, structured JSON/CSV, images, and documents. This skill intentionally does not include that package. Keep this repository limited to source metadata, schema rules, synthetic smoke-test data, and deterministic prediction code.
