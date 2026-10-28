import { Check, Gavel, Pause, Play, Radio } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { DEMO_TEAMS, type DemoEvent } from "./demo-state";
import { MotionList } from "@/components/motion/MotionList";

const eventIcons = { bid: Gavel, pause: Pause, resume: Play, sell: Check };
export function DemoActivity({ events }: { events: DemoEvent[] }) {
  return (
    <aside className="demo-activity" aria-labelledby="demo-activity-title">
      <header>
        <div>
          <span className="eyebrow">EVERY MOVE, IN VIEW</span>
          <h2 id="demo-activity-title">Room activity</h2>
        </div>
        <Radio size={20} aria-hidden="true" />
      </header>
      <p className="activity-caption">Your latest 8 demo actions</p>
      {events.length ? (
        <MotionList
          className="activity-list"
          revision={events.map((event) => event.id).join(":")}
        >
          {events.map((event) => {
            const Icon = eventIcons[event.kind];
            const team = DEMO_TEAMS.find((item) => item.id === event.teamId);
            const title =
              event.kind === "bid"
                ? `${team?.name} bid`
                : event.kind === "sell"
                  ? `Sold to ${team?.name}`
                  : event.kind === "pause"
                    ? "Room paused"
                    : "Bidding resumed";
            return (
              <li
                key={event.id}
                data-motion-id={event.id}
                className="activity-event"
                data-kind={event.kind}
              >
                <span className="activity-icon">
                  <Icon size={15} aria-hidden="true" />
                </span>
                <div>
                  <h3>{title}</h3>
                  {event.amount !== undefined && (
                    <strong className="tnum">{formatINR(event.amount)}</strong>
                  )}
                  <time dateTime={event.at}>
                    {new Date(event.at).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    })}
                  </time>
                </div>
              </li>
            );
          })}
        </MotionList>
      ) : (
        <div className="activity-empty">
          <span>
            <Gavel size={26} aria-hidden="true" />
          </span>
          <h3>The room is yours.</h3>
          <p>
            Place the opening sample bid to start the story. Every move appears
            here.
          </p>
        </div>
      )}
      <div className="activity-note">
        <span aria-hidden="true" />
        Sample activity. No real auction changes.
      </div>
    </aside>
  );
}
