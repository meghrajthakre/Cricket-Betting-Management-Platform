# Bet Transaction Lifecycle Report

## 1. Scope

This report documents the current betting flow from the user clicking **Place Bet** until MongoDB commits the wallet, bet, and ledger records. It also covers winning/losing settlement, match exposure, cancellation, and session-settlement reversal.

The IDs and balances below are examples. The object shape follows the current application code.

## 2. Main database collections

| Collection | Purpose |
|---|---|
| `users` | Current user wallet balance is stored in `coins`. |
| `bets` | Bet terms, liability, profit, status, ownership snapshot, and settlement details. |
| `ledgers` | Immutable wallet debit/credit audit entries with before/after balances. |
| `sessions` | Session market state and declared result. |
| `manualrunners` | Match runners and current Lagai/Khai rates. |
| `manualsettings` | Match/session locks and market status. |
| `manualoptions` | Bet delay and maximum-bet configuration. |

## 3. Placement request

The frontend creates one unique `clientBetId` for the request. It is used to reject the same request if a network retry sends it again.

### Session YES request example

```json
{
  "userId": "66b100000000000000000001",
  "matchId": "match-ipl-101",
  "marketType": "session",
  "marketId": "powerplay-runs",
  "amount": 100,
  "rate": 51,
  "sessionRate": 1,
  "type": "yes",
  "clientBetId": "36ecf5d2-f6a7-4d38-bc97-f15fa4454470"
}
```

Important meanings:

- `amount`: stake entered by the user.
- `rate`: selected match rate or session run line.
- `sessionRate`: session payout/liability multiplier.
- `type=yes`: user expects the result to be equal to or above the session line.
- `type=no`: user expects the result to remain below the session line.
- `clientBetId`: idempotency key for duplicate-request protection.

The authenticated token is authoritative for the user identity. A request cannot place a bet for a different arbitrary user.

## 4. Validation and market checks

The request passes through the following checks:

1. Authentication: only the `user` role may place a bet.
2. Rate limiter: rapid abusive requests are limited.
3. Payload validation:
   - amount must be positive, finite, and have at most two decimal places;
   - rate must be at least 1, finite, and have at most two decimal places;
   - type must be `yes` or `no`;
   - market type must be `match` or `session`;
   - session bets require `sessionRate`;
   - unknown request properties are rejected.
4. Initial market read:
   - market exists;
   - market is open;
   - match/session is not locked or suspended;
   - session is visible;
   - selected rate is still current;
   - amount is within the configured maximum.
5. Configured in-play delay is applied.
6. Final authoritative market read repeats the market, lock, rate, and limit checks.

If the rate changed during the delay, the request is rejected with `PRICE_CHANGED`. No wallet, bet, or ledger record is committed.

## 5. Financial calculation

### Match YES / Lagai

```text
amount = 100
rate = 90
profit = (100 × 90) / 100 = 90
liability = 100
```

### Match NO / Khai

```text
amount = 100
rate = 90
profit = 100
liability = (100 × 90) / 100 = 90
```

### Session YES

```text
amount = 100
sessionRate = 1
profit = 100 × 1 = 100
liability = 100
```

### Session NO

```text
amount = 100
sessionRate = 1.25
profit = 100
liability = 100 × 1.25 = 125
```

All current calculations are rounded to two decimal places.

## 6. Session-bet MongoDB transaction

Session bets reserve their liability independently. The following operations run in one MongoDB transaction:

```text
Start transaction
  → load and validate user
  → revalidate session market inside transaction
  → reject duplicate clientBetId
  → capture company/share hierarchy snapshot
  → calculate balanceBefore and balanceAfter
  → create immutable ledger debit
  → update users.coins
  → create pending bet
Commit transaction
```

Although the code executes these operations in order, other clients only receive the committed result. If any step fails, MongoDB rolls all steps back.

### User object before placement

