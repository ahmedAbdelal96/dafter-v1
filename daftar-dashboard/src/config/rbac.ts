export const APPLICATION_ROLES = ["SUPER_ADMIN", "OWNER", "STAFF"] as const;

export type ApplicationRole = (typeof APPLICATION_ROLES)[number];
