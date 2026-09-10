/**
 * Posts the grant the same way the old Approve button did: a real form POST
 * so the browser follows the provider's redirect to the app callback.
 * fetch()+location would lose the redirect chain and cookie jar edge cases.
 */
export function submitMobileGrant({
  uid,
  scope,
}: {
  uid: string;
  scope: string;
}): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = `/oauth/mobile-consent?${new URLSearchParams({ uid, scope })}`;
  form.style.display = "none";

  const scopeInput = document.createElement("input");
  scopeInput.type = "hidden";
  scopeInput.name = "scope";
  scopeInput.value = scope;
  form.appendChild(scopeInput);

  const decisionInput = document.createElement("input");
  decisionInput.type = "hidden";
  decisionInput.name = "decision";
  decisionInput.value = "approve";
  form.appendChild(decisionInput);

  document.body.appendChild(form);
  form.submit();
}
