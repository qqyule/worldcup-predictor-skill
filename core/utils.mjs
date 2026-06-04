// Generated from packages/prediction-core. Run pnpm skill:sync-core to refresh.
export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
export function round(value, digits = 4) {
    return Number(value.toFixed(digits));
}
export function poisson(lambda, goals) {
    let factorial = 1;
    for (let value = 2; value <= goals; value += 1) {
        factorial *= value;
    }
    return (Math.exp(-lambda) * lambda ** goals) / factorial;
}
export function teamKey(team) {
    return team.id;
}
export function teamCode(team) {
    return team.code ?? team.countryCode ?? team.id;
}
export function teamRating(team) {
    if (Number.isFinite(team.ratingValue))
        return team.ratingValue;
    if (Number.isFinite(team.eloRating))
        return team.eloRating;
    if (Number.isFinite(team.fifaRank))
        return clamp(2050 - (team.fifaRank - 1) * 8, 1300, 2050);
    return 1700;
}
export function hashSeed(seed) {
    let state = 2166136261;
    for (const char of String(seed)) {
        state ^= char.charCodeAt(0);
        state = Math.imul(state, 16777619);
    }
    return state >>> 0;
}
export function createSeededRng(seed) {
    let state = hashSeed(seed);
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}
