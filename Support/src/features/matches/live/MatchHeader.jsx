import { useNavigate, useParams } from "react-router-dom";
import { C, MATCH } from "./constants";

export default function MatchHeader() {
    const navigate = useNavigate();
    const { matchId } = useParams();

    const handleManual = () => {
        navigate(`/support/matches/${matchId}/manual`);
    };

    return (
        <>
            {/* Start Manual */}
            <div className="flex justify-end mb-3">
                <button
                    onClick={handleManual}
                    className="group text-white text-lg cursor-pointer font-bold px-6 py-2.5 rounded-lg 
               transition-all duration-300 ease-out 
               hover:scale-105 hover:shadow-lg 
               active:scale-95
               shadow-md relative overflow-hidden"
                    style={{ background: C.startManual }}
                >
                    <span className="relative z-10 flex items-center gap-2">
                        Start Manual
                        <svg
                            className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </span>
                </button>
            </div>

            {/* Subtitle */}
            <div className="text-center text-gray-500 text-sm mb-2">
                {MATCH.Toss}
            </div>

            {/* Ball-by-ball numbers */}
            <div className="flex justify-center gap-4 mb-3 text-gray-600 text-sm">
                {MATCH.balls.map((b, i) => <span key={i}>{b}</span>)}
            </div>

            {/* Match badge */}
            <div className="flex justify-center mb-3">
                <span
                    className="text-white text-sm font-semibold px-6 py-1.5 rounded-full"
                    style={{ background: C.matchBadge }}
                >
                    Match : {MATCH.homeTeam} VS {MATCH.awayTeam}
                </span>
            </div>

            {/* Score row */}
            <div className="grid grid-cols-3 border border-gray-300 rounded overflow-hidden mb-4 bg-white">
                <div className="py-2.5 pl-4 text-sm font-bold" style={{ color: C.notText }}>
                    {MATCH.homeTeam.slice(0, 3).toUpperCase()}
                </div>
                <div
                    className="py-2.5 text-xl font-bold text-white text-center"
                    style={{ background: C.openBtn }}
                >
                    {MATCH.centerScore}
                </div>
                <div className="py-2.5 pr-4 text-sm font-bold text-right" style={{ color: C.notText }}>
                    {MATCH.score}
                </div>
            </div>
        </>
    );
}