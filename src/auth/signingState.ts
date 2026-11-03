/**
 * Carries the response-signing directive from the auth middleware (which learns
 * it from introspection) to the signing middleware, keyed on the raw Request so
 * no route handler has to thread it through its own type.
 */

interface SigningState {
  /** The resource's public target URI, for the signed `@target-uri`. */
  targetUri: string;
}

const states = new WeakMap<Request, SigningState>();

export function markResponseSigning(request: Request, targetUri: string): void {
  states.set(request, { targetUri });
}

export function responseSigningFor(request: Request): SigningState | undefined {
  return states.get(request);
}
