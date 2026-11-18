/** What the OIDC callback needs from the start of the same sign-in. */
export interface OidcLoginState {
  nonce: string;
  codeVerifier: string;
  next?: string;
  /** Set when a signed-in user links the provider instead of signing in. */
  linkUserId?: string;
}

export interface IOidcLoginStateModel {
  saveState(state: string, record: OidcLoginState): Promise<void>;
  /** Returns the record once; a second call finds nothing. */
  takeState(state: string): Promise<OidcLoginState | null>;
  createLinkTicket(userId: string): Promise<string>;
  takeLinkTicket(ticket: string): Promise<string | null>;
}
