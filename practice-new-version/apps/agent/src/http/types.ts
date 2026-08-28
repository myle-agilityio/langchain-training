// Shared Hono binding so requestContext's id and validate's parsed body are typed everywhere.
export interface AppEnv {
  Variables: {
    requestId: string;
    valid: unknown;
    userId: string;
  };
}
