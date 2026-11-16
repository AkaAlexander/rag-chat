import { expect, it } from "vitest";
import { score } from "../evals/score";
import { refusal } from "../src/lib/rag/prompts";

const item = { question: "¿Cuántos visitantes?", expected: {
  answers: ["12", "doce"], document: "visitas.md", evidence: "12 visitantes",
} };
const source = { name: "visitas.md", position: 0, content: "Se admiten 12 visitantes." };

it("grades the fact independently of its citation and matches whole tokens", () => {
  expect(score(item, "Doce.", [source])).toEqual({ correct: true, citation: true, rejected: null });
  expect(score(item, "120", [source]).correct).toBe(false);
  expect(score(item, "12", [{ ...source, content: "Otro párrafo" }]).citation).toBe(false);
});

it("counts only an explicit uncited abstention as a correct refusal", () => {
  const absent = { ...item, expected: null, expectedRefusal: "No encuentro la respuesta en los documentos disponibles." };
  expect(score(absent, refusal(item.question), []).rejected).toBe(true);
  expect(score(absent, "", []).rejected).toBe(false);
  expect(score(absent, refusal(item.question), [source]).rejected).toBe(false);
  expect(refusal("Welk telefoonnummer heeft De Spil?")).toBe("Ik kan het antwoord niet vinden in de beschikbare documenten.");
});
