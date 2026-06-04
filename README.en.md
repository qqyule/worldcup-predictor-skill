# World Cup Predictor Skill: 2026 World Cup Predictions And Simulation

[中文说明](README.md)

World Cup Predictor is an Agent Skill for Codex, Claude Code, and compatible environments. It uses audited offline snapshots and a bundled deterministic core to calculate 2026 World Cup predictions, 90-minute win/draw/loss probabilities, tournament simulations, champion probabilities, and cautious China football lottery 3/1/0 reference lists.

**In one sentence**: give an agent audited match data, and it can explain which side is more likely to win, draw, or lose in 90 minutes, then simulate who has the best path to the title.
**Best for**: checking a World Cup match before kickoff, building a 2026 World Cup simulator, explaining champion probabilities, or adding win/draw/loss analysis to Codex / Claude Code.
**Not for**: bundled official data packages, automatic live-score/news/odds/official-data scraping, betting advice, return promises, or official endorsement.
**Chinese display name**: 世界杯预测机. The internal skill name remains `worldcup-predictor`.

The 2026 World Cup uses the expanded 48-team, 12-group, 104-match format. This repository only works with audited offline data and does not depend on Next.js, databases, live scraping, or LLM-generated probabilities. LLMs may explain outputs, but they must not replace deterministic rules or calculations.

## Start In 30 Seconds

With an Agent Skills-compatible installer:

```bash
npx skills add https://github.com/qqyule/worldcup-predictor-skill --skill worldcup-predictor
```

Or install it manually:

```bash
git clone https://github.com/qqyule/worldcup-predictor-skill.git ~/.codex/skills/worldcup-predictor
```

Claude Code users can clone the repository into `~/.claude/skills/worldcup-predictor`.

Natural example requests after installation:

```text
Use worldcup-predictor: who is more likely to win, France or Brazil?
Use worldcup-predictor to analyze this match's 90-minute win/draw/loss chances.
Use worldcup-predictor: is there an upset risk in this match?
Use worldcup-predictor to show the most likely scorelines.
Use worldcup-predictor to simulate 2026 World Cup champion probabilities.
Use worldcup-predictor: which teams are most likely to reach the quarter-finals?
Use worldcup-predictor: who is more likely to qualify from this group?
Use worldcup-predictor to continue the knockout bracket from current results.
Use worldcup-predictor to explain why the model favors this team.
Use worldcup-predictor with my 14-match JSON and organize a 3/1/0 entertainment reference list.
Use worldcup-predictor to make a conservative win/draw/loss list, not betting advice.
Use worldcup-predictor to rank these matches by risk level.
```

## Capabilities

- Audit structured offline inputs and reject incomplete or mixed-version data.
- Calculate 90-minute win, draw, and loss probabilities, expected goals, and likely scorelines.
- Continue a 2026 World Cup simulation from completed results without overwriting them.
- Report qualification, knockout-path, and World Cup champion probabilities.
- Generate China football lottery 3/1/0 entertainment reference lists from `90minResult`.
- Keep `90minResult` and `advanceResult` strictly separate.
- Ignore unreviewed LLM-extracted context adjustments.

## Not For

- Live scores, news, odds, or official-data scraping.
- Real purchasing, proxy buying, payments, rebates, or return promises.
- Treating knockout advancement probability as 90-minute win probability.
- Asking an LLM to invent missing facts or calculate probabilities.
- Shipping unauthorized FIFA marks, team crests, or commercial data assets.

## CLI Examples

Node.js 20 or newer is required. No dependency installation is needed.

```bash
# Single-match prediction
node scripts/predict-match.mjs \
  --data assets/sample-data/worldcup-2026.json \
  --home MEX \
  --away KOR

# Tournament simulation
node scripts/simulate-tournament.mjs \
  --data assets/sample-data/synthetic-48-team.json \
  --simulations 10000 \
  --seed 2026

# 3/1/0 entertainment reference list
node scripts/generate-lottery-slip.mjs \
  --issue assets/sample-data/lottery-issue.json \
  --strategy balanced \
  --budget 288
```

Every command writes JSON to standard output for further processing by agents, scripts, or applications.

## Input And Model Boundaries

The CLI only accepts audited offline JSON snapshots. Inputs must contain consistent data versions, one complete team-strength version, and verifiable completed results.

Important scopes:

- `90minResult`: the result after 90 minutes including stoppage time; used for match probabilities, group points, and 3/1/0 lists.
- `advanceResult`: the team that advances after extra time or penalties; used only for knockout paths and champion probabilities.
- `officialFacts`, weather, news, and squads are audit and explanation context by default.
- Only `manual_review` or versioned `deterministic_rule` adjustments may affect calculations.

Detailed references:

- [`references/data-schema.md`](references/data-schema.md)
- [`references/official-data-sources.md`](references/official-data-sources.md)
- [`references/model-methodology.md`](references/model-methodology.md)
- [`references/tournament-rules.md`](references/tournament-rules.md)
- [`references/lottery-rules.md`](references/lottery-rules.md)

## Repository Structure

```text
.
├── SKILL.md                 # Agent workflow entry point
├── agents/openai.yaml       # Codex UI metadata
├── core/                    # Deterministic prediction-core ESM snapshot
├── scripts/                 # Audit, prediction, simulation, and list CLIs
├── references/              # Data, model, tournament, and compliance rules
├── assets/official-sources.json # Lightweight source index, not official data
├── assets/sample-data/      # Synthetic smoke-test data, not official feeds
├── tests/                   # Standalone tests
├── README.md                # Chinese documentation
├── README.en.md             # English documentation
└── LICENSE                  # MIT
```

## Development And Verification

```bash
npm test
npm run smoke
```

- `npm test` verifies input auditing, result scopes, completed-result locking, bundled-core hashes, and standalone CLIs.
- `npm run smoke` executes all three CLIs with bundled samples.
- `core/` is a deterministic snapshot generated from the upstream `packages/prediction-core`; do not edit it manually.

Bundled samples exist only for demonstrations and tests. They are not official schedules, real team-strength data, or actual prediction conclusions. `assets/official-sources.json` contains only source metadata; it does not include official scrape results, CSV files, images, PDFs, or live feeds.

## Open Source And Contributions

Issues and pull requests are welcome, especially for:

- Reproducible tournament-rule or input-audit problems;
- Cross-agent installation and compatibility improvements;
- Documentation and test improvements that preserve probability scopes.

Changes to probability formulas, tournament rules, or 3/1/0 scopes must include deterministic tests and explain their impact on `90minResult` and `advanceResult`.

## Disclaimer

This tool only provides public-data analysis, mathematical simulations, and list organization for entertainment reference. It is not purchasing, investment, or return advice. Follow applicable laws and regulations. Minors must not participate in China sports lottery activities.

## License

[MIT](LICENSE)
