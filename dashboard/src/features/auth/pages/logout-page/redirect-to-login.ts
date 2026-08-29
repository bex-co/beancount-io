export function redirectToLoginAfterLogout(
  location: Pick<Location, "replace"> = window.location,
): void {
  location.replace("/auth/login");
}
