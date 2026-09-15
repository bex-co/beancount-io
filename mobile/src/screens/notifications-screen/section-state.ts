/**
 * Whether each Notifications section is still waiting for its first result.
 *
 * Each section follows its own query. The errors section stays pending until
 * its query has answered, so it never says "Ledger is healthy" about a result
 * that has not arrived; an empty error list and a missing one look the same
 * once collapsed. Commits already on screen stay put during a refetch.
 */
export function selectSectionsPending(state: {
  errorsLoaded: boolean;
  commitsLoading: boolean;
  commitsLoaded: boolean;
}): { errorsPending: boolean; commitsPending: boolean } {
  return {
    errorsPending: !state.errorsLoaded,
    commitsPending: state.commitsLoading && !state.commitsLoaded,
  };
}
