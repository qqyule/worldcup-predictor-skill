// Generated from packages/prediction-core. Run pnpm skill:sync-core to refresh.
import { DEFAULT_MODEL_VERSION } from "./version.mjs";
import { clamp, poisson, round, teamKey, teamRating } from "./utils.mjs";
const DEFAULT_DATA_VERSION = "unknown-data";
const DEFAULT_MAX_GOALS = 7;
const TOURNAMENT_AVG_GOALS = 1.32;
function isKnockoutStage(stage) {
    return Boolean(stage && stage !== "group");
}
function withVenueHostFlag(team, venueCountryCode) {
    if (!venueCountryCode)
        return team;
    return {
        ...team,
        isHost: team.countryCode === venueCountryCode,
    };
}
function teamAttack(team) {
    if (Number.isFinite(team.goalsPerMatch) && team.goalsPerMatch > 0) {
        return team.goalsPerMatch / TOURNAMENT_AVG_GOALS;
    }
    return team.attackStrength ?? 1;
}
function teamDefense(team) {
    if (Number.isFinite(team.goalsAgainstPerMatch) && team.goalsAgainstPerMatch > 0) {
        return team.goalsAgainstPerMatch / TOURNAMENT_AVG_GOALS;
    }
    return team.defenseStrength ?? 1;
}
function multiply(value, factor) {
    if (!Number.isFinite(factor))
        return value;
    return (value ?? 1) * factor;
}
function matchesTarget(target, role) {
    return !target || target === "both" || target === role;
}
function isAdjustmentActive(adjustment, generatedAt) {
    if (!generatedAt)
        return true;
    const generatedTime = new Date(generatedAt).getTime();
    if (Number.isNaN(generatedTime))
        return true;
    if (adjustment.effectiveFrom && generatedTime < new Date(adjustment.effectiveFrom).getTime())
        return false;
    if (adjustment.effectiveTo && generatedTime > new Date(adjustment.effectiveTo).getTime())
        return false;
    return true;
}
function teamMatchesAdjustment(team, adjustment) {
    return adjustment.teamId === team.id || adjustment.teamCode === (team.code ?? team.countryCode);
}
function relevantAdjustment(team, adjustment, role, matchId, generatedAt) {
    if (!isAdjustmentActive(adjustment, generatedAt) || !matchesTarget(adjustment.target, role))
        return false;
    if (adjustment.scope === "team")
        return teamMatchesAdjustment(team, adjustment);
    return adjustment.matchId === matchId && (!adjustment.teamCode && !adjustment.teamId ? true : teamMatchesAdjustment(team, adjustment));
}
function summarizeImpact(impact) {
    const parts = [];
    if (impact.formScoreDelta)
        parts.push(`状态${impact.formScoreDelta > 0 ? "+" : ""}${impact.formScoreDelta}`);
    if (impact.attackMultiplier)
        parts.push(`进攻权重${Math.round((impact.attackMultiplier - 1) * 100)}%`);
    if (impact.defenseMultiplier)
        parts.push(`防守失球权重${Math.round((impact.defenseMultiplier - 1) * 100)}%`);
    if (impact.homeAdvantageDelta)
        parts.push(`主场因素${impact.homeAdvantageDelta > 0 ? "+" : ""}${impact.homeAdvantageDelta}`);
    return parts.join("，");
}
export function contextSummaryForMatch(input) {
    return (input.contextAdjustments ?? [])
        .filter((adjustment) => relevantAdjustment(input.homeTeam, adjustment, "home", input.matchId, input.generatedAt) ||
        relevantAdjustment(input.awayTeam, adjustment, "away", input.matchId, input.generatedAt))
        .map((adjustment) => `${adjustment.title}${summarizeImpact(adjustment.impact) ? `：${summarizeImpact(adjustment.impact)}` : ""}`);
}
export function applyContextAdjustments(input) {
    const adjustedTeam = { ...input.team };
    let homeAdvantageDelta = 0;
    for (const adjustment of input.contextAdjustments ?? []) {
        if (!relevantAdjustment(input.team, adjustment, input.role, input.matchId, input.generatedAt))
            continue;
        const { impact } = adjustment;
        if (impact.formScoreDelta)
            adjustedTeam.formScore = (adjustedTeam.formScore ?? 55) + impact.formScoreDelta;
        adjustedTeam.attackStrength = multiply(adjustedTeam.attackStrength, impact.attackMultiplier);
        adjustedTeam.defenseStrength = multiply(adjustedTeam.defenseStrength, impact.defenseMultiplier);
        adjustedTeam.goalsPerMatch = multiply(adjustedTeam.goalsPerMatch, impact.attackMultiplier);
        adjustedTeam.goalsAgainstPerMatch = multiply(adjustedTeam.goalsAgainstPerMatch, impact.defenseMultiplier);
        if (input.role === "home" && impact.homeAdvantageDelta)
            homeAdvantageDelta += impact.homeAdvantageDelta;
    }
    return { team: adjustedTeam, homeAdvantageDelta };
}
export function expectedGoals(homeTeam, awayTeam, context) {
    const homeRating = teamRating(homeTeam);
    const awayRating = teamRating(awayTeam);
    const ratingDelta = (homeRating - awayRating) / 400;
    const formDelta = ((homeTeam.formScore ?? 55) - (awayTeam.formScore ?? 55)) / 100;
    const homeHostBoost = (homeTeam.isHost ? 0.12 : 0) + (context?.homeAdvantageDelta ?? 0);
    const awayHostBoost = awayTeam.isHost ? 0.08 : 0;
    const homeAtt = teamAttack(homeTeam);
    const awayAtt = teamAttack(awayTeam);
    const homeDef = teamDefense(homeTeam);
    const awayDef = teamDefense(awayTeam);
    return {
        home: clamp(TOURNAMENT_AVG_GOALS * homeAtt * awayDef + ratingDelta * 0.38 + formDelta * 0.15 + homeHostBoost, 0.35, 3.25),
        away: clamp(TOURNAMENT_AVG_GOALS * awayAtt * homeDef - ratingDelta * 0.38 - formDelta * 0.15 + awayHostBoost, 0.3, 3.1),
    };
}
function dixonColesRho(lambdaHome, lambdaAway) {
    const avgLambda = (lambdaHome + lambdaAway) / 2;
    if (avgLambda < 1.0)
        return -0.13;
    if (avgLambda < 1.4)
        return -0.10;
    if (avgLambda < 1.8)
        return -0.06;
    return -0.03;
}
function dixonColesAdjustment(homeGoals, awayGoals, lambdaHome, lambdaAway) {
    const rho = dixonColesRho(lambdaHome, lambdaAway);
    if (homeGoals === 0 && awayGoals === 0)
        return 1 - lambdaHome * lambdaAway * rho;
    if (homeGoals === 0 && awayGoals === 1)
        return 1 + lambdaHome * rho;
    if (homeGoals === 1 && awayGoals === 0)
        return 1 + lambdaAway * rho;
    if (homeGoals === 1 && awayGoals === 1)
        return 1 - rho;
    return 1;
}
export function scoreDistribution(homeTeam, awayTeam, maxGoals = DEFAULT_MAX_GOALS, context) {
    const expected = expectedGoals(homeTeam, awayTeam, context);
    const scorelines = [];
    for (let home = 0; home <= maxGoals; home += 1) {
        for (let away = 0; away <= maxGoals; away += 1) {
            const baseProbability = poisson(expected.home, home) * poisson(expected.away, away);
            const dcFactor = dixonColesAdjustment(home, away, expected.home, expected.away);
            scorelines.push({
                home,
                away,
                probability: Math.max(0, baseProbability * dcFactor),
            });
        }
    }
    const totalProbability = scorelines.reduce((sum, scoreline) => sum + scoreline.probability, 0);
    return scorelines.map((scoreline) => ({
        ...scoreline,
        probability: scoreline.probability / totalProbability,
    }));
}
export function aggregateNinetyMinuteProbabilities(distribution) {
    const homeWin90Prob = distribution
        .filter((entry) => entry.home > entry.away)
        .reduce((sum, entry) => sum + entry.probability, 0);
    const draw90Prob = distribution
        .filter((entry) => entry.home === entry.away)
        .reduce((sum, entry) => sum + entry.probability, 0);
    const awayWin90Prob = distribution
        .filter((entry) => entry.home < entry.away)
        .reduce((sum, entry) => sum + entry.probability, 0);
    return { homeWin90Prob, draw90Prob, awayWin90Prob };
}
export function homeAdvanceAfterDrawProb(homeTeam, awayTeam) {
    const ratingDelta = (teamRating(homeTeam) - teamRating(awayTeam)) / 400;
    return clamp(0.5 + ratingDelta * 0.22 + (homeTeam.isHost ? 0.03 : 0) - (awayTeam.isHost ? 0.03 : 0), 0.25, 0.75);
}
export function drawWeightedScore(distribution, rng) {
    const pick = rng();
    let cursor = 0;
    for (const scoreline of distribution) {
        cursor += scoreline.probability;
        if (pick <= cursor)
            return scoreline;
    }
    return distribution[distribution.length - 1];
}
export function simulateNinetyMinutes(homeTeam, awayTeam, rng, distribution) {
    const score = drawWeightedScore(distribution ?? scoreDistribution(homeTeam, awayTeam), rng);
    return {
        home: score.home,
        away: score.away,
        result: score.home > score.away ? "home_win" : score.home < score.away ? "away_win" : "draw",
    };
}
export function chooseAdvancementWinner(homeTeam, awayTeam, result90, rng) {
    if (result90.result === "home_win")
        return homeTeam;
    if (result90.result === "away_win")
        return awayTeam;
    return rng() <= homeAdvanceAfterDrawProb(homeTeam, awayTeam) ? homeTeam : awayTeam;
}
export function predictMatch(input) {
    const adjustedHome = applyContextAdjustments({
        team: withVenueHostFlag(input.homeTeam, input.venueCountryCode),
        role: "home",
        matchId: input.matchId,
        generatedAt: input.generatedAt,
        contextAdjustments: input.contextAdjustments,
    });
    const adjustedAway = applyContextAdjustments({
        team: withVenueHostFlag(input.awayTeam, input.venueCountryCode),
        role: "away",
        matchId: input.matchId,
        generatedAt: input.generatedAt,
        contextAdjustments: input.contextAdjustments,
    });
    const homeTeam = adjustedHome.team;
    const awayTeam = adjustedAway.team;
    const homeTeamId = teamKey(homeTeam);
    const awayTeamId = teamKey(awayTeam);
    const context = { homeAdvantageDelta: adjustedHome.homeAdvantageDelta };
    if (homeTeamId === awayTeamId) {
        throw new Error("homeTeam and awayTeam must be different.");
    }
    const distribution = scoreDistribution(homeTeam, awayTeam, input.maxGoals ?? DEFAULT_MAX_GOALS, context);
    const expected = expectedGoals(homeTeam, awayTeam, context);
    const probabilities = aggregateNinetyMinuteProbabilities(distribution);
    const contextSummary = contextSummaryForMatch({
        homeTeam: input.homeTeam,
        awayTeam: input.awayTeam,
        matchId: input.matchId,
        generatedAt: input.generatedAt,
        contextAdjustments: input.contextAdjustments,
    });
    const topScorelines = distribution
        .slice()
        .sort((left, right) => right.probability - left.probability)
        .slice(0, 3)
        .map((entry) => ({
        scoreline: { home: entry.home, away: entry.away },
        probability: round(entry.probability),
    }));
    const strongestProb = Math.max(probabilities.homeWin90Prob, probabilities.draw90Prob, probabilities.awayWin90Prob);
    const prediction = {
        matchId: input.matchId ?? `${homeTeamId}-${awayTeamId}`,
        modelVersion: input.modelVersion ?? DEFAULT_MODEL_VERSION,
        dataVersion: input.dataVersion ?? DEFAULT_DATA_VERSION,
        generatedAt: input.generatedAt ?? new Date().toISOString(),
        resultScope: "90minResult",
        homeTeamId,
        awayTeamId,
        homeWin90Prob: round(probabilities.homeWin90Prob),
        draw90Prob: round(probabilities.draw90Prob),
        awayWin90Prob: round(probabilities.awayWin90Prob),
        expectedGoalsHome: round(expected.home, 2),
        expectedGoalsAway: round(expected.away, 2),
        topScorelines,
        confidenceLevel: strongestProb >= 0.52 ? "high" : strongestProb >= 0.42 ? "medium" : "low",
        upsetRisk: strongestProb < 0.4 ? "high" : strongestProb < 0.5 ? "medium" : "low",
        contextSummary: contextSummary.length > 0 ? contextSummary : undefined,
        explanation: [
            "该结果只代表90分钟含伤停补时的胜平负概率，不代表淘汰赛最终晋级方。",
            `模型使用 Elo 评分差（${teamRating(homeTeam)} vs ${teamRating(awayTeam)}）、历史攻防数据和 Dixon-Coles 修正估算预期进球：${round(expected.home, 2)}-${round(expected.away, 2)}。`,
            probabilities.draw90Prob >= 0.28
                ? "平局概率不可忽略，清单生成时应单独评估防平价值。"
                : "胜负方向相对更清晰，但仍应保留足球单场高波动的不确定性。",
            homeTeam.isHost || awayTeam.isHost
                ? `${homeTeam.isHost ? homeTeam.name : awayTeam.name}为东道主，主场加成已纳入模型。`
                : "双方均为客场作战，无额外主场加成。",
            ...(contextSummary.length > 0 ? contextSummary.map((summary) => `动态因子已纳入：${summary}。`) : []),
        ],
    };
    if (isKnockoutStage(input.stage)) {
        const homeDrawAdvanceProb = homeAdvanceAfterDrawProb(homeTeam, awayTeam);
        const homeAdvanceProb = probabilities.homeWin90Prob + probabilities.draw90Prob * homeDrawAdvanceProb;
        prediction.advanceResultScope = "advanceResult";
        prediction.homeAdvanceProb = round(homeAdvanceProb);
        prediction.awayAdvanceProb = round(1 - homeAdvanceProb);
    }
    return prediction;
}
