import { pt } from "../pt";

// w21/828: the Brazilian file (w21/584) said "Apelido" (a nickname in Brazil)
// for Last name and "ligação" (a phone call) for a link. European forms read
// as other words, or as foreign, to its readers.
describe("pt reads as Brazilian Portuguese", () => {
  it("names the profile fields and links as Brazil does", () => {
    expect([
      pt.profileLastName,
      pt.shareLink,
      pt.copyLink,
      pt.testConnection,
      pt.profileUsername,
    ]).toEqual([
      "Sobrenome",
      "Compartilhar link",
      "Copiar link",
      "Testar conexão",
      "Nome de usuário",
    ]);
  });

  it("holds no European forms", () => {
    const european =
      /\bApelido\b|ligação|Partilhar|utilizador|palavra-passe|Introduza|\baplicação\b|está a ser|iniciar sessão|\bguardar\b|definições/u;
    const found = Object.entries(pt)
      .filter(([, value]) => typeof value === "string" && european.test(value))
      .map(([key]) => key);
    expect(found).toEqual([]);
  });
});
