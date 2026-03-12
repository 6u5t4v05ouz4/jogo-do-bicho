import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import prisma from "./infra/prisma";
import {
  checkBet,
  type BetInput,
  type DrawResult as DomainDrawResult,
} from "./modules/draw/domain";

type PrizePosition = 1 | 2 | 3 | 4 | 5;

type DrawResult = {
  first: string;
  second: string;
  third: string;
  fourth: string;
  fifth: string;
  createdAt: string;
};

type ParseResult = {
  input: string;
  milhar: string;
  centena: string;
  dezena: string;
  grupo: number;
  animal: string;
};

const GROUPS: Record<number, { animal: string; dezenas: string[] }> = {
  1: { animal: "Avestruz", dezenas: ["01", "02", "03", "04"] },
  2: { animal: "Águia", dezenas: ["05", "06", "07", "08"] },
  3: { animal: "Burro", dezenas: ["09", "10", "11", "12"] },
  4: { animal: "Borboleta", dezenas: ["13", "14", "15", "16"] },
  5: { animal: "Cachorro", dezenas: ["17", "18", "19", "20"] },
  6: { animal: "Cabra", dezenas: ["21", "22", "23", "24"] },
  7: { animal: "Carneiro", dezenas: ["25", "26", "27", "28"] },
  8: { animal: "Camelo", dezenas: ["29", "30", "31", "32"] },
  9: { animal: "Cobra", dezenas: ["33", "34", "35", "36"] },
  10: { animal: "Coelho", dezenas: ["37", "38", "39", "40"] },
  11: { animal: "Cavalo", dezenas: ["41", "42", "43", "44"] },
  12: { animal: "Elefante", dezenas: ["45", "46", "47", "48"] },
  13: { animal: "Galo", dezenas: ["49", "50", "51", "52"] },
  14: { animal: "Gato", dezenas: ["53", "54", "55", "56"] },
  15: { animal: "Jacaré", dezenas: ["57", "58", "59", "60"] },
  16: { animal: "Leão", dezenas: ["61", "62", "63", "64"] },
  17: { animal: "Macaco", dezenas: ["65", "66", "67", "68"] },
  18: { animal: "Porco", dezenas: ["69", "70", "71", "72"] },
  19: { animal: "Pavão", dezenas: ["73", "74", "75", "76"] },
  20: { animal: "Peru", dezenas: ["77", "78", "79", "80"] },
  21: { animal: "Touro", dezenas: ["81", "82", "83", "84"] },
  22: { animal: "Tigre", dezenas: ["85", "86", "87", "88"] },
  23: { animal: "Urso", dezenas: ["89", "90", "91", "92"] },
  24: { animal: "Veado", dezenas: ["93", "94", "95", "96"] },
  25: { animal: "Vaca", dezenas: ["97", "98", "99", "00"] },
};

const parseNumberSchema = z.object({
  number: z
    .string()
    .regex(/^\d{1,4}$/, "Informe um número com 1 a 4 dígitos (0-9)."),
});

const drawQuerySchema = z.object({
  unique: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .default("false"),
});

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(20),
});

const betInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("grupo"),
    value: z.number().int().min(1).max(25),
    scope: z.enum(["head", "1to5"]).optional(),
  }),
  z.object({
    type: z.literal("dezena"),
    value: z.union([z.string(), z.number()]),
    scope: z.enum(["head", "1to5"]).optional(),
  }),
  z.object({
    type: z.literal("centena"),
    value: z.union([z.string(), z.number()]),
    scope: z.enum(["head", "1to5"]).optional(),
  }),
  z.object({
    type: z.literal("milhar"),
    value: z.union([z.string(), z.number()]),
    scope: z.enum(["head", "1to5"]).optional(),
  }),
  z.object({
    type: z.literal("duque_grupo"),
    value: z.array(z.number().int()).length(2),
    scope: z.enum(["head", "1to5"]).optional(),
  }),
  z.object({
    type: z.literal("terno_grupo"),
    value: z.array(z.number().int()).length(3),
    scope: z.enum(["head", "1to5"]).optional(),
  }),
  z.object({
    type: z.literal("milhar_invertida"),
    value: z.union([z.string(), z.number()]),
    scope: z.enum(["head", "1to5"]).optional(),
  }),
]);

const betCheckBodySchema = z.object({
  bet: betInputSchema,
  draw: z
    .object({
      prizes: z.tuple([
        z.string().regex(/^\d{4}$/),
        z.string().regex(/^\d{4}$/),
        z.string().regex(/^\d{4}$/),
        z.string().regex(/^\d{4}$/),
        z.string().regex(/^\d{4}$/),
      ]),
    })
    .optional(),
  persist: z.boolean().optional().default(true),
});

function pad4(input: string | number): string {
  return String(input).padStart(4, "0").slice(-4);
}

function extractDezena(milhar: string): string {
  return milhar.slice(-2);
}

function resolveGroup(dezena: string): number {
  if (dezena === "00") return 25;
  const asNumber = Number(dezena);
  return Math.ceil(asNumber / 4);
}

function parseNumber(input: string | number): ParseResult {
  const milhar = pad4(input);
  const centena = milhar.slice(-3);
  const dezena = extractDezena(milhar);
  const grupo = resolveGroup(dezena);
  const groupInfo = GROUPS[grupo];

  return {
    input: String(input),
    milhar,
    centena,
    dezena,
    grupo,
    animal: groupInfo?.animal ?? "Desconhecido",
  };
}

function randomMilhar(): string {
  const value = Math.floor(Math.random() * 10000);
  return String(value).padStart(4, "0");
}

function runDraw(unique = false): DrawResult {
  const picks: [string, string, string, string, string] = [
    randomMilhar(),
    randomMilhar(),
    randomMilhar(),
    randomMilhar(),
    randomMilhar(),
  ];

  if (unique) {
    const seen = new Set<string>();
    for (let i = 0; i < picks.length; i++) {
      let current = picks[i];
      if (current === undefined) current = randomMilhar();

      while (seen.has(current)) {
        current = randomMilhar();
      }

      picks[i] = current;
      seen.add(current);
    }
  }

  return {
    first: picks[0],
    second: picks[1],
    third: picks[2],
    fourth: picks[3],
    fifth: picks[4],
    createdAt: new Date().toISOString(),
  };
}

function pickPrize(draw: DrawResult, position: PrizePosition): string {
  switch (position) {
    case 1:
      return draw.first;
    case 2:
      return draw.second;
    case 3:
      return draw.third;
    case 4:
      return draw.fourth;
    case 5:
      return draw.fifth;
    default:
      return draw.first;
  }
}

function toDbBetType(
  type: BetInput["type"],
):
  | "GRUPO"
  | "DEZENA"
  | "CENTENA"
  | "MILHAR"
  | "DUQUE_GRUPO"
  | "TERNO_GRUPO"
  | "MILHAR_INVERTIDA" {
  const map = {
    grupo: "GRUPO",
    dezena: "DEZENA",
    centena: "CENTENA",
    milhar: "MILHAR",
    duque_grupo: "DUQUE_GRUPO",
    terno_grupo: "TERNO_GRUPO",
    milhar_invertida: "MILHAR_INVERTIDA",
  } as const;

  return map[type];
}

function toDbScope(scope?: BetInput["scope"]): "HEAD" | "FROM_1_TO_5" {
  return scope === "1to5" ? "FROM_1_TO_5" : "HEAD";
}

async function persistDraw(draw: DrawResult, seed?: string) {
  const data: {
    firstPrize: string;
    secondPrize: string;
    thirdPrize: string;
    fourthPrize: string;
    fifthPrize: string;
    seed?: string | null;
  } = {
    firstPrize: draw.first,
    secondPrize: draw.second,
    thirdPrize: draw.third,
    fourthPrize: draw.fourth,
    fifthPrize: draw.fifth,
  };

  if (seed !== undefined) {
    data.seed = seed;
  }

  return prisma.draw.create({ data });
}

