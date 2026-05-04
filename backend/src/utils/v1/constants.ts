export enum USER_ROLES {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  USER = "USER",
}

export enum ENVIRONMENT {
  PRODUCTION = "PROD",
  STAGED = "STAGE",
  DEVELOPMENT = "DEV",
}

export enum COLLECTIONS {
  USERS = "users",
  DEVICES = "devices",
  FIELDS = "fields",
  READINGS = "readings",
  ALERTS = "alerts",
}

export enum UserType {
  ADMIN = "ADMIN",
  USER = "USER",
}

export enum Actions {
  ADD = "add",
  UPDATE = "update",
  DELETE = "delete",
  READ = "read",
}

export enum Modifications {
  USERS = "users",
  DEVICES = "devices",
  FIELDS = "fields",
  READINGS = "readings",
}

export const CONSTANTS_MAP: Record<string, Record<string, string>> = {
  UserType,
  Actions,
  Modifications,
};
