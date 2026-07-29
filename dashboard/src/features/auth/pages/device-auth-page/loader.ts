import type { RouterContext } from "@/common/types/router-context";
import { GetCliAuthSessionDocument } from "@/graphql/definitions";

export const deviceAuthLoader = async ({
  deps,
  context,
}: {
  deps: { sessionId: string };
  context: RouterContext;
}) => {
  await Promise.allSettled([
    context.client.query({
      query: GetCliAuthSessionDocument,
      variables: { sessionId: deps.sessionId },
    }),
  ]);
};
