export type DemoRole = "Captain" | "Auctioneer" | "Spectator";
export const DEMO_BASE_PRICE = 10_000_000;
export const DEMO_INCREMENT = 500_000;
export const DEMO_PURSE = 50_000_000;
export const DEMO_TEAMS = [
  { id: "demo-smash", name: "Smash Kings" },
  { id: "demo-net", name: "Net Ninjas" },
  { id: "demo-court", name: "Court Titans" },
];
export type DemoBid = {
  id: string;
  amount: number;
  team_id: string;
  created_at: string;
};
export type DemoEvent = {
  id: string;
  kind: "bid" | "pause" | "resume" | "sell";
  at: string;
  amount?: number;
  teamId?: string;
};
export type DemoState = {
  status: "open" | "paused" | "sold";
  bids: DemoBid[];
  events: DemoEvent[];
};
export type DemoAction =
  | { type: "reset" }
  | { type: "bid" | "pause" | "resume" | "sell"; id: string; at: string };
export function createDemoState(): DemoState {
  return { status: "open", bids: [], events: [] };
}
export function nextDemoBid(state: DemoState): number | null {
  const amount = state.bids.length
    ? state.bids[0].amount + DEMO_INCREMENT
    : DEMO_BASE_PRICE;
  return state.status === "open" && amount <= DEMO_PURSE ? amount : null;
}
/** Local simulation only. Keep action guards in the reducer so rapid clicks cannot bypass them. */
export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  if (action.type === "reset") return createDemoState();
  const event: DemoEvent = { id: action.id, at: action.at, kind: action.type };
  const events = (item: DemoEvent) => [item, ...state.events].slice(0, 8);
  if (action.type === "bid") {
    const amount = nextDemoBid(state);
    if (amount === null) return state;
    const team = DEMO_TEAMS[state.bids.length % DEMO_TEAMS.length];
    const bid = {
      id: action.id,
      amount,
      team_id: team.id,
      created_at: action.at,
    };
    return {
      ...state,
      bids: [bid, ...state.bids],
      events: events({ ...event, amount, teamId: team.id }),
    };
  }
  if (action.type === "pause" && state.status === "open")
    return { ...state, status: "paused", events: events(event) };
  if (action.type === "resume" && state.status === "paused")
    return { ...state, status: "open", events: events(event) };
  if (action.type === "sell" && state.status === "open" && state.bids[0]) {
    const bid = state.bids[0];
    return {
      ...state,
      status: "sold",
      events: events({ ...event, amount: bid.amount, teamId: bid.team_id }),
    };
  }
  return state;
}
