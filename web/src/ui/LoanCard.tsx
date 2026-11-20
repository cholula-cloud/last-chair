"use client";

import { useState } from "react";
import { canRepayLoan, LOAN_TERMS, loanOffered, payoffAmount, winterLoanRate } from "@/game/economy";
import { formatMoney } from "@/game/format";
import type { GameState } from "@/game/state";
import { WarningDiamondIcon } from "@/ui/kit/icons";

const ACTION = "key press flex min-h-14 w-full items-center justify-center px-3 text-center text-base font-extrabold";
const RESERVE = formatMoney(LOAN_TERMS.reserve);

export function LoanCard({ night, onTake, onRepay, repaid }: {
  night: GameState;
  onTake: () => void;
  onRepay: () => void;
  repaid: number;
}) {
  const [declined, setDeclined] = useState(false);
  const { loan } = night;
  const offered = loanOffered(night);
  const amount = formatMoney(LOAN_TERMS.principal);

  if (repaid > 0) {
    return <p role="status" className="chip mt-3 px-3.5 py-3 font-bold">Winter loan repaid. The bank has its {formatMoney(repaid)} and you have your sleep back.</p>;
  }

  if (loan) {
    const payoff = payoffAmount(loan);
    return (
      <section className="panel mt-3 px-3.5 py-3" aria-label="Winter loan">
        <p className="text-base font-extrabold">You owe the bank {formatMoney(payoff)} on the winter loan</p>
        {canRepayLoan(night) ? (
          <button type="button" className={`${ACTION} mt-2`} onClick={onRepay}>
            Repay the loan
          </button>
        ) : (
          <p className="mt-1 text-sm font-bold text-ink-soft">Not yet. Repaying has to leave at least {RESERVE} in the till for the morning.</p>
        )}
      </section>
    );
  }

  if (!offered) return null;

  if (declined) {
    return (
      <button type="button" className={`${ACTION} mt-3`} onClick={() => setDeclined(false)}>
        Review loan offer
      </button>
    );
  }

  return (
    <section className="panel mt-3 px-3.5 py-3" aria-label="Bank loan offer">
      <p className="flex items-center gap-2 text-base font-extrabold">
        <WarningDiamondIcon size={20} className="shrink-0" />
        The bank has a winter loan for you
      </p>
      <p className="mt-1 text-sm font-bold leading-snug text-ink-soft">
        The bank will lend you {amount} at {Math.round(winterLoanRate(night) * 100)}% simple interest for the winter. Pay it back in full any night you can still keep {RESERVE} for the morning.
      </p>
      <div className="mt-3 grid gap-2">
        <button type="button" className={`${ACTION} key-solid [--key-fill:var(--sign-yellow)]`} onClick={onTake}>
          Take the {amount} loan
        </button>
        <button type="button" className={ACTION} onClick={() => setDeclined(true)}>
          Not tonight
        </button>
      </div>
    </section>
  );
}
