// Generated from packages/prediction-core. Run pnpm skill:sync-core to refresh.
import { DEFAULT_MODEL_VERSION, DEFAULT_SIMULATION_COUNT } from "./version.mjs";
import { chooseAdvancementWinner, scoreDistribution, simulateNinetyMinutes } from "./match.mjs";
import { createSeededRng, round, teamCode, teamKey, teamRating } from "./utils.mjs";
const DEFAULT_DATA_VERSION = "unknown-data";
const THIRD_PLACE_SLOT_ORDER = [
    "3CEFHI",
    "3EFGIJ",
    "3BEFIJ",
    "3ABCDF",
    "3AEHIJ",
    "3CDFGH",
    "3DEIJL",
    "3EHIJK",
];
const OFFICIAL_KNOCKOUT_BRACKET = [
    { matchNo: 73, stageField: "qualify32Prob", home: "2A", away: "2B" },
    { matchNo: 74, stageField: "qualify32Prob", home: "1E", away: "3ABCDF" },
    { matchNo: 75, stageField: "qualify32Prob", home: "1F", away: "2C" },
    { matchNo: 76, stageField: "qualify32Prob", home: "1C", away: "2F" },
    { matchNo: 77, stageField: "qualify32Prob", home: "1I", away: "3CDFGH" },
    { matchNo: 78, stageField: "qualify32Prob", home: "2E", away: "2I" },
    { matchNo: 79, stageField: "qualify32Prob", home: "1A", away: "3CEFHI" },
    { matchNo: 80, stageField: "qualify32Prob", home: "1L", away: "3EHIJK" },
    { matchNo: 81, stageField: "qualify32Prob", home: "1D", away: "3BEFIJ" },
    { matchNo: 82, stageField: "qualify32Prob", home: "1G", away: "3AEHIJ" },
    { matchNo: 83, stageField: "qualify32Prob", home: "2K", away: "2L" },
    { matchNo: 84, stageField: "qualify32Prob", home: "1H", away: "2J" },
    { matchNo: 85, stageField: "qualify32Prob", home: "1B", away: "3EFGIJ" },
    { matchNo: 86, stageField: "qualify32Prob", home: "1J", away: "2H" },
    { matchNo: 87, stageField: "qualify32Prob", home: "1K", away: "3DEIJL" },
    { matchNo: 88, stageField: "qualify32Prob", home: "2D", away: "2G" },
    { matchNo: 89, stageField: "qualify16Prob", home: "W74", away: "W77" },
    { matchNo: 90, stageField: "qualify16Prob", home: "W73", away: "W75" },
    { matchNo: 91, stageField: "qualify16Prob", home: "W76", away: "W78" },
    { matchNo: 92, stageField: "qualify16Prob", home: "W79", away: "W80" },
    { matchNo: 93, stageField: "qualify16Prob", home: "W83", away: "W84" },
    { matchNo: 94, stageField: "qualify16Prob", home: "W81", away: "W82" },
    { matchNo: 95, stageField: "qualify16Prob", home: "W86", away: "W88" },
    { matchNo: 96, stageField: "qualify16Prob", home: "W85", away: "W87" },
    { matchNo: 97, stageField: "qualify8Prob", home: "W89", away: "W90" },
    { matchNo: 98, stageField: "qualify8Prob", home: "W93", away: "W94" },
    { matchNo: 99, stageField: "qualify8Prob", home: "W91", away: "W92" },
    { matchNo: 100, stageField: "qualify8Prob", home: "W95", away: "W96" },
    { matchNo: 101, stageField: "qualify4Prob", home: "W97", away: "W98" },
    { matchNo: 102, stageField: "qualify4Prob", home: "W99", away: "W100" },
    { matchNo: 103, stageField: null, home: "RU101", away: "RU102" },
    { matchNo: 104, stageField: "champion", home: "W101", away: "W102" },
];
function groupTeams(teams) {
    const groups = new Map();
    for (const team of teams) {
        if (!groups.has(team.groupCode))
            groups.set(team.groupCode, []);
        groups.get(team.groupCode)?.push(team);
    }
    return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
}
function createStanding(team) {
    return {
        team,
        played: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        wins: 0,
    };
}
function compareStandings(left, right) {
    return (right.points - left.points ||
        right.goalDifference - left.goalDifference ||
        right.goalsFor - left.goalsFor ||
        right.wins - left.wins ||
        teamRating(right.team) - teamRating(left.team) ||
        teamKey(left.team).localeCompare(teamKey(right.team)));
}
function distributionKey(homeTeam, awayTeam) {
    return `${teamKey(homeTeam)}:${homeTeam.isHost ? 1 : 0}:${teamKey(awayTeam)}:${awayTeam.isHost ? 1 : 0}`;
}
function getDistribution(homeTeam, awayTeam, cache) {
    const key = distributionKey(homeTeam, awayTeam);
    const cached = cache.get(key);
    if (cached)
        return cached;
    const distribution = scoreDistribution(homeTeam, awayTeam);
    cache.set(key, distribution);
    return distribution;
}
function matchPairKey(left, right) {
    return [left, right].sort().join(":");
}
function teamsForVenue(homeTeam, awayTeam, venueCountryCode) {
    if (!venueCountryCode)
        return { homeTeam, awayTeam };
    return {
        homeTeam: { ...homeTeam, isHost: homeTeam.countryCode === venueCountryCode },
        awayTeam: { ...awayTeam, isHost: awayTeam.countryCode === venueCountryCode },
    };
}
function actualScoreForTeams(state, homeTeam, awayTeam) {
    if (!state || state.status !== "final")
        return null;
    if (!state.actualScore90min) {
        throw new Error(`Completed group match ${state.matchId} is missing a 90-minute score.`);
    }
    if (state.homeTeamId === teamKey(homeTeam) && state.awayTeamId === teamKey(awayTeam)) {
        return state.actualScore90min;
    }
    if (state.homeTeamId === teamKey(awayTeam) && state.awayTeamId === teamKey(homeTeam)) {
        return {
            home: state.actualScore90min.away,
            away: state.actualScore90min.home,
        };
    }
    throw new Error(`Completed group match ${state.matchId} participants do not match the resolved fixture.`);
}
function applyStandingScore(homeStanding, awayStanding, score) {
    homeStanding.played += 1;
    awayStanding.played += 1;
    homeStanding.goalsFor += score.home;
    homeStanding.goalsAgainst += score.away;
    awayStanding.goalsFor += score.away;
    awayStanding.goalsAgainst += score.home;
    if (score.home > score.away) {
        homeStanding.points += 3;
        homeStanding.wins += 1;
    }
    else if (score.home < score.away) {
        awayStanding.points += 3;
        awayStanding.wins += 1;
    }
    else {
        homeStanding.points += 1;
        awayStanding.points += 1;
    }
}
function playGroup(group, rng, cache, statesByPair) {
    const standings = new Map(group.map((team) => [teamKey(team), createStanding(team)]));
    for (let homeIndex = 0; homeIndex < group.length; homeIndex += 1) {
        for (let awayIndex = homeIndex + 1; awayIndex < group.length; awayIndex += 1) {
            const homeTeam = group[homeIndex];
            const awayTeam = group[awayIndex];
            const state = statesByPair.get(matchPairKey(teamKey(homeTeam), teamKey(awayTeam)));
            const actualScore = actualScoreForTeams(state, homeTeam, awayTeam);
            const venueTeams = teamsForVenue(homeTeam, awayTeam, state?.venueCountryCode);
            const score = actualScore ?? simulateNinetyMinutes(venueTeams.homeTeam, venueTeams.awayTeam, rng, getDistribution(venueTeams.homeTeam, venueTeams.awayTeam, cache));
            const homeStanding = standings.get(teamKey(homeTeam));
            const awayStanding = standings.get(teamKey(awayTeam));
            if (!homeStanding || !awayStanding) {
                throw new Error("Internal standing state is inconsistent.");
            }
            applyStandingScore(homeStanding, awayStanding, score);
        }
    }
    for (const standing of standings.values()) {
        standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
    }
    return [...standings.values()].sort(compareStandings);
}
function addCount(counts, team, field, value = 1) {
    const entry = counts.get(teamKey(team));
    if (!entry)
        throw new Error(`Unknown team in simulation counts: ${teamKey(team)}`);
    entry[field] += value;
}
function stageFieldForSize(size) {
    if (size >= 32)
        return "qualify32Prob";
    if (size === 16)
        return "qualify16Prob";
    if (size === 8)
        return "qualify8Prob";
    if (size === 4)
        return "qualify4Prob";
    if (size === 2)
        return "finalProb";
    return null;
}
function qualificationRuleFor(groups, teamCount) {
    return groups.length >= 12 && teamCount >= 48 ? "top_two_plus_best_eight_thirds" : "top_two";
}
function qualifierCountFor(groups, rule) {
    return rule === "top_two_plus_best_eight_thirds" ? groups.length * 2 + 8 : groups.length * 2;
}
function incrementGroupRank(rankCounts, team, groupCode, isWinner) {
    if (!isWinner)
        return;
    if (!rankCounts.has(groupCode))
        rankCounts.set(groupCode, new Map());
    const group = rankCounts.get(groupCode);
    if (!group)
        return;
    group.set(teamKey(team), (group.get(teamKey(team)) ?? 0) + 1);
}
function serializeGroupRankProbabilities(rankCounts, simulationCount) {
    const output = {};
    for (const [groupCode, groupCounts] of rankCounts.entries()) {
        output[groupCode] = {};
        for (const [teamId, count] of groupCounts.entries()) {
            output[groupCode][teamId] = round(count / simulationCount);
        }
    }
    return output;
}
function buildGroupRankMap(groupStandings) {
    const output = new Map();
    for (const [groupCode, standings] of groupStandings.entries()) {
        output.set(groupCode, [standings[0]?.team, standings[1]?.team, standings[2]?.team]);
    }
    return output;
}
export function resolveOfficialThirdPlaceSlots(bestThirdGroupsInRankOrder) {
    function assign(index, remaining, current) {
        if (index >= THIRD_PLACE_SLOT_ORDER.length)
            return current;
        const slot = THIRD_PLACE_SLOT_ORDER[index];
        const candidates = bestThirdGroupsInRankOrder.filter((groupCode) => remaining.has(groupCode) && slot.includes(groupCode));
        for (const candidate of candidates) {
            const nextRemaining = new Set(remaining);
            const nextCurrent = new Map(current);
            nextRemaining.delete(candidate);
            nextCurrent.set(slot, candidate);
            const solved = assign(index + 1, nextRemaining, nextCurrent);
            if (solved)
                return solved;
        }
        return null;
    }
    return assign(0, new Set(bestThirdGroupsInRankOrder), new Map()) ?? new Map();
}
function resolveToken(token, groupRanks, thirdPlaceSlots, winners, runnersUp) {
    if (token.startsWith("W"))
        return winners.get(Number(token.slice(1)));
    if (token.startsWith("RU"))
        return runnersUp.get(Number(token.slice(2)));
    const rank = Number(token[0]);
    if (rank === 1 || rank === 2) {
        return groupRanks.get(token[1])?.[rank - 1];
    }
    const groupCode = thirdPlaceSlots.get(token);
    return groupCode ? groupRanks.get(groupCode)?.[2] : undefined;
}
function playOfficialKnockoutBracket(input) {
    const thirdPlaceSlots = resolveOfficialThirdPlaceSlots(input.bestThirdGroupsInRankOrder);
    const winners = new Map();
    const runnersUp = new Map();
    for (const template of OFFICIAL_KNOCKOUT_BRACKET) {
        const homeTeam = resolveToken(template.home, input.groupRanks, thirdPlaceSlots, winners, runnersUp);
        const awayTeam = resolveToken(template.away, input.groupRanks, thirdPlaceSlots, winners, runnersUp);
        if (!homeTeam || !awayTeam) {
            throw new Error(`Cannot resolve official knockout match ${template.matchNo}: ${template.home} vs ${template.away}.`);
        }
        if (template.stageField === "champion") {
            addCount(input.counts, homeTeam, "finalProb");
            addCount(input.counts, awayTeam, "finalProb");
        }
        else if (template.stageField) {
            addCount(input.counts, homeTeam, template.stageField);
            addCount(input.counts, awayTeam, template.stageField);
        }
        const state = input.statesByMatchNumber.get(template.matchNo);
        const venueTeams = teamsForVenue(homeTeam, awayTeam, state?.venueCountryCode);
        let winner;
        if (state?.status === "final") {
            const resolvedPair = matchPairKey(teamKey(homeTeam), teamKey(awayTeam));
            if (!state.homeTeamId || !state.awayTeamId || matchPairKey(state.homeTeamId, state.awayTeamId) !== resolvedPair) {
                throw new Error(`Completed knockout match ${template.matchNo} participants do not match the resolved bracket.`);
            }
            const lockedWinner = [homeTeam, awayTeam].find((team) => teamKey(team) === state.advanceTeamId);
            if (!lockedWinner) {
                throw new Error(`Completed knockout match ${template.matchNo} is missing a valid advancing team.`);
            }
            winner = lockedWinner;
        }
        else {
            const result90 = simulateNinetyMinutes(venueTeams.homeTeam, venueTeams.awayTeam, input.rng, getDistribution(venueTeams.homeTeam, venueTeams.awayTeam, input.cache));
            const simulatedWinner = chooseAdvancementWinner(venueTeams.homeTeam, venueTeams.awayTeam, result90, input.rng);
            winner = teamKey(simulatedWinner) === teamKey(homeTeam) ? homeTeam : awayTeam;
        }
        const runnerUp = winner === homeTeam ? awayTeam : homeTeam;
        winners.set(template.matchNo, winner);
        runnersUp.set(template.matchNo, runnerUp);
        if (template.matchNo === 104) {
            addCount(input.counts, winner, "championProb");
        }
    }
}
function validateCompletedMatchStates(teams, states) {
    const teamById = new Map(teams.map((team) => [teamKey(team), team]));
    const knockoutMatchNumbers = new Set(OFFICIAL_KNOCKOUT_BRACKET.map((match) => match.matchNo));
    const completedGroupPairs = new Set();
    const completedKnockoutNumbers = new Set();
    const supportsOfficialBracket = teams.length === 48 && new Set(teams.map((team) => team.groupCode)).size === 12;
    for (const state of states.filter((entry) => entry.status === "final")) {
        if (!state.homeTeamId || !state.awayTeamId) {
            throw new Error(`Completed match ${state.matchId} is missing participants.`);
        }
        const homeTeam = teamById.get(state.homeTeamId);
        const awayTeam = teamById.get(state.awayTeamId);
        if (!homeTeam || !awayTeam) {
            throw new Error(`Completed match ${state.matchId} contains an unknown participant.`);
        }
        if (state.stage === "group") {
            if (!state.actualScore90min) {
                throw new Error(`Completed group match ${state.matchId} is missing a 90-minute score.`);
            }
            if (homeTeam.groupCode !== awayTeam.groupCode) {
                throw new Error(`Completed group match ${state.matchId} participants are not in the same group.`);
            }
            const pair = matchPairKey(state.homeTeamId, state.awayTeamId);
            if (completedGroupPairs.has(pair)) {
                throw new Error(`Completed group match ${state.matchId} duplicates an already applied fixture.`);
            }
            completedGroupPairs.add(pair);
            continue;
        }
        if (!supportsOfficialBracket) {
            throw new Error(`Completed knockout match ${state.matchId} cannot be applied without the official 48-team bracket.`);
        }
        if (!state.matchNumber || !knockoutMatchNumbers.has(state.matchNumber)) {
            throw new Error(`Completed knockout match ${state.matchId} has an unknown match number.`);
        }
        if (completedKnockoutNumbers.has(state.matchNumber)) {
            throw new Error(`Completed knockout match ${state.matchId} duplicates match number ${state.matchNumber}.`);
        }
        completedKnockoutNumbers.add(state.matchNumber);
        if (!state.advanceTeamId || ![state.homeTeamId, state.awayTeamId].includes(state.advanceTeamId)) {
            throw new Error(`Completed knockout match ${state.matchId} is missing a valid advancing team.`);
        }
    }
    return states.filter((state) => state.status === "final").length;
}
export function simulateTournament(input) {
    const teams = input.teams;
    const simulationCount = input.simulationCount ?? DEFAULT_SIMULATION_COUNT;
    const seed = String(input.seed ?? 2026);
    if (!Array.isArray(teams) || teams.length === 0) {
        throw new Error("teams must contain at least one team.");
    }
    if (!Number.isInteger(simulationCount) || simulationCount <= 0) {
        throw new Error("simulationCount must be a positive integer.");
    }
    const rng = createSeededRng(seed);
    const groups = groupTeams(teams);
    const qualificationRule = qualificationRuleFor(groups, teams.length);
    const qualifierCount = qualifierCountFor(groups, qualificationRule);
    const bestThirdPlaceCount = qualificationRule === "top_two_plus_best_eight_thirds" ? 8 : 0;
    const distributionCache = new Map();
    const groupRankCounts = new Map();
    const groupStatesByPair = new Map((input.matchStates ?? [])
        .filter((state) => state.stage === "group" && state.homeTeamId && state.awayTeamId)
        .map((state) => [matchPairKey(state.homeTeamId, state.awayTeamId), state]));
    const statesByMatchNumber = new Map((input.matchStates ?? [])
        .filter((state) => Number.isInteger(state.matchNumber))
        .map((state) => [state.matchNumber, state]));
    const completedMatchCount = validateCompletedMatchStates(teams, input.matchStates ?? []);
    const counts = new Map(teams.map((team) => [
        teamKey(team),
        {
            teamId: teamKey(team),
            teamCode: teamCode(team),
            teamName: team.name,
            groupWinnerProb: 0,
            groupSecondProb: 0,
            bestThirdProb: 0,
            qualify32Prob: 0,
            qualify16Prob: 0,
            qualify8Prob: 0,
            qualify4Prob: 0,
            finalProb: 0,
            championProb: 0,
        },
    ]));
    for (let simulation = 0; simulation < simulationCount; simulation += 1) {
        const directQualifiers = [];
        const thirdPlaceCandidates = [];
        const groupStandings = new Map();
        for (const [groupCode, group] of groups) {
            const standings = playGroup(group, rng, distributionCache, groupStatesByPair);
            groupStandings.set(groupCode, standings);
            const winner = standings[0]?.team;
            if (winner) {
                addCount(counts, winner, "groupWinnerProb");
                incrementGroupRank(groupRankCounts, winner, groupCode, true);
            }
            if (standings[1]?.team)
                addCount(counts, standings[1].team, "groupSecondProb");
            for (const standing of standings.slice(0, 2)) {
                directQualifiers.push(standing.team);
            }
            if (standings[2])
                thirdPlaceCandidates.push(standings[2]);
        }
        const bestThirdTeams = qualificationRule === "top_two_plus_best_eight_thirds"
            ? thirdPlaceCandidates.slice().sort(compareStandings).slice(0, bestThirdPlaceCount).map((standing) => standing.team)
            : [];
        for (const team of bestThirdTeams)
            addCount(counts, team, "bestThirdProb");
        if (qualificationRule === "top_two_plus_best_eight_thirds" && groups.length === 12) {
            playOfficialKnockoutBracket({
                groupRanks: buildGroupRankMap(groupStandings),
                bestThirdGroupsInRankOrder: bestThirdTeams.map((team) => team.groupCode),
                rng,
                cache: distributionCache,
                counts,
                statesByMatchNumber,
            });
        }
        else {
            let roundTeams = [...directQualifiers, ...bestThirdTeams].slice(0, qualifierCount);
            while (roundTeams.length > 1) {
                const stageField = stageFieldForSize(roundTeams.length);
                if (stageField) {
                    for (const team of roundTeams)
                        addCount(counts, team, stageField);
                }
                const winners = [];
                for (let index = 0; index < Math.floor(roundTeams.length / 2); index += 1) {
                    const homeTeam = roundTeams[index];
                    const awayTeam = roundTeams[roundTeams.length - 1 - index];
                    const result90 = simulateNinetyMinutes(homeTeam, awayTeam, rng, getDistribution(homeTeam, awayTeam, distributionCache));
                    winners.push(chooseAdvancementWinner(homeTeam, awayTeam, result90, rng));
                }
                if (roundTeams.length % 2 === 1)
                    winners.push(roundTeams[Math.floor(roundTeams.length / 2)]);
                roundTeams = winners;
            }
            if (roundTeams[0])
                addCount(counts, roundTeams[0], "championProb");
        }
    }
    const teamStageProbabilities = [...counts.values()]
        .map((entry) => ({
        ...entry,
        groupWinnerProb: round(entry.groupWinnerProb / simulationCount),
        groupSecondProb: round(entry.groupSecondProb / simulationCount),
        bestThirdProb: round(entry.bestThirdProb / simulationCount),
        qualify32Prob: round(entry.qualify32Prob / simulationCount),
        qualify16Prob: round(entry.qualify16Prob / simulationCount),
        qualify8Prob: round(entry.qualify8Prob / simulationCount),
        qualify4Prob: round(entry.qualify4Prob / simulationCount),
        finalProb: round(entry.finalProb / simulationCount),
        championProb: round(entry.championProb / simulationCount),
    }))
        .sort((left, right) => right.championProb - left.championProb || left.teamId.localeCompare(right.teamId));
    const championProbabilities = Object.fromEntries(teamStageProbabilities.map((entry) => [entry.teamId, entry.championProb]));
    return {
        id: `${input.modelVersion ?? DEFAULT_MODEL_VERSION}:${input.dataVersion ?? DEFAULT_DATA_VERSION}:${seed}:${simulationCount}`,
        modelVersion: input.modelVersion ?? DEFAULT_MODEL_VERSION,
        dataVersion: input.dataVersion ?? DEFAULT_DATA_VERSION,
        simulationCount,
        seed,
        generatedAt: input.generatedAt ?? new Date().toISOString(),
        resultScopes: {
            groupStage: "90minResult",
            knockoutProgression: "advanceResult",
        },
        qualificationRule,
        qualifierCount,
        bestThirdPlaceCount,
        completedMatchCount,
        teamStageProbabilities,
        groupRankProbabilities: serializeGroupRankProbabilities(groupRankCounts, simulationCount),
        championProbabilities,
    };
}
