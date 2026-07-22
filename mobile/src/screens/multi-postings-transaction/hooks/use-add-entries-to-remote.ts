import { useAddEntriesMutation } from "@/generated-graphql/graphql";

export const useAddEntriesToRemote = () => {
  const [mutate, { error, data }] = useAddEntriesMutation();
  return { error, mutate, data };
};
