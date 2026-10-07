type Session = { isAuthenticated: boolean; globalLoading: boolean };

// A login in flight holds the protected area, so the layout never mounts half-initialised.
const protectedRouteOutcome = ({ isAuthenticated, globalLoading }: Session) =>
  globalLoading ? "wait" : isAuthenticated ? "render" : "sign-in";

// The hash keeps #/sign-in across a refresh; a login in flight navigates by itself.
const signInOutcome = ({ isAuthenticated, globalLoading }: Session) =>
  isAuthenticated && !globalLoading ? "checkout" : "render";

export { protectedRouteOutcome, signInOutcome };
