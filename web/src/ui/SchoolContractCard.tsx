import { dayLabel, seasonCalendar } from "@/game/calendar";
import { formatMoney } from "@/game/format";
import { schoolContractOfferDay } from "@/game/rules";
import { SCHOOL_BUS_FARE, SCHOOL_BUS_PUPILS } from "@/game/schoolContract";
import type { GameState } from "@/game/state";
import { storyBeatCopy, useGameStore } from "@/game/store";
import { RadioCard } from "@/ui/kit/RadioCard";

export function SchoolContractCard({ night }: { night: GameState }) {
  const decide = useGameStore((state) => state.decideSchoolContract);
  const bus = night.nightRecap?.facts.schoolBus;
  if (bus) {
    return (
      <RadioCard title="The Readsboro school bus" from="Elena Vargas">
        {bus.taught} of {bus.invited} Readsboro kids finished a lesson. Bus tickets brought in {formatMoney(bus.ticketRevenue)}.
      </RadioCard>
    );
  }

  const day = night.pendingBeat === "school_bus" ? schoolContractOfferDay(night) : null;
  const scheduled = night.schoolContract?.decision === "accepted" && night.schoolContract.day > night.dayIndex
    ? night.schoolContract.day
    : null;
  const busDay = day ?? scheduled;
  if (busDay === null) return null;
  const { weekday, date } = dayLabel(seasonCalendar(night), busDay);
  if (day === null) {
    return (
      <p className="chip mt-3 px-3 py-2 text-sm font-bold">
        Readsboro school bus booked for {weekday} {date} at 9 AM ({SCHOOL_BUS_PUPILS} kids).
      </p>
    );
  }

  const primaryClass = "key key-solid press min-h-12 w-full px-2 text-sm font-extrabold [--key-fill:var(--sign-yellow)] [--lift:3px]";
  const secondaryClass = "key press min-h-12 w-full px-2 text-sm font-extrabold [--lift:3px]";
  return (
    <RadioCard
      title="School bus offer"
      from="Elena Vargas"
      action={
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={primaryClass} onClick={() => decide("accepted")}>Book the bus</button>
          <button type="button" className={secondaryClass} onClick={() => decide("declined")}>Decline</button>
        </div>
      }
    >
      {storyBeatCopy("school_bus", night.operatorName ?? null)?.radio}{" "}
      {SCHOOL_BUS_PUPILS} kids arrive {weekday} {date} at 9 AM ({formatMoney(SCHOOL_BUS_FARE)} tickets). Watch your lift line and try to get every kid through a lesson.
    </RadioCard>
  );
}