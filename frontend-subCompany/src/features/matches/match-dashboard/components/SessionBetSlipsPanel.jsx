import { BetSlipPanel } from "./BetSlipsPanel";

export default function SessionBetSlipsPanel(props) {
  const bets = props.bets.filter((bet) => bet.marketType === "session");
  return (
    <BetSlipPanel
      {...props}
      bets={bets}
      title="Session Bet Slips"
      subtitle="Session market bets placed by users"
    />
  );
}
