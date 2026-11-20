import { dayLabel, MOUNTAIN_CALENDARS } from "@/game/calendar";
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
        {bus.taught} of {bus.invited} Readsboro kids got a lesson. Bus tickets brought in {formatMoney(bus.ticketRevenue)}.
      </RadioCard>
    );
  }

  const day = night.pendingBeat === "school_bus" ? schoolContractOfferDay(night) : null;
  const scheduled = night.schoolContract?.decision === "accepted" && night.schoolContract.day > night.dayIndex
    ? night.schoolContract.day
    : null;
  const busDay = day ?? scheduled;
  if (busDay === null) return null;
  const { weekday, date } = dayLabel(MOUNTAIN_CALENDARS[night.mountainId], busDay);
  if (day === null) {
    return <p className="chip mt-3 px-3 py-2 text-sm font-bold">School bus booked for {weekday} {date} at 9 AM. {SCHOOL_BUS_PUPILS} pupils, and Elena is already making name tags.</p>;
  }

  const buttonClass = "key key-solid press min-h-12 w-full px-2 text-sm font-extrabold [--lift:4px]";
  return (
    <RadioCard
      title="School bus offer"
      action={
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={`${buttonClass} [--key-fill:var(--sign-yellow)]`} onClick={() => decide("accepted")}>Book the bus</button>
          <button type="button" className={buttonClass} onClick={() => decide("declined")}>Decline</button>
        </div>
      }
    >
      {storyBeatCopy("school_bus")?.radio} {SCHOOL_BUS_PUPILS} pupils would arrive {weekday} {date} at 9 AM and pay {formatMoney(SCHOOL_BUS_FARE)} each for
      a lift ticket. They share the lifts with everyone else, so watch the line. Optional goal: get every pupil through a lesson.
    </RadioCard>
  );
}
