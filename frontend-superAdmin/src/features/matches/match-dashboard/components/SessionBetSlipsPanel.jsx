import { BetSlipPanel } from "./BetSlipsPanel";

export default function SessionBetSlipsPanel(props) {
  const bets = props.bets.filter(
    (bet) => bet.marketType === "session" && bet.status === "pending",
  );
  return <BetSlipPanel {...props} bets={bets} title="Pending Session Bet Slips" subtitle="Pending session market bets placed by users" />;
}
