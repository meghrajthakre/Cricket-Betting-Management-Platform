import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import MatchHeader from "./MatchHeader";
import RunnerTable from "./RunnerTable";
import SessionTable from "./SessionTable";
import Controls from "./Controls";
import SessionManagement from "./SessionManagement";
import { apiClient } from "../../../../services/api"; 
import { C, MATCH } from "./constants";

export default function ManualPage() {
    const { matchId } = useParams();
    const [rateDiff, setRateDiff] = useState(1);

    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchMatch = useCallback(async () => {
        if (!matchId) return;
        setLoading(true);
        setError("");
        try {
            const { data } = await apiClient.get(`/matches/saved/${matchId}`);
            setMatch(data.data || null);
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Failed to fetch match");
        } finally {
            setLoading(false);
        }
    }, [matchId]);

    useEffect(() => {
        fetchMatch();
    }, [fetchMatch]);

    return (
        <div className="min-h-screen bg-gray-100 font-sans text-sm">
            <div className="max-w-5xl mx-auto py-6 px-4">
                <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-1 md:p-6">
                    {loading && (
                        <div className="text-center text-gray-400 py-10">Loading match...</div>
                    )}

                    {!loading && error && (
                        <div className="text-center text-red-500 py-10">{error}</div>
                    )}

                    {!loading && !error && (
                        <>
                            <MatchHeader match={match} />
                            <RunnerTable rateDiff={rateDiff} match={match} />
                            <SessionTable match={match} />
                            <Controls rateDiff={rateDiff} setRateDiff={setRateDiff} />
                            <SessionManagement match={match} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}