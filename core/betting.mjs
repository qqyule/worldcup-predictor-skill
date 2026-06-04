// Generated from packages/prediction-core. Run pnpm skill:sync-core to refresh.
import { round } from "./utils.mjs";
const labelOrder = ["3", "1", "0"];
const labelToResult = {
    "3": "home_win",
    "1": "draw",
    "0": "away_win",
};
const labelToText = {
    "3": "主胜",
    "1": "平",
    "0": "客胜",
};
const defaultDisclaimer = "本工具仅提供基于公开数据和数学模型的赛事分析、模拟结果和清单整理，不构成任何购彩、投资或收益建议。请遵守当地法律法规，理性参与中国体育彩票，未成年人禁止参与。";
function probabilityMap(match) {
    return {
        "3": Number(match.homeWin90Prob),
        "1": Number(match.draw90Prob),
        "0": Number(match.awayWin90Prob),
    };
}
function assertProbabilities(match) {
    const probabilities = Object.values(probabilityMap(match));
    if (probabilities.some((probability) => !Number.isFinite(probability) || probability < 0 || probability > 1)) {
        throw new Error(`Invalid 90-minute probabilities for match ${match.matchId}.`);
    }
}
function sortedLabels(probabilities) {
    return labelOrder
        .map((label) => ({ label, probability: probabilities[label] }))
        .sort((left, right) => right.probability - left.probability);
}
function initialLabels(match, strategy) {
    const probabilities = probabilityMap(match);
    const ranked = sortedLabels(probabilities);
    const top = ranked[0];
    const second = ranked[1];
    const third = ranked[2];
    const labels = [top.label];
    if (strategy === "conservative") {
        if (top.probability < 0.46 || second.probability >= 0.3)
            labels.push(second.label);
    }
    else if (strategy === "aggressive") {
        if (top.probability < 0.4 && second.probability >= 0.29)
            labels.push(second.label);
    }
    else {
        if (top.probability < 0.45 || second.probability >= 0.27)
            labels.push(second.label);
        if (top.probability < 0.38 && third.probability >= 0.25)
            labels.push(third.label);
    }
    if (!labels.includes("1") && probabilities["1"] >= 0.3 && strategy !== "aggressive") {
        labels.push("1");
    }
    return [...new Set(labels)].sort((left, right) => labelOrder.indexOf(left) - labelOrder.indexOf(right));
}
function stakeCount(selections) {
    return selections.reduce((product, selection) => product * selection.label310.length, 1);
}
function confidenceScore(match) {
    const probabilities = probabilityMap(match);
    const ranked = sortedLabels(probabilities);
    return ranked[0].probability - ranked[1].probability / 2;
}
function reasonForSelection(match, labels) {
    const probabilities = probabilityMap(match);
    const ranked = sortedLabels(probabilities);
    const top = ranked[0];
    const includesDraw = labels.includes("1");
    if (labels.length === 1) {
        return `${labelToText[top.label]}概率相对最高，模型倾向单选；该判断仅基于90分钟概率。`;
    }
    if (includesDraw) {
        return `${labelToText[top.label]}方向略占优，但平局概率达到${Math.round(probabilities["1"] * 100)}%，加入防平。`;
    }
    return `${labelToText[top.label]}概率最高，但次选结果接近，使用双选降低单场波动。`;
}
function riskTag(match, labels) {
    const probabilities = probabilityMap(match);
    const ranked = sortedLabels(probabilities);
    if (ranked[0].probability < 0.4 || labels.length === 3)
        return "high";
    if (ranked[0].probability < 0.5 || labels.length === 2)
        return "medium";
    return "low";
}
function buildSelection(match, strategy) {
    assertProbabilities(match);
    const labels = initialLabels(match, strategy);
    return {
        matchNo: match.matchNo,
        matchId: match.matchId,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeCode: match.homeCode,
        awayCode: match.awayCode,
        resultScope: "90minResult",
        probabilities: {
            "3": round(match.homeWin90Prob),
            "1": round(match.draw90Prob),
            "0": round(match.awayWin90Prob),
        },
        label310: labels,
        selection: labels.join(""),
        selected90minResults: labels.map((label) => labelToResult[label]),
        riskTag: riskTag(match, labels),
        confidenceScore: round(confidenceScore(match)),
        reason: reasonForSelection(match, labels),
    };
}
function trimToBudget(selections, maxStake) {
    let currentStake = stakeCount(selections);
    while (currentStake > maxStake) {
        const candidates = selections
            .filter((selection) => selection.label310.length > 1 && selection.probabilities)
            .map((selection) => {
            const removable = selection.label310[selection.label310.length - 1];
            return {
                selection,
                removable,
                probability: selection.probabilities?.[removable] ?? 0,
            };
        })
            .sort((left, right) => left.probability - right.probability);
        if (candidates.length === 0)
            break;
        const candidate = candidates[0];
        candidate.selection.label310 = candidate.selection.label310.slice(0, -1);
        candidate.selection.selection = candidate.selection.label310.join("");
        candidate.selection.selected90minResults = candidate.selection.label310.map((label) => labelToResult[label]);
        candidate.selection.reason = `${candidate.selection.reason ?? ""} 受预算约束，移除最低保护项${labelToText[candidate.removable]}。`.trim();
        currentStake = stakeCount(selections);
    }
    return selections;
}
function buildRenxuan9(selections, unitStake) {
    const selected = selections
        .slice()
        .sort((left, right) => (right.confidenceScore ?? 0) - (left.confidenceScore ?? 0))
        .slice(0, 9)
        .sort((left, right) => (left.matchNo ?? 0) - (right.matchNo ?? 0));
    const selectedIds = new Set(selected.map((selection) => selection.matchId));
    const excludedMatches = selections
        .filter((selection) => !selectedIds.has(selection.matchId))
        .map((selection) => ({
        matchNo: selection.matchNo ?? 0,
        matchId: selection.matchId,
        homeTeam: selection.homeTeam ?? "",
        awayTeam: selection.awayTeam ?? "",
        reason: "模型置信度相对较低或赛果分布更接近，任选9样例中先剔除。",
    }));
    const renxuan9StakeCount = stakeCount(selected);
    return {
        matchCount: selected.length,
        stakeCount: renxuan9StakeCount,
        estimatedAmount: renxuan9StakeCount * unitStake,
        selections: selected,
        excludedMatches,
    };
}
export function generateBettingSlip(input) {
    const strategy = input.strategy ?? "balanced";
    const unitStake = Number(input.issue.unitStake ?? 2);
    if (!["conservative", "balanced", "aggressive"].includes(strategy)) {
        throw new Error("strategy must be conservative, balanced, or aggressive.");
    }
    if (!Number.isFinite(unitStake) || unitStake <= 0) {
        throw new Error("unitStake must be a positive number.");
    }
    if (input.budget !== undefined && (!Number.isFinite(input.budget) || input.budget <= 0)) {
        throw new Error("budget must be a positive number.");
    }
    if (!Array.isArray(input.issue.matches) || input.issue.matches.length < 9) {
        throw new Error("issue.matches must contain at least 9 matches.");
    }
    const maxStake = input.budget ? Math.max(1, Math.floor(input.budget / unitStake)) : Number.POSITIVE_INFINITY;
    const selections = trimToBudget(input.issue.matches.map((match) => buildSelection(match, strategy)), maxStake);
    const fullStakeCount = stakeCount(selections);
    const bankerMatches = selections
        .filter((selection) => selection.label310.length === 1 && selection.riskTag === "low")
        .map((selection) => selection.matchId);
    const renxuan9 = buildRenxuan9(selections, unitStake);
    return {
        id: `${input.issue.id}-${strategy}`,
        issueId: input.issue.id,
        issueName: input.issue.name,
        modelVersion: input.issue.modelVersion,
        dataVersion: input.issue.dataVersion,
        generatedAt: input.generatedAt ?? new Date().toISOString(),
        strategy,
        budget: input.budget,
        unitStake,
        riskLevel: strategy,
        stakeCount: fullStakeCount,
        estimatedAmount: fullStakeCount * unitStake,
        bankerMatches,
        selections,
        excludedMatches: renxuan9.excludedMatches,
        renxuan9,
        disclaimer: input.disclaimer ?? input.issue.disclaimer ?? defaultDisclaimer,
    };
}
