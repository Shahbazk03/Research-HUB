export const USER_ROLES = {
    CUSTOMER: "CUSTOMER",
    TEAM_MEMBER: "TEAM_MEMBER",
    ADMIN: "ADMIN",
} as const;

export type UserRole =
    (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const USER_STATUSES = {
    ACTIVE: "ACTIVE",
    SUSPENDED: "SUSPENDED",
    INACTIVE: "INACTIVE",
} as const;

export type UserStatus =
    (typeof USER_STATUSES)[keyof typeof USER_STATUSES];