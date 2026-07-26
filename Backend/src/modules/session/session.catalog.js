"use strict";

const dummySessions = require("../../data/dummySessions");

const sessionTemplate = (matchId, sessionId) => {
  const template = dummySessions.find((session) => String(session.id) === String(sessionId));
  if (!template) return null;
  return {
    ...template,
    matchId,
    yesRun: Number(template.noRun) + Number(template.rateDiff || 1),
    resultStatus: "pending",
    resultRun: null,
    settledAt: null,
    settledBy: null,
  };
};

const sessionTemplates = (matchId) =>
  dummySessions.map((session) => sessionTemplate(matchId, session.id));

module.exports = { sessionTemplate, sessionTemplates };
