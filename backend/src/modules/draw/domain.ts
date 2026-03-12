export type BetType =
  | "grupo"
  | "dezena"
  | "centena"
  | "milhar"
  | "duque_grupo"
  | "terno_grupo"
  | "milhar_invertida";

export type BetScope = "head" | "1to5";

export interface ParsedNumber {
  milhar: string; // 0000..9999
  centena: string; // 000..999
  dezena: string; // 00..99
  grupo: number; // 1..25
}

export interface DrawResult {
  prizes: [string, string, string, string, string];
}

export interface RunDrawOptions {
  seed?: number;
  allowRepeated?: boolean;
}

export type BetInput =
  | { type: "grupo"; value: number; scope?: BetScope }
  | { type: "dezena"; value: string | number; scope?: BetScope }
  | { type: "centena"; value: string | number; scope?: BetScope }
  | { type: "milhar"; value: string | number; scope?: BetScope }
  | {
      type: "duque_grupo";
      value: [number, number] | number[];
      scope?: BetScope;
    }
  | {
      type: "terno_grupo";
      value: [number, number, number] | number[];
      scope?: BetScope;
    }
  | { type: "milhar_invertida"; value: string | number; scope?: BetScope };

export interface CheckBetResult {
  isWin: boolean;
  matches: number[]; // posições humanas 1..5
  meta?: {
    requiredGroups?: number[];
  };
}

function domainError(message: string): never {
  throw new Error(message);
}

function onlyDigits(input: string): string {
  return input.replace(/\D/g, "");
}

function normalizeMilharStrict(input: string | number): string {
  const raw = String(input).trim();

  if (typeof input === "number") {
    if (!Number.isInteger(input) || input < 0 || input > 9999) {
      domainError("Número inválido para milhar. Esperado 0000..9999.");
    }
    return String(input).padStart(4, "0");
  }

  const digits = onlyDigits(raw);
  if (!/^\d{1,4}$/.test(digits)) {
    domainError("Número inválido para milhar. Esperado 1..4 dígitos.");
  }

  return digits.padStart(4, "0");
}

function normalizeDezenaStrict(input: string | number): string {
  if (typeof input === "number") {
    if (!Number.isInteger(input) || input < 0 || input > 99) {
      domainError("Dezena inválida. Esperado 00..99.");
    }
    return String(input).padStart(2, "0");
  }

  const raw = String(input).trim();
  if (!/^\d{1,2}$/.test(raw)) {
    domainError("Dezena inválida. Esperado 00..99.");
  }

  return raw.padStart(2, "0");
}

function normalizeCentenaStrict(input: string | number): string {
  if (typeof input === "number") {
    if (!Number.isInteger(input) || input < 0 || input > 999) {
      domainError("Centena inválida. Esperado 000..999.");
    }
    return String(input).padStart(3, "0");
  }

  const digits = onlyDigits(String(input).trim());
  if (!/^\d{1,3}$/.test(digits)) {
    domainError("Centena inválida. Esperado 000..999.");
  }
  return digits.padStart(3, "0");
}

function normalizeGroupStrict(input: number): number {
  if (!Number.isInteger(input) || input < 1 || input > 25) {
    domainError("Grupo inválido. Esperado 1..25.");
  }
  return input;
}

function resolveScope(scope?: BetScope): BetScope {
  if (scope === undefined) return "head";
  if (scope !== "head" && scope !== "1to5") {
    domainError("Escopo inválido. Use 'head' ou '1to5'.");
  }
  return scope;
}

// ---------- API esperada pelos testes ----------

export function extractDezena(input: string | number): string {
  const milhar = normalizeMilharStrict(input);
  return milhar.slice(-2);
}

export function resolveGroup(dezena: string | number): number {
  const dz = normalizeDezenaStrict(dezena);

  if (dz === "00") return 25;
  const n = Number(dz);
  return Math.ceil(n / 4);
}

export function parseNumber(input: string | number): ParsedNumber {
  const milhar = normalizeMilharStrict(input);
  return {
    milhar,
    centena: milhar.slice(-3),
    dezena: milhar.slice(-2),
    grupo: resolveGroup(milhar.slice(-2)),
  };
}

