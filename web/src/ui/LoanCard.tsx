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
  const rate = winterLoanRate(night);
  const principal = formatMoney(LOAN_TERMS.principal);

  if (repaid > 0) {
    return <p role="status" className="well-white mt-3 px-3.5 py-2.5 text-sm font-bold">Winter loan paid off in full.</p>;
  }

  if (loan) {
    const payoff = payoffAmount(loan);
    return (
      <section className="well-white mt-3 px-3.5 py-3" aria-label="Winter loan">
        <p className="text-base font-extrabold">Loan balance: {formatMoney(payoff)}.</p>
        {canRepayLoan(night) ? (
          <button type="button" className={`${ACTION} mt-2`} onClick={onRepay}>
            Repay loan ({formatMoney(payoff)})
          </button>
        ) : (
          <p className="mt-1 text-sm font-bold text-ink-soft">Keep {RESERVE} on hand to repay.</p>
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
        Borrow {principal} at {Math.round(rate * 100)}% interest for the winter. Repay in full any night you can keep {RESERVE} on hand.
      </p>
      <div className="mt-3 grid gap-2">
        <button type="button" className={`${ACTION} key-solid [--key-fill:var(--sign-yellow)]`} onClick={onTake}>
          Take the {principal} loan
        </button>
        <button type="button" className={ACTION} onClick={() => setDeclined(true)}>
          Not tonight
        </button>
      </div>
    </section>
  );
}