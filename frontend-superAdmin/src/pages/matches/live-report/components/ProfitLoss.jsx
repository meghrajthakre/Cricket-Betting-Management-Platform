import { formatNumber } from "../utils/reportCalculations";

export default function ProfitLoss({ value }) {
  const amount = Number(value || 0);
  return (
    <span
      className={
        amount < 0
          ? "font-semibold text-red-600"
          : "font-semibold text-green-600"
      }
    >
      {formatNumber(amount)}
    </span>
  );
}
