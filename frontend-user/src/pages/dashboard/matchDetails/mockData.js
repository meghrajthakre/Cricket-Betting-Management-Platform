export const MOCK_DATA = {
    match: {
        team1: "England Women",
        team2: "India Women",
        score: "47/1 (7.1 Ovs)",
        toss: "England Women opt to bat",
        status: "BET OPEN",
    },
    recentBalls: ["4", "1", "4", "1"],
    thisOver: { runs: 12, balls: "Over 8 -", dot: "•", extraRuns: 0 },
    bookmaker: { min: 50, max: 500000 },
    sessions: [
        { name: "8 Over ENGW", no: { rate: 53, size: 1.00 }, yes: { rate: 54, size: 1.00 } },
        { name: "10 Over ENGW", no: { rate: 69, size: 1.00 }, yes: { rate: 70, size: 1.00 } },
        { name: "20 Over ENGW", no: { rate: 159, size: 1.00 }, yes: { rate: 161, size: 1.00 } },
        { name: "D Wyatt-Hodge Runs", no: { rate: 47, size: 1.10 }, yes: { rate: 47, size: 0.90 } },
        { name: "A Jones Runs", no: { rate: 30, size: 1.10 }, yes: { rate: 30, size: 0.90 } },
        { name: "1st 2 Wkt ENGW", no: { rate: 69, size: 1.10 }, yes: { rate: 69, size: 0.90 } },
    ],
    evenOdd: {
        market: "England Women 10 Over Last Digit Even Odd",
        runners: [
            { name: "Even", rate: 0.97, position: 0 },
            { name: "Odd", rate: 0.97, position: 0 },
        ],
    },
};