```json
{
  "_id": "66b100000000000000000001",
  "username": "demo_user",
  "role": "user",
  "coins": 1000,
  "isActive": true,
  "rootSuperAdminId": "66b100000000000000000099"
}
```

### Bet object saved in `bets`

```json
{
  "_id": "66b200000000000000000001",
  "userId": "66b100000000000000000001",
  "rootSuperAdminId": "66b100000000000000000099",
  "ownerPath": ["66b100000000000000000099"],
  "shareSnapshot": [],
  "matchId": "match-ipl-101",
  "marketType": "session",
  "marketId": "powerplay-runs",
  "amount": 100,
  "rate": 51,
  "sessionRun": 51,
  "sessionRate": 1,
  "type": "yes",
  "profit": 100,
  "loss": 100,
  "walletAdjustment": 100,
  "clientBetId": "36ecf5d2-f6a7-4d38-bc97-f15fa4454470",
  "correlationId": "36ecf5d2-f6a7-4d38-bc97-f15fa4454470",
  "status": "pending",
  "createdAt": "2026-08-07T10:30:00.000Z",
  "updatedAt": "2026-08-07T10:30:00.000Z"
}
```

### Placement ledger object saved in `ledgers`

```json
{
  "_id": "66b300000000000000000001",
  "userId": "66b100000000000000000001",
  "amount": 100,
  "type": "debit",
  "reason": "YES session bet placed on match match-ipl-101 (liability)",
  "transactionCode": "SESSION_BET_LIABILITY_RESERVED",
  "referenceType": "bet",
  "referenceId": "66b200000000000000000001",
  "correlationId": "36ecf5d2-f6a7-4d38-bc97-f15fa4454470",
  "matchId": "match-ipl-101",
  "marketType": "session",
  "marketId": "powerplay-runs",
  "createdBy": "66b100000000000000000001",
  "balanceBefore": 1000,
  "balanceAfter": 900,
  "createdAt": "2026-08-07T10:30:00.000Z"
}
```

### User object after placement

```json
{
  "_id": "66b100000000000000000001",
  "username": "demo_user",
  "coins": 900
}
```

The ledger `referenceId` equals the bet `_id`, and both records share the same `correlationId`.

## 7. Match-bet exposure transaction

Match bets use worst-case **net exposure** across all runners instead of debiting every liability independently.

### First bet

```text
User bets YES 100 on Team A at rate 90
Worst-case exposure = 100
walletAdjustment = +100
Wallet: 1000 → 900
Ledger: debit 100, MATCH_EXPOSURE_RESERVED
```

### Opposite hedge bet

```text
User bets YES 100 on Team B at rate 90
New worst-case exposure = 10
Previously reserved = 100
walletAdjustment = 10 - 100 = -90
Wallet: 900 → 990
Ledger: credit 90, MATCH_HEDGE_EXPOSURE_RELEASED
```

### Hedging bet object

```json
{
  "_id": "66b200000000000000000003",
  "userId": "66b100000000000000000001",
  "matchId": "match-ipl-101",
  "marketType": "match",
  "marketId": "team-b",
  "amount": 100,
  "rate": 90,
  "type": "yes",
  "profit": 90,
  "loss": 100,
  "walletAdjustment": -90,
  "clientBetId": "1b9e7070-1f91-46fd-a50c-a25332fcd719",
  "correlationId": "1b9e7070-1f91-46fd-a50c-a25332fcd719",
  "status": "pending"
}
```

A positive `walletAdjustment` means wallet debit. A negative value means hedge collateral was released and credited. A zero adjustment creates the bet without a wallet ledger movement.

## 8. Successful API response

After transaction commit, the placement API responds:

```json
{
  "success": true,
  "message": "Bet placed successfully",
  "data": {
    "_id": "66b200000000000000000001",
    "matchId": "match-ipl-101",
    "marketType": "session",
    "marketId": "powerplay-runs",
    "amount": 100,
    "rate": 51,
    "type": "yes",
    "profit": 100,
    "loss": 100,
    "walletAdjustment": 100,
    "status": "pending"
  },
  "balance": 900
}
```

