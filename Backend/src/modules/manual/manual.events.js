"use strict";

// Manages SSE clients and broadcasting per-match
const clients = new Map(); // matchId -> Set(res)

function addClient(res, matchId = 'all') {
    if (!clients.has(matchId)) clients.set(matchId, new Set());
    clients.get(matchId).add(res);
}

function removeClient(res, matchId) {
    if (!clients.has(matchId)) return;
    clients.get(matchId).delete(res);
    if (clients.get(matchId).size === 0) clients.delete(matchId);
}

function sendEventObject(res, obj) {
    try {
        res.write(`data: ${JSON.stringify(obj)}\n\n`);
    } catch (err) {
        // ignore
    }
}

function broadcast(matchId, eventObj) {
    // send to specific match clients
    const setForMatch = clients.get(matchId);
    if (setForMatch) {
        for (const res of setForMatch) {
            sendEventObject(res, eventObj);
        }
    }

    // send to 'all' subscribers
    const setAll = clients.get('all');
    if (setAll) {
        for (const res of setAll) {
            sendEventObject(res, eventObj);
        }
    }
}

// heartbeat: send comment line every 25s to keep proxies alive
const heartbeatTimer = setInterval(() => {
    for (const [, set] of clients) {
        for (const res of set) {
            try {
                res.write(':heartbeat\n\n');
            } catch (err) {
                // ignore
            }
        }
    }
}, 25000);
heartbeatTimer.unref();

module.exports = { addClient, removeClient, broadcast };
