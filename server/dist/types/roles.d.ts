export declare const USER_ROLES: {
    readonly CUSTOMER: "CUSTOMER";
    readonly TEAM_MEMBER: "TEAM_MEMBER";
    readonly ADMIN: "ADMIN";
};
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
export declare const USER_STATUSES: {
    readonly ACTIVE: "ACTIVE";
    readonly SUSPENDED: "SUSPENDED";
    readonly INACTIVE: "INACTIVE";
};
export type UserStatus = (typeof USER_STATUSES)[keyof typeof USER_STATUSES];