For a session bet, an SSE `SESSION_BET_PLACED` event is broadcast after the database transaction succeeds.

## 9. Duplicate request handling

The database has a unique compound index on:

```json
{
  "userId": 1,
  "clientBetId": 1
}
```

If the same user/request is retried with the same `clientBetId`:

```json
{
  "success": false,
  "error": "Duplicate bet request",
  "code": "DUPLICATE_BET"
}
```

No second wallet debit, ledger entry, or bet is committed.

## 10. Session settlement

The session result determines each pending bet:

```text
YES wins when resultRun >= sessionRun
NO wins when resultRun < sessionRun
```

### Winning session bet

Liability was already debited at placement, so settlement credits:

```text
creditAmount = profit + loss
```

Example:

```text
Balance after placement = 900
Profit = 100
Reserved liability returned = 100
Settlement credit = 200
Final balance = 1100
```

Winning bet after update:

```json
{
  "_id": "66b200000000000000000001",
  "status": "won",
  "resultRun": 55,
  "settledAt": "2026-08-07T11:00:00.000Z",
  "settledBy": "66b100000000000000000050"
}
```

Winning ledger object:

```json
{
  "userId": "66b100000000000000000001",
  "amount": 200,
  "type": "credit",
  "transactionCode": "SESSION_BET_WIN_PAID",
  "referenceType": "bet",
  "referenceId": "66b200000000000000000001",
  "correlationId": "36ecf5d2-f6a7-4d38-bc97-f15fa4454470",
  "matchId": "match-ipl-101",
  "marketType": "session",
  "marketId": "powerplay-runs",
  "balanceBefore": 900,
  "balanceAfter": 1100,
  "createdBy": "66b100000000000000000050"
}
```

### Losing session bet

The bet status becomes `lost`. There is no new wallet movement because the liability was already debited when the bet was placed.

```json
{
  "_id": "66b200000000000000000001",
  "status": "lost",
  "resultRun": 49,
  "settledAt": "2026-08-07T11:00:00.000Z",
  "settledBy": "66b100000000000000000050"
}
```

## 11. Match settlement

For each user's pending match bets, the system calculates:

```text
reserved = sum of walletAdjustment values
netPnl = total outcome profit/loss for the winning runner
adjustment = reserved + netPnl
```

- Positive adjustment: ledger credit.
- Negative adjustment: ledger debit.
- Zero adjustment: no ledger entry.

Match-settlement ledger example:

```json
{
  "userId": "66b100000000000000000001",
  "amount": 190,
  "type": "credit",
  "reason": "Match match-ipl-101 settled; winner team-a",
  "transactionCode": "MATCH_SETTLEMENT_CREDIT",
  "referenceType": "match",
  "referenceId": "match-ipl-101",
  "correlationId": "match-settlement:match-ipl-101:66b400000000000000000001",
  "matchId": "match-ipl-101",
  "marketType": "match",
  "marketId": "team-a",
  "balanceBefore": 900,
  "balanceAfter": 1090
}
```

All affected bets are changed from `pending` to `won` or `lost` in the same transaction.

## 12. Pending bet cancellation

Only a pending bet can be cancelled. The system recalculates exposure before moving wallet funds.

### Session cancellation example

```text
Placement reserved liability = 100
Cancellation releases liability = 100
Wallet: 900 → 1000
```

Cancelled bet:

```json
{
  "_id": "66b200000000000000000001",
  "status": "cancelled",
  "settledAt": "2026-08-07T10:45:00.000Z",
  "settledBy": "66b100000000000000000099"
}
```

Cancellation ledger:

