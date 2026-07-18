"use strict";

const dummySessions = [
  "10 Over Runs Team 1",
  "10 Over Runs Team 2",
  "20 Over Runs Team 1",
  "20 Over Runs Team 2",
  "30 Over Runs Team 1",
  "30 Over Runs Team 2",
  "Match 1st Over Runs",
  "50 Over Runs Team 1",
  "50 Over Runs Team 2",
  "Fall of 1st Wicket Team 1",
  "Fall of 1st Wicket Team 2",
  "Fall of 2nd Wicket Team 1",
  "Fall of 2nd Wicket Team 2",
  "1st 2 Wicket Runs Team 1",
  "1st 2 Wicket Runs Team 2",
  "1st 3 Wicket Runs Team 1",
  "1st 3 Wicket Runs Team 2",
  "1st 4 Wicket Runs Team 1",
  "1st 4 Wicket Runs Team 2",
  "1st 5 Wicket Runs Team 1",
  "1st 5 Wicket Runs Team 2",
  "Highest Opening Partnership",
  "Team 1 Total Fours",
  "Team 2 Total Fours",
  "Team 1 Total Sixes",
  "Team 2 Total Sixes",
  "Highest Individual Score Team 1",
  "Highest Individual Score Team 2",
  "Total Match Sixes",
  "Total Match Fours",
].map((sessionName, index) => {
  const noRun = 25 + (index * 5);
  const specialRate = index % 3 !== 0;

  return {
    id: `session_${String(index + 1).padStart(3, "0")}`,
    sessionName,
    status: "suspend",
    manuallySuspended: false,
    lockStatus: "unlock",
    rateDiff: 1,
    noRun,
    noRate: specialRate ? 1.1 : 1,
    yesRun: noRun + 1,
    yesRate: specialRate ? 0.9 : 1,
    group: "default",
    maxAmount: 500000,
    oddEven: "no",
    isVisible: false,
    visibilityVersion: 2,
    displayOrder: index + 1,
  };
});

module.exports = Object.freeze(
  dummySessions.map((session) => Object.freeze(session))
);
