import {
  apiKeyResource,
  SourceBackedRelationshipEvaluator,
  userResource,
  USER_RELATIONSHIPS,
} from "..";

function makeEvaluator(ownerId: string | null = "usr_alice") {
  const findById = jest.fn(async () =>
    ownerId
      ? {
          id: "akey_1",
          userId: ownerId,
        }
      : null,
  );
  return {
    findById,
    evaluator: new SourceBackedRelationshipEvaluator({} as never, {
      apiKey: { findById } as never,
    }),
  };
}

describe("SourceBackedRelationshipEvaluator", () => {
  it.each(Object.values(USER_RELATIONSHIPS))(
    "mirrors model.fga exact-self ownership for %s",
    async (relation) => {
      const { evaluator, findById } = makeEvaluator();
      await expect(
        evaluator.check({
          user: userResource("usr_alice"),
          relation,
          object: userResource("usr_alice"),
        }),
      ).resolves.toBe(true);
      await expect(
        evaluator.check({
          user: userResource("usr_alice"),
          relation,
          object: userResource("usr_bob"),
        }),
      ).resolves.toBe(false);
      expect(findById).not.toHaveBeenCalled();
    },
  );

  it("resolves API-key ownership from the current row", async () => {
    const { evaluator, findById } = makeEvaluator("usr_alice");
    const check = {
      user: userResource("usr_alice"),
      relation: USER_RELATIONSHIPS.WRITE_CREDENTIALS,
      object: apiKeyResource("akey_1"),
    };
    await expect(evaluator.check(check)).resolves.toBe(true);
    await expect(evaluator.check(check)).resolves.toBe(true);
    expect(findById).toHaveBeenCalledTimes(2);
  });

  it.each([null, "usr_bob"])(
    "gives missing and foreign API-key ids the same denial (%s)",
    async (ownerId) => {
      const { evaluator } = makeEvaluator(ownerId);
      await expect(
        evaluator.check({
          user: userResource("usr_alice"),
          relation: USER_RELATIONSHIPS.WRITE_CREDENTIALS,
          object: apiKeyResource("akey_1"),
        }),
      ).resolves.toBe(false);
    },
  );
});
