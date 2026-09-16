// src/types/roles.ts

export type Role = "MAIN_CONTROLLER" | "AUCTIONEER" | "CAPTAIN" | "VIEWER";

export const ROLE_LABELS: Record<Role, string> = {
  MAIN_CONTROLLER: "Main Controller",
  AUCTIONEER: "Auctioneer",
  CAPTAIN: "Captain",
  VIEWER: "Viewer",
};

/**
 * Landing page for each role after sign-in.
 * CAPTAIN → /captain/my-team for now (bid UI comes in Phase 3.4).
 */
export const ROLE_HOME: Record<Role, string> = {
  MAIN_CONTROLLER: "/dashboard",
  AUCTIONEER: "/auctioneer/console",
  CAPTAIN: "/captain/my-team",
  VIEWER: "/viewer/live",
};

/** Who can do what (mirrors DB RLS — used for UI hints). */
export const PERMISSIONS = {
  canBid: (role: Role) => role === "CAPTAIN",
  canControlAuction: (role: Role) =>
    role === "MAIN_CONTROLLER" || role === "AUCTIONEER",
  canGradePlayers: (role: Role) => role === "MAIN_CONTROLLER",
  canApproveRegistrations: (role: Role) => role === "MAIN_CONTROLLER",
  canManageTeams: (role: Role) => role === "MAIN_CONTROLLER",
  canManagePurses: (role: Role) => role === "MAIN_CONTROLLER",
  canViewSensitiveData: (role: Role) => role === "MAIN_CONTROLLER",
  canAssignRoles: (role: Role) => role === "MAIN_CONTROLLER",
  canExport: (role: Role) =>
    role === "MAIN_CONTROLLER" || role === "AUCTIONEER",
  canViewAudit: (role: Role) => role === "MAIN_CONTROLLER",
} as const;