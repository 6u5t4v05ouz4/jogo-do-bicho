import { describe, expect, test } from "vitest";
import {
  extractDezena,
  resolveGroup,
  parseNumber,
  runDraw,
  checkBet,
  permutations4,
  type BetInput,
  type DrawResult,
} from "../src/modules/draw/domain";

describe("domain: extractDezena", () => {
  test("deve extrair a dezena dos 2 últimos dígitos", () => {
    expect(extractDezena("7842")).toBe("42");
    expect(extractDezena("0000")).toBe("00");
    expect(extractDezena("0099")).toBe("99");
    expect(extractDezena(7)).toBe("07");
    expect(extractDezena(123)).toBe("23");
  });

  test("deve rejeitar input inválido", () => {
    expect(() => extractDezena("abcd")).toThrow();
    expect(() => extractDezena("10000")).toThrow();
    expect(() => extractDezena(-1)).toThrow();
  });
});

describe("domain: resolveGroup", () => {
  test("deve mapear dezena 00 para grupo 25", () => {
    expect(resolveGroup("00")).toBe(25);
  });

  test("deve aplicar ceil(dezena/4) para demais dezenas", () => {
    expect(resolveGroup("01")).toBe(1);
    expect(resolveGroup("04")).toBe(1);
    expect(resolveGroup("05")).toBe(2);
    expect(resolveGroup("42")).toBe(11); // exemplo clássico
    expect(resolveGroup("96")).toBe(24);
    expect(resolveGroup("99")).toBe(25);
  });

  test("deve rejeitar dezena fora do intervalo 00..99", () => {
    expect(() => resolveGroup("100")).toThrow();
    expect(() => resolveGroup("-1")).toThrow();
    expect(() => resolveGroup("aa")).toThrow();
  });
});

describe("domain: parseNumber", () => {
  test("deve parsear milhar, centena, dezena e grupo", () => {
    const parsed = parseNumber("7842");

    expect(parsed.milhar).toBe("7842");
    expect(parsed.centena).toBe("842");
    expect(parsed.dezena).toBe("42");
    expect(parsed.grupo).toBe(11);
  });

  test("deve tratar corretamente dezenas com zero à esquerda", () => {
    const parsed = parseNumber("0100");

    expect(parsed.milhar).toBe("0100");
    expect(parsed.centena).toBe("100");
    expect(parsed.dezena).toBe("00");
    expect(parsed.grupo).toBe(25);
  });
});

describe("domain: runDraw", () => {
  test("deve retornar 5 prêmios no formato de milhar (0000..9999)", () => {
    const draw = runDraw();

    expect(draw.prizes).toHaveLength(5);

    for (const prize of draw.prizes) {
      expect(prize).toMatch(/^\d{4}$/);
    }
  });

  test("deve ser determinístico quando seed é informado", () => {
    const a = runDraw({ seed: 123456 });
    const b = runDraw({ seed: 123456 });
    const c = runDraw({ seed: 789 });

    expect(a.prizes).toEqual(b.prizes);
    expect(a.prizes).not.toEqual(c.prizes);
  });

  test("deve respeitar opção de repetição", () => {
    const drawAllow = runDraw({ seed: 42, allowRepeated: true });
    expect(drawAllow.prizes).toHaveLength(5);

    const drawNoRepeat = runDraw({ seed: 42, allowRepeated: false });
    const unique = new Set(drawNoRepeat.prizes);
    expect(unique.size).toBe(drawNoRepeat.prizes.length);
  });
});

describe("domain: permutations4", () => {
  test("deve gerar 24 permutações para 4 dígitos distintos", () => {
    const perms = permutations4("1234");
    expect(perms.size).toBe(24);
    expect(perms.has("1234")).toBe(true);
    expect(perms.has("4321")).toBe(true);
  });

  test("deve deduplicar quando há dígitos repetidos", () => {
    const perms = permutations4("1123");
    // 4! / 2! = 12
    expect(perms.size).toBe(12);
    expect(perms.has("1123")).toBe(true);
    expect(perms.has("3211")).toBe(true);
  });
});