function makeSeededRng(seed: number): () => number {
  // LCG simples e determinístico
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randomMilhar(rng: () => number): string {
  const n = Math.floor(rng() * 10000);
  return String(n).padStart(4, "0");
}

export function runDraw(options: RunDrawOptions = {}): DrawResult {
  const { seed, allowRepeated = true } = options;

  const rng = typeof seed === "number" ? makeSeededRng(seed) : Math.random;
  const prizes: string[] = [];

  while (prizes.length < 5) {
    const value = randomMilhar(rng);

    if (!allowRepeated && prizes.includes(value)) {
      continue;
    }

    prizes.push(value);
  }

  return {
    prizes: prizes as [string, string, string, string, string],
  };
}

export function permutations4(value: string | number): Set<string> {
  const milhar = normalizeMilharStrict(value);
  const arr = milhar.split("");
  const out = new Set<string>();

  function permute(a: string[], l: number): void {
    if (l === a.length - 1) {
      out.add(a.join(""));
      return;
    }

    const used = new Set<string>();
    for (let i = l; i < a.length; i++) {
      const ai = a[i];
      const al = a[l];
      if (ai === undefined || al === undefined) {
        domainError("Permutação inválida.");
      }

      if (used.has(ai)) continue;
      used.add(ai);

      [a[l], a[i]] = [ai, al];
      permute(a, l + 1);
      [a[l], a[i]] = [al, ai];
    }
  }

  permute(arr, 0);
  return out;
}

function prizesByScope(draw: DrawResult, scope: BetScope): string[] {
  if (!draw?.prizes || draw.prizes.length !== 5) {
    domainError("Sorteio inválido. Esperado 5 prêmios.");
  }
  return scope === "head" ? [draw.prizes[0]] : [...draw.prizes];
}

function pushMatch(
  matches: number[],
  indexInScope: number,
  scope: BetScope,
): void {
  const pos = scope === "head" ? 1 : indexInScope + 1;
  if (!matches.includes(pos)) matches.push(pos);
}

export function checkBet(bet: BetInput, draw: DrawResult): CheckBetResult {
  const scope = resolveScope(bet.scope);
  const prizes = prizesByScope(draw, scope);
  const parsed = prizes.map(parseNumber);
  const matches: number[] = [];

  switch (bet.type) {
    case "grupo": {
      const target = normalizeGroupStrict(bet.value);
      parsed.forEach((p, idx) => {
        if (p.grupo === target) pushMatch(matches, idx, scope);
      });

      return { isWin: matches.length > 0, matches };
    }

    case "dezena": {
      const target = normalizeDezenaStrict(bet.value);
      parsed.forEach((p, idx) => {
        if (p.dezena === target) pushMatch(matches, idx, scope);
      });

      return { isWin: matches.length > 0, matches };
    }

    case "centena": {
      const target = normalizeCentenaStrict(bet.value);
      parsed.forEach((p, idx) => {
        if (p.centena === target) pushMatch(matches, idx, scope);
      });

      return { isWin: matches.length > 0, matches };
    }

    case "milhar": {
      const target = normalizeMilharStrict(bet.value);
      parsed.forEach((p, idx) => {
        if (p.milhar === target) pushMatch(matches, idx, scope);
      });

      return { isWin: matches.length > 0, matches };
    }

    case "milhar_invertida": {
      const targetPerms = permutations4(bet.value);
      prizes.forEach((prize, idx) => {
        if (targetPerms.has(prize)) pushMatch(matches, idx, scope);
      });

      return { isWin: matches.length > 0, matches };
    }

    case "duque_grupo": {
      if (!Array.isArray(bet.value) || bet.value.length !== 2) {
        domainError("Duque de grupo inválido. Informe exatamente 2 grupos.");
      }

      const unique = [
        ...new Set(bet.value.map((v) => normalizeGroupStrict(Number(v)))),
      ];
      if (unique.length !== 2) {
        domainError("Duque de grupo inválido. Os grupos devem ser distintos.");
      }

      const groupsInDraw = new Set(parsed.map((p) => p.grupo));
      const isWin = unique.every((g) => groupsInDraw.has(g));

      if (isWin) {
        parsed.forEach((p, idx) => {
          if (unique.includes(p.grupo)) pushMatch(matches, idx, scope);
        });
      }

      return { isWin, matches, meta: { requiredGroups: unique } };
    }

    case "terno_grupo": {
      if (!Array.isArray(bet.value) || bet.value.length !== 3) {
        domainError("Terno de grupo inválido. Informe exatamente 3 grupos.");
      }

      const unique = [
        ...new Set(bet.value.map((v) => normalizeGroupStrict(Number(v)))),
      ];
      if (unique.length !== 3) {
        domainError("Terno de grupo inválido. Os grupos devem ser distintos.");
      }

      const groupsInDraw = new Set(parsed.map((p) => p.grupo));
      const isWin = unique.every((g) => groupsInDraw.has(g));

      if (isWin) {
        parsed.forEach((p, idx) => {
          if (unique.includes(p.grupo)) pushMatch(matches, idx, scope);
        });
      }

      return { isWin, matches, meta: { requiredGroups: unique } };
    }

    default:
      domainError("Tipo de aposta inválido.");
  }
}
