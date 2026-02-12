/**
 * Global API error handlers (401, 403, 500).
 * Set by NotificationProvider so api.ts can trigger logout + toast without importing React/auth.
 */

export type ApiErrorHandlers = {
  on401?: () => void;
  on403?: (message?: string) => void;
  on500?: (message?: string) => void;
};

let handlers: ApiErrorHandlers = {};

export function setApiErrorHandlers(h: ApiErrorHandlers) {
  handlers = h;
}

export function getApiErrorHandlers(): ApiErrorHandlers {
  return handlers;
}
