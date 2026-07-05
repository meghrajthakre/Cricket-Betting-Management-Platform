import React from "react";

export default function ScoreOdds({ runners }) {
  return (
    <div className="w-full mt-3">
      <div className="border border-gray-200 rounded-sm overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1.1fr_1fr_1fr]">
          <div className="bg-[#4a80a0] text-white font-bold text-sm sm:text-base text-center py-3">
            RUNNER
          </div>
          <div className="bg-[#a9c8d8] text-[#2b3a55] font-bold text-sm sm:text-base text-center py-3">
            LAGAI
          </div>
          <div className="bg-[#f2b8b8] text-[#2b3a55] font-bold text-sm sm:text-base text-center py-3">
            KHAI
          </div>
        </div>

        {/* Rows */}
        {runners.map((runner, idx) => (
          <div
            key={runner.name}
            className={`grid grid-cols-[1.1fr_1fr_1fr] ${
              idx % 2 === 0 ? "bg-[#e9e9e9]" : "bg-white"
            } border-t border-gray-200`}
          >
            <div className="flex items-center pl-4 py-4 text-[#2b3a55] font-bold text-sm sm:text-base">
              {runner.name}
            </div>
            <div className="flex items-center justify-center py-4 text-sm sm:text-base text-[#2b3a55] font-semibold">
              {runner.lagai ?? ""}
            </div>
            <div className="flex items-center justify-center py-4 text-sm sm:text-base text-[#2b3a55] font-semibold">
              {runner.khai ?? ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}