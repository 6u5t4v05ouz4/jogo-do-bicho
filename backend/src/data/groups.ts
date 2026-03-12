export type GroupId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25;
export type Dezena =
  | "00"
  | "01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09"
  | "10" | "11" | "12" | "13" | "14" | "15" | "16" | "17" | "18" | "19"
  | "20" | "21" | "22" | "23" | "24" | "25" | "26" | "27" | "28" | "29"
  | "30" | "31" | "32" | "33" | "34" | "35" | "36" | "37" | "38" | "39"
  | "40" | "41" | "42" | "43" | "44" | "45" | "46" | "47" | "48" | "49"
  | "50" | "51" | "52" | "53" | "54" | "55" | "56" | "57" | "58" | "59"
  | "60" | "61" | "62" | "63" | "64" | "65" | "66" | "67" | "68" | "69"
  | "70" | "71" | "72" | "73" | "74" | "75" | "76" | "77" | "78" | "79"
  | "80" | "81" | "82" | "83" | "84" | "85" | "86" | "87" | "88" | "89"
  | "90" | "91" | "92" | "93" | "94" | "95" | "96" | "97" | "98" | "99";

export interface BichoGroup {
  id: GroupId;
  animal: string;
  dezenas: readonly [Dezena, Dezena, Dezena, Dezena];
}

export const GROUPS: readonly BichoGroup[] = [
  { id: 1,  animal: "Avestruz",  dezenas: ["01", "02", "03", "04"] },
  { id: 2,  animal: "Águia",     dezenas: ["05", "06", "07", "08"] },
  { id: 3,  animal: "Burro",     dezenas: ["09", "10", "11", "12"] },
  { id: 4,  animal: "Borboleta", dezenas: ["13", "14", "15", "16"] },
  { id: 5,  animal: "Cachorro",  dezenas: ["17", "18", "19", "20"] },
  { id: 6,  animal: "Cabra",     dezenas: ["21", "22", "23", "24"] },
  { id: 7,  animal: "Carneiro",  dezenas: ["25", "26", "27", "28"] },
  { id: 8,  animal: "Camelo",    dezenas: ["29", "30", "31", "32"] },
  { id: 9,  animal: "Cobra",     dezenas: ["33", "34", "35", "36"] },
  { id: 10, animal: "Coelho",    dezenas: ["37", "38", "39", "40"] },
  { id: 11, animal: "Cavalo",    dezenas: ["41", "42", "43", "44"] },
  { id: 12, animal: "Elefante",  dezenas: ["45", "46", "47", "48"] },
  { id: 13, animal: "Galo",      dezenas: ["49", "50", "51", "52"] },
  { id: 14, animal: "Gato",      dezenas: ["53", "54", "55", "56"] },
  { id: 15, animal: "Jacaré",    dezenas: ["57", "58", "59", "60"] },
  { id: 16, animal: "Leão",      dezenas: ["61", "62", "63", "64"] },
  { id: 17, animal: "Macaco",    dezenas: ["65", "66", "67", "68"] },
  { id: 18, animal: "Porco",     dezenas: ["69", "70", "71", "72"] },
  { id: 19, animal: "Pavão",     dezenas: ["73", "74", "75", "76"] },
  { id: 20, animal: "Peru",      dezenas: ["77", "78", "79", "80"] },
  { id: 21, animal: "Touro",     dezenas: ["81", "82", "83", "84"] },
  { id: 22, animal: "Tigre",     dezenas: ["85", "86", "87", "88"] },
  { id: 23, animal: "Urso",      dezenas: ["89", "90", "91", "92"] },
  { id: 24, animal: "Veado",     dezenas: ["93", "94", "95", "96"] },
  { id: 25, animal: "Vaca",      dezenas: ["97", "98", "99", "00"] },
] as const;

const groupByIdMap = new Map<GroupId, BichoGroup>(GROUPS.map((g) => [g.id, g]));
const groupByAnimalMap = new Map<string, BichoGroup>(
  GROUPS.map((g) => [normalizeText(g.animal), g]),
);
const groupByDezenaMap = new Map<Dezena, BichoGroup>();

for (const group of GROUPS) {
  for (const dezena of group.dezenas) {
    groupByDezenaMap.set(dezena, group);
  }
}

/**
 * Normaliza uma entrada de número para milhar (0000-9999) sem caracteres não numéricos.
 */
export function toMilhar(value: string | number): string {
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 0) return "0000";
  return digits.slice(-4).padStart(4, "0");
}

/**
 * Extrai a dezena (2 últimos dígitos) de qualquer entrada numérica.
 */
export function extractDezena(value: string | number): Dezena {
  const milhar = toMilhar(value);
  return milhar.slice(-2) as Dezena;
}

/**
 * Resolve o grupo pela dezena:
 * - "00" -> grupo 25
 * - demais -> ceil(dezena / 4)
 */
export function resolveGroupIdByDezena(dezena: string | number): GroupId {
  const dz = normalizeToDezena(dezena);

  if (dz === "00") return 25;

  const n = Number(dz);
  const group = Math.ceil(n / 4) as GroupId;
  return group;
}

/**
 * Busca grupo por id.
 */
export function getGroupById(id: number): BichoGroup | undefined {
  if (id < 1 || id > 25) return undefined;
  return groupByIdMap.get(id as GroupId);
}

/**
 * Busca grupo por nome do animal (case/acento-insensitive).
 */
export function getGroupByAnimal(animal: string): BichoGroup | undefined {
  return groupByAnimalMap.get(normalizeText(animal));
}

/**
 * Busca grupo diretamente pela dezena.
 */
export function getGroupByDezena(dezena: string | number): BichoGroup | undefined {
  const dz = normalizeToDezena(dezena);
  return groupByDezenaMap.get(dz);
}

/**
 * Resolve grupo a partir de um número completo (0000-9999).
 */
export function getGroupByNumber(value: string | number): BichoGroup | undefined {
  const dz = extractDezena(value);
  return getGroupByDezena(dz);
}

/**
 * Retorna uma cópia da lista oficial de grupos.
 */
export function listGroups(): BichoGroup[] {
  return GROUPS.map((g) => ({ ...g, dezenas: [...g.dezenas] as [Dezena, Dezena, Dezena, Dezena] }));
}

/**
 * Verifica se uma dezena pertence a determinado grupo.
 */
export function isDezenaInGroup(dezena: string | number, groupId: number): boolean {
  const group = getGroupById(groupId);
  if (!group) return false;
  const dz = normalizeToDezena(dezena);
  return group.dezenas.includes(dz);
}

function normalizeToDezena(value: string | number): Dezena {
  const digits = String(value).replace(/\D/g, "");
  const two = (digits.length === 0 ? "00" : digits.slice(-2).padStart(2, "0")) as Dezena;
  return two;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
