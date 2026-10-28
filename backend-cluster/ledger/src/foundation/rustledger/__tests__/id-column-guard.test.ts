import { idColumnError } from "../id-column-guard";

/** w23/153: the engine projects ordinals where stock projects hashes. */
describe("idColumnError", () => {
  it.each([
    "SELECT id FROM postings LIMIT 1",
    "SELECT id FROM entries LIMIT 1",
    "SELECT p.id AS x FROM postings p LIMIT 1",
    "SELECT count(*) FROM postings WHERE id = 'abc'",
    "SELECT count(*) FROM postings WHERE id = 3",
    "SELECT id = id AS e FROM postings LIMIT 1",
    "SELECT narration FROM postings WHERE id != 3 LIMIT 1",
    "SELECT id FROM postings WHERE id IN (1, 2)",
    "SELECT date, count(*) FROM postings GROUP BY id",
    "SELECT id FROM postings ORDER BY id LIMIT 1",
    "SELECT length(id) AS e FROM postings LIMIT 1",
    "select ID from postings",
  ])("refuses %p", (query) => {
    const refused = idColumnError(query);
    expect(refused?.rows).toEqual([]);
    expect(refused?.errors[0]).toMatchObject({
      severity: "error",
      message: expect.stringContaining("positional ordinals"),
    });
  });

  it.each([
    // The mention inside a string literal is not syntax.
    "SELECT payee FROM postings WHERE narration = 'id' LIMIT 1",
    // Block comments may name id; `--` is negation, not a comment.
    "SELECT payee /* id */ FROM postings LIMIT 1",
    // Star expansion carries no mention (022 it.905 owns the set).
    "SELECT * FROM postings LIMIT 1",
    // An AS alias retypes the name; the guard stays out.
    "SELECT 1 AS id FROM postings WHERE id = 1",
    // Substring names are not the column.
    "SELECT valid = valid AS e FROM postings LIMIT 1",
    "SELECT identifier FROM postings LIMIT 1",
    // `id` as a table alias qualifies other columns, not itself.
    "SELECT id.payee FROM postings id LIMIT 1",
    // An id( call gets the engine's own syntax error, not this one.
    "SELECT id(1) AS e FROM postings LIMIT 1",
    // Non-SELECT statements are out of scope.
    "CHECK id = id",
  ])("leaves %p alone", (query) => {
    expect(idColumnError(query)).toBeUndefined();
  });
});
