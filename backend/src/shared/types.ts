export type BetType =
  | "grupo"
  | "dezena"
  | "centena"
  | "milhar"
  | "duque_grupo"
  | "terno_grupo"
  | "milhar_invertida";

export type BetScope = "head" | "1to5";

export interface GroupDefinition {
  id: number; // 1..25
  animal: string;
  dezenas: [string, string, string, string];
}

export interface DrawResult {
  first: string; // 0000..9999
  second: string;
  third: string;
  fourth: string;
  fifth: string;
  createdAt: Date;
  seed?: string;
}

export interface ParsedNumber {
  original: string; // always 4 digits
  milhar: string; // 4 digits
  centena: string; // last 3 digits
  dezena: string; // last 2 digits
  groupId: number; // 1..25
}

export interface BaseBet {
  id?: string;
  type: BetType;
  scope: BetScope;
  pointsStaked: number; // fictitious points
  createdAt?: Date;
}

export interface GrupoBet extends BaseBet {
  type: "grupo";
  value: number; // 1..25
}

export interface DezenaBet extends BaseBet {
  type: "dezena";
  value: string; // "00".."99"
}

export interface CentenaBet extends BaseBet {
  type: "centena";
  value: string; // "000".."999"
}

export interface MilharBet extends BaseBet {
  type: "milhar";
  value: string; // "0000".."9999"
}

export interface DuqueGrupoBet extends BaseBet {
  type: "duque_grupo";
  value: [number, number]; // two distinct groups 1..25
}

export interface TernoGrupoBet extends BaseBet {
  type: "terno_grupo";
  value: [number, number, number]; // three distinct groups 1..25
}

export interface MilharInvertidaBet extends BaseBet {
  type: "milhar_invertida";
  value: string; // base milhar for permutations
}

export type BetInput =
  | GrupoBet
  | DezenaBet
  | CentenaBet
  | MilharBet
  | DuqueGrupoBet
  | TernoGrupoBet
  | MilharInvertidaBet;

export interface MatchDetail {
  prizeIndexMatched: number[]; // 1..5
  matchedValues: string[];
  resolvedGroups?: number[];
}

export interface BetEvaluationResult {
  isWin: boolean;
  prizePoints: number;
  probabilityLabel: string; // e.g. "1/25"
  payoutLabel: string; // e.g. "18:1"
  detail: MatchDetail;
}

export interface DomainError {
  code:
    | "INVALID_NUMBER"
    | "INVALID_BET"
    | "INVALID_SCOPE"
    | "INVALID_GROUP"
    | "INVALID_DEZENA"
    | "INVALID_CENTENA"
    | "INVALID_MILHAR";
  message: string;
}
