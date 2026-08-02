export const C = {
    headerBg: "#4a6fa5",
    laGaiBg: "#b8d4e8",
    khaiBg: "#ffa0b4",
    laGaiCell: " #75C2FD",
    khaiCell: "#F594AA",
    actionHeader: "#b0bec5",
    suspendBtn: "#f5a623",
    openBtn: "#2e7d32",
    startManual: "#d9534f",
    submitBtn: "#3a9fbf",
    optionsBtn: "#4caf50",
    deleteBtn: "#f5a623",
    showingText: "#2e7d32",
    notText: "#d9534f",
    matchBadge: "#2c3e6b",
};

export const MATCH = {
    homeTeam: "Bangladesh",
    awayTeam: "Australia",
    score: "AUS 25-3 (6.5)",
    centerScore: "W",
    balls: [1, 2, 0, 0, 3, 0],
    Toss: "Australia opt to bat",
};

export const RUNNERS_INIT = [
    { name: "Bangladesh", lagai: "0.37", khai: "0.39", status: "open" },
    { name: "Australia", lagai: "", khai: "", status: "suspend" },
];

export const SESSIONS_INIT = [
    { name: "10 Over Runs AUS Adv", noRun: 40, noRate: "1.0", yesRun: 42, yesRate: "1.0", suspended: false },
    { name: "50 Over Runs AUS Adv", noRun: 207, noRate: "1.0", yesRun: 210, yesRate: "1.0", suspended: false },
    { name: "J Inglis Runs", noRun: 35, noRate: "1.1", yesRun: 36, yesRate: "0.9", suspended: false },
    { name: "Fall of 4th wkt Runs AUS Adv", noRun: 52, noRate: "1.1", yesRun: 53, yesRate: "0.9", suspended: false },
    { name: "A Carey Runs", noRun: 36, noRate: "1.1", yesRun: 37, yesRate: "0.9", suspended: false },
];

export const MANAGEMENT_INIT = [
    { name: "50OverRunsAUSAdv", status: "Showing", diff: "3", visible: true },
    { name: "JInglisRuns", status: "Showing", diff: "1", visible: true },
    { name: "10OverRunsAUSAdv", status: "Showing", diff: "2", visible: true },
    { name: "ACareyRuns", status: "Showing", diff: "1", visible: true },
    { name: "Fallof4thwktRunsAUSAdv", status: "Showing", diff: "1", visible: true },
    { name: "6OverRunsAUS", status: "Not", diff: "1", visible: false },
    { name: "4.3OverRunsAUS", status: "Not", diff: "1", visible: false },
    { name: "9OverRunsAUS", status: "Not", diff: "1", visible: false },
    { name: "5.1BallRunAUS", status: "Not", diff: "1", visible: false },
    { name: "4.6BallRunAUS", status: "Not", diff: "1", visible: false },
    { name: "4.5BallRunAUS", status: "Not", diff: "1", visible: false },
    { name: "5.3OverRunsAUS", status: "Not", diff: "1", visible: false },
    { name: "4.4BallRunAUS", status: "Not", diff: "1", visible: false },
    { name: "4.3BallRunAUS", status: "Not", diff: "1", visible: false },
    { name: "4.2BallRunAUS", status: "Not", diff: "1", visible: false },
    { name: "Only6OverRunsAUS", status: "Not", diff: "1", visible: false },
    { name: "5OverRunsAUS", status: "Not", diff: "1", visible: false },
    { name: "4.1BallRunAUS", status: "Not", diff: "1", visible: false },
    { name: "3.6BallRunAUS", status: "Not", diff: "1", visible: false },
];
