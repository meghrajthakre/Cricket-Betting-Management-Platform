export const MAX_BALLS = 150;

export function parseButtonAction(label) {
    const upper = (label || "").toUpperCase().trim();
    if (upper === "BET OPEN") return { marketStatus: "OPEN", statusLabel: "BET OPEN" };
    if (upper === "BET CLOSED") return { marketStatus: "CLOSED", statusLabel: "BET CLOSED" };
    if (upper === "SCORE BACK") return { isUndo: true, statusLabel: label };
    if (upper === "NOT OUT") return { statusLabel: "NOT OUT", isNotOutReview: true };

    const comboMatch = upper.match(/^(\d+)\s*\+\s*(WIDE BALL|NO BALL|OUT)$/);
    if (comboMatch) {
        const runs = parseInt(comboMatch[1], 10) || 0;
        const kind = comboMatch[2];
        if (kind === "OUT") return { runs, wickets: 1, advanceBall: true, statusLabel: label };
        return { runs: runs + 1, advanceBall: false, statusLabel: label, isExtra: true };
    }

    if (upper === "WIDE BALL + OUT") {
        return { runs: 1, wickets: 1, advanceBall: false, statusLabel: label, isExtra: true };
    }

    const runMatch = upper.match(/^(\d+)\s*RUN$/);
    if (runMatch) {
        return { runs: parseInt(runMatch[1], 10) || 0, advanceBall: true, statusLabel: label };
    }

    if (upper === "WIDE BALL" || upper === "NO BALL") {
        return { runs: 1, advanceBall: false, statusLabel: label, isExtra: true };
    }
    if (upper === "OUT") return { wickets: 1, advanceBall: true, statusLabel: label };
    return { statusLabel: label };
}

export function advanceOverByOneBall(overs) {
    const value = Number(overs) || 0;
    const wholeOvers = Math.floor(value);
    const balls = Math.round((value - wholeOvers) * 10) + 1;
    return balls >= 6 ? wholeOvers + 1 : Number(`${wholeOvers}.${balls}`);
}

export function reverseOverByOneBall(overs) {
    const value = Number(overs) || 0;
    if (value <= 0) return 0;
    const wholeOvers = Math.floor(value);
    const balls = Math.round((value - wholeOvers) * 10) - 1;
    return balls < 0
        ? Number(`${Math.max(0, wholeOvers - 1)}.5`)
        : Number(`${wholeOvers}.${balls}`);
}