async function persistBetAndResult(params: {
  bet: BetInput;
  drawId: string;
  result: ReturnType<typeof checkBet>;
}) {
  const { bet, drawId, result } = params;

  const createdBet = await prisma.bet.create({
    data: {
      type: toDbBetType(bet.type),
      scope: toDbScope(bet.scope),
      value: bet.value as unknown as object,
      pointsStaked: 1,
    },
  });

  const createdResult = await prisma.betResult.create({
    data: {
      betId: createdBet.id,
      drawId,
      isWin: result.isWin,
      prizePoints: result.isWin ? result.matches.length : 0,
      matchDetail: {
        matches: result.matches,
        meta: result.meta ?? null,
      },
    },
  });

  return {
    bet: createdBet,
    result: createdResult,
  };
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
    },
  });

  await app.register(cors, { origin: true });
  await app.register(helmet);
  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
  });

  app.get("/health", async () => {
    return {
      ok: true,
      service: "jogobicho-backend",
      uptimeSeconds: Math.floor(process.uptime()),
      now: new Date().toISOString(),
    };
  });

  app.get("/parse/:number", async (request, reply) => {
    const parsed = parseNumberSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: "Invalid input",
        details: parsed.error.issues.map((i) => i.message),
      });
    }

    const result = parseNumber(parsed.data.number);

    return {
      ok: true,
      data: result,
      rule: {
        formula: "grupo = ceil(dezena/4), exceto dezena 00 => grupo 25",
      },
    };
  });

  app.get("/draw", async (request, reply) => {
    const parsed = drawQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: "Invalid query params",
      });
    }

    const unique = parsed.data.unique === "true";
    const draw = runDraw(unique);

    // Persistir sempre o sorteio gerado em /draw
    const saved = await persistDraw(draw, `unique:${unique}`);

    return {
      ok: true,
      config: { unique },
      data: {
        draw,
        drawId: saved.id,
        parsed: {
          first: parseNumber(draw.first),
          second: parseNumber(draw.second),
          third: parseNumber(draw.third),
          fourth: parseNumber(draw.fourth),
          fifth: parseNumber(draw.fifth),
        },
      },
    };
  });

  app.get("/draw/:position", async (request, reply) => {
    const schema = z.object({
      position: z.union([
        z.literal("1"),
        z.literal("2"),
        z.literal("3"),
        z.literal("4"),
        z.literal("5"),
      ]),
    });

    const parsedPos = schema.safeParse(request.params);
    if (!parsedPos.success) {
      return reply.status(400).send({
        ok: false,
        error: "position deve ser entre 1 e 5",
      });
    }

    const position = Number(parsedPos.data.position) as PrizePosition;
    const draw = runDraw(false);
    const saved = await persistDraw(draw, "position-endpoint");
    const selected = pickPrize(draw, position);

    return {
      ok: true,
      data: {
        drawId: saved.id,
        position,
        number: selected,
        parsed: parseNumber(selected),
        fullDraw: draw,
      },
    };
  });

  app.post("/bets/check", async (request, reply) => {
    const parsed = betCheckBodySchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: "Payload inválido para /bets/check",
        details: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }

    const bet = parsed.data.bet as BetInput;
    const persist = parsed.data.persist ?? true;

    const drawForCheck: DomainDrawResult = parsed.data.draw ?? {
      prizes: [
        randomMilhar(),
        randomMilhar(),
        randomMilhar(),
        randomMilhar(),
        randomMilhar(),
      ],
    };

    try {
      const result = checkBet(bet, drawForCheck);

      let persistence:
        | {
            drawId: string;
            betId: string;
            betResultId: string;
          }
        | undefined;

      if (persist) {
        const drawObj: DrawResult = {
          first: drawForCheck.prizes[0],
          second: drawForCheck.prizes[1],
          third: drawForCheck.prizes[2],
          fourth: drawForCheck.prizes[3],
          fifth: drawForCheck.prizes[4],
          createdAt: new Date().toISOString(),
        };

        const savedDraw = await persistDraw(drawObj, "bets-check");
        const saved = await persistBetAndResult({
          bet,
          drawId: savedDraw.id,
          result,
        });

        persistence = {
          drawId: savedDraw.id,
          betId: saved.bet.id,
          betResultId: saved.result.id,
        };
      }

      return {
        ok: true,
        data: {
          bet,
          draw: drawForCheck,
          result,
          persisted: persistence ?? null,
        },
      };
    } catch (error) {
      return reply.status(400).send({
        ok: false,
        error:
          error instanceof Error ? error.message : "Erro ao validar aposta",
      });
    }
  });

  // Histórico de sorteios
  app.get("/history/draws", async (request, reply) => {
    const parsed = historyQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: "Parâmetros inválidos em /history/draws",
      });
    }

    const draws = await prisma.draw.findMany({
      orderBy: { createdAt: "desc" },
      take: parsed.data.limit,
    });

    return {
      ok: true,
      data: draws.map((d) => ({
        id: d.id,
        first: d.firstPrize,
        second: d.secondPrize,
        third: d.thirdPrize,
        fourth: d.fourthPrize,
        fifth: d.fifthPrize,
        seed: d.seed,
        createdAt: d.createdAt,
        parsed: {
          first: parseNumber(d.firstPrize),
          second: parseNumber(d.secondPrize),
          third: parseNumber(d.thirdPrize),
          fourth: parseNumber(d.fourthPrize),
          fifth: parseNumber(d.fifthPrize),
        },
      })),
    };
  });

  // Histórico de validações de aposta
  app.get("/history/bets", async (request, reply) => {
    const parsed = historyQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: "Parâmetros inválidos em /history/bets",
      });
    }

    const betResults = await prisma.betResult.findMany({
      orderBy: { createdAt: "desc" },
      take: parsed.data.limit,
      include: {
        bet: true,
        draw: true,
      },
    });

    return {
      ok: true,
      data: betResults.map((br) => ({
        id: br.id,
        createdAt: br.createdAt,
        isWin: br.isWin,
        prizePoints: br.prizePoints,
        matchDetail: br.matchDetail,
        bet: {
          id: br.bet.id,
          type: br.bet.type,
          scope: br.bet.scope,
          value: br.bet.value,
          pointsStaked: br.bet.pointsStaked,
          createdAt: br.bet.createdAt,
        },
        draw: {
          id: br.draw.id,
          first: br.draw.firstPrize,
          second: br.draw.secondPrize,
          third: br.draw.thirdPrize,
          fourth: br.draw.fourthPrize,
          fifth: br.draw.fifthPrize,
          createdAt: br.draw.createdAt,
        },
      })),
    };
  });

  return app;
}