```json
{
  "amount": 100,
  "type": "credit",
  "transactionCode": "BET_CANCELLATION_EXPOSURE_RELEASED",
  "referenceType": "bet",
  "referenceId": "66b200000000000000000001",
  "correlationId": "36ecf5d2-f6a7-4d38-bc97-f15fa4454470",
  "balanceBefore": 900,
  "balanceAfter": 1000
}
```

Cancelling a hedge may increase exposure. In that case the cancellation produces a debit with `BET_CANCELLATION_EXPOSURE_INCREASED`. If the user cannot fund that increase, the entire cancellation rolls back.

## 13. Session-settlement reversal

When a settled session is reversed:

1. Only a session with `resultStatus=settled` is accepted.
2. Every winning payout is debited back from the relevant wallet.
3. A `SESSION_SETTLEMENT_REVERSED` ledger entry is created per previously winning bet.
4. Won/lost bets return to `pending`.
5. Bet `resultRun`, `settledAt`, and `settledBy` are cleared.
6. Session result returns to `pending`.
7. Previous session status, lock, and visibility are restored.
8. The session can be settled again with the corrected result.

Reversal ledger example:

```json
{
  "userId": "66b100000000000000000001",
  "amount": 200,
  "type": "debit",
  "reason": "Reversed settlement of Powerplay Runs",
  "transactionCode": "SESSION_SETTLEMENT_REVERSED",
  "referenceType": "bet",
  "referenceId": "66b200000000000000000001",
  "correlationId": "36ecf5d2-f6a7-4d38-bc97-f15fa4454470",
  "matchId": "match-ipl-101",
  "marketType": "session",
  "marketId": "powerplay-runs",
  "balanceBefore": 1100,
  "balanceAfter": 900
}
```

If a winning user no longer has enough balance to return the payout, reversal is rejected and every reversal change rolls back.

## 14. Failure and rollback matrix

| Failure | Result |
|---|---|
| Invalid payload | Request rejected before transaction. |
| User inactive/invalid | No database movement. |
| Market locked/suspended | No database movement. |
| Rate changed during delay | `PRICE_CHANGED`; no database movement. |
| Maximum bet exceeded | No database movement. |
| Insufficient wallet | No bet or ledger entry. |
| Duplicate `clientBetId` | `DUPLICATE_BET`; no second movement. |
| Ledger creation fails | Wallet and bet changes roll back. |
| User wallet save fails | Ledger and bet changes roll back. |
| Bet creation fails | Wallet and ledger changes roll back. |
| Concurrent settlement/cancellation | Only one transaction succeeds. |

## 15. Complete correlation example

The complete lifecycle of one winning session bet can be queried by correlation ID:

```text
correlationId = 36ecf5d2-f6a7-4d38-bc97-f15fa4454470

bets
  └── Bet 66b200...001

ledgers
  ├── debit 100: SESSION_BET_LIABILITY_RESERVED
  ├── credit 200: SESSION_BET_WIN_PAID
  └── debit 200: SESSION_SETTLEMENT_REVERSED (only if reversed)
```

Example MongoDB audit query:

```javascript
db.bets.find({ correlationId: "36ecf5d2-f6a7-4d38-bc97-f15fa4454470" })

db.ledgers.find({
  correlationId: "36ecf5d2-f6a7-4d38-bc97-f15fa4454470"
}).sort({ createdAt: 1 })
```

This gives the bet terms and every related wallet movement without parsing human-readable ledger reasons.

## 16. Current audit guarantees

- Bet, wallet, and ledger placement changes are atomic.
- Ledger entries store balance before and balance after.
- Ledger entries are immutable through the normal update APIs.
- Each new frontend bet request carries a duplicate-protection ID.
- Placement ledger entries directly reference their bet.
- Settlement, cancellation, and reversal retain the original correlation ID.
- Match settlement uses one correlation ID across all affected user wallet movements.
- Existing legacy records remain readable even if they do not contain the newer audit fields.