describe("domain: checkBet (head x 1to5)", () => {
  const fixedDraw: DrawResult = {
    prizes: ["1234", "5678", "9012", "3456", "7890"],
  };

  test("grupo na cabeça: acerto apenas no 1º prêmio", () => {
    // 1º prêmio = 1234 => dezena 34 => grupo 9
    const hit: BetInput = { type: "grupo", value: 9, scope: "head" };
    const miss: BetInput = { type: "grupo", value: 11, scope: "head" };

    const r1 = checkBet(hit, fixedDraw);
    const r2 = checkBet(miss, fixedDraw);

    expect(r1.isWin).toBe(true);
    expect(r1.matches).toEqual([1]);

    expect(r2.isWin).toBe(false);
    expect(r2.matches).toEqual([]);
  });

  test("grupo 1to5: deve varrer os 5 prêmios", () => {
    // grupos dos prêmios:
    // 1234 -> 34 -> 9
    // 5678 -> 78 -> 20
    // 9012 -> 12 -> 3
    // 3456 -> 56 -> 14
    // 7890 -> 90 -> 23
    const bet: BetInput = { type: "grupo", value: 20, scope: "1to5" };
    const r = checkBet(bet, fixedDraw);

    expect(r.isWin).toBe(true);
    expect(r.matches).toEqual([2]);
  });

  test("dezena deve comparar os 2 últimos dígitos", () => {
    const bet: BetInput = { type: "dezena", value: "56", scope: "1to5" };
    const r = checkBet(bet, fixedDraw);

    expect(r.isWin).toBe(true);
    expect(r.matches).toEqual([4]);
  });

  test("centena deve comparar os 3 últimos dígitos", () => {
    const bet: BetInput = { type: "centena", value: "012", scope: "1to5" };
    const r = checkBet(bet, fixedDraw);

    expect(r.isWin).toBe(true);
    expect(r.matches).toEqual([3]);
  });

  test("milhar deve comparar os 4 dígitos exatos", () => {
    const hit: BetInput = { type: "milhar", value: "5678", scope: "1to5" };
    const miss: BetInput = { type: "milhar", value: "5679", scope: "1to5" };

    expect(checkBet(hit, fixedDraw).isWin).toBe(true);
    expect(checkBet(hit, fixedDraw).matches).toEqual([2]);

    expect(checkBet(miss, fixedDraw).isWin).toBe(false);
    expect(checkBet(miss, fixedDraw).matches).toEqual([]);
  });

  test("milhar invertida deve aceitar qualquer permutação", () => {
    const bet: BetInput = { type: "milhar_invertida", value: "4321", scope: "head" };
    // 1º prêmio = 1234 -> permutação válida
    const r = checkBet(bet, fixedDraw);

    expect(r.isWin).toBe(true);
    expect(r.matches).toEqual([1]);
  });

  test("duque de grupo: ambos os grupos devem aparecer entre 1..5", () => {
    // grupos presentes no draw: [9,20,3,14,23]
    const hit: BetInput = { type: "duque_grupo", value: [9, 23], scope: "1to5" };
    const miss: BetInput = { type: "duque_grupo", value: [9, 25], scope: "1to5" };

    const r1 = checkBet(hit, fixedDraw);
    const r2 = checkBet(miss, fixedDraw);

    expect(r1.isWin).toBe(true);
    expect(r1.meta?.requiredGroups).toEqual([9, 23]);

    expect(r2.isWin).toBe(false);
  });

  test("terno de grupo: os 3 grupos devem aparecer entre 1..5", () => {
    const hit: BetInput = { type: "terno_grupo", value: [9, 20, 3], scope: "1to5" };
    const miss: BetInput = { type: "terno_grupo", value: [9, 20, 25], scope: "1to5" };

    expect(checkBet(hit, fixedDraw).isWin).toBe(true);
    expect(checkBet(miss, fixedDraw).isWin).toBe(false);
  });
});

describe("domain: validações de aposta", () => {
  const draw: DrawResult = {
    prizes: ["0001", "0002", "0003", "0004", "0005"],
  };

  test("deve rejeitar grupo fora de 1..25", () => {
    expect(() =>
      checkBet({ type: "grupo", value: 0, scope: "head" }, draw),
    ).toThrow();

    expect(() =>
      checkBet({ type: "grupo", value: 26, scope: "head" }, draw),
    ).toThrow();
  });

  test("deve rejeitar dezena inválida", () => {
    expect(() =>
      checkBet({ type: "dezena", value: "100", scope: "head" }, draw),
    ).toThrow();

    expect(() =>
      checkBet({ type: "dezena", value: "ab", scope: "head" }, draw),
    ).toThrow();
  });

  test("deve rejeitar centena inválida", () => {
    expect(() =>
      checkBet({ type: "centena", value: "1000", scope: "head" }, draw),
    ).toThrow();
  });

  test("deve rejeitar milhar inválida", () => {
    expect(() =>
      checkBet({ type: "milhar", value: "10000", scope: "head" }, draw),
    ).toThrow();
  });

  test("deve rejeitar duque/terno com cardinalidade inválida", () => {
    expect(() =>
      checkBet({ type: "duque_grupo", value: [1], scope: "1to5" }, draw),
    ).toThrow();

    expect(() =>
      checkBet({ type: "terno_grupo", value: [1, 2], scope: "1to5" }, draw),
    ).toThrow();
  });
});
