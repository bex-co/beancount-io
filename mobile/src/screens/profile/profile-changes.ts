import { graphQLErrorCodes } from "../../common/graphql-error-codes";

export type ProfileValues = {
  firstName: string;
  lastName: string;
  username: string;
};

export type ProfileChanges = {
  /** Both names together: the API clears a name it isn't sent. */
  name?: { firstName: string; lastName: string };
  username?: string;
};

function trimProfile(values: ProfileValues): ProfileValues {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    username: values.username.trim(),
  };
}

/** The writes a save needs: nothing for untouched fields, so renaming
 * yourself never also renames your ledgers' owner. */
export function profileChanges(
  saved: ProfileValues,
  edited: ProfileValues,
): ProfileChanges {
  const before = trimProfile(saved);
  const after = trimProfile(edited);
  const changes: ProfileChanges = {};
  if (
    before.firstName !== after.firstName ||
    before.lastName !== after.lastName
  ) {
    changes.name = { firstName: after.firstName, lastName: after.lastName };
  }
  if (before.username !== after.username) {
    changes.username = after.username;
  }
  return changes;
}

/** Whether a failed username update means the name belongs to someone else:
 * the API reports a taken username as a `CONFLICT` error. */
export function isUsernameTaken(error: unknown): boolean {
  return graphQLErrorCodes(error).includes("CONFLICT");
}
