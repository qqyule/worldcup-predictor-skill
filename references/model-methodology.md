# Model Methodology

The bundled core is generated from `prediction-core v0.2.0`.

## Match Prediction

- Strength priority: `ratingValue`, legacy `eloRating`, FIFA rank fallback, then neutral fallback.
- Expected goals use strength difference, reviewed form, and audited attack/defense values.
- Scoreline probabilities use Poisson distributions with a Dixon-Coles low-score correction.
- Host advantage applies only when the match venue country matches the team country.
- Knockout 90-minute draws use a strength-weighted advancement fallback.

## Tournament Simulation

- Monte Carlo simulation uses a deterministic seeded random generator.
- Default simulation count is `10000`; common alternatives are `1000` and `50000`.
- Completed group scores are applied directly to standings.
- Completed knockout advancing teams are locked and cannot be randomly overwritten.
- A fixed input, model version, data version, seed, and simulation count produces the same output.

## Data Policy

- Current audited production strength may use FIFA rank fallback.
- Form and scoring statistics should only be enabled after the configured evidence threshold is met.
- Official facts, weather, squads, and news do not modify probability by themselves.
- LLMs may extract or explain facts but never calculate or silently adjust probabilities.
