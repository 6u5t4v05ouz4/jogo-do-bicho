-- CreateEnum
CREATE TYPE "BetType" AS ENUM ('GRUPO', 'DEZENA', 'CENTENA', 'MILHAR', 'DUQUE_GRUPO', 'TERNO_GRUPO', 'MILHAR_INVERTIDA');

-- CreateEnum
CREATE TYPE "BetScope" AS ENUM ('HEAD', 'FROM_1_TO_5');

-- CreateTable
CREATE TABLE "Draw" (
    "id" TEXT NOT NULL,
    "firstPrize" VARCHAR(4) NOT NULL,
    "secondPrize" VARCHAR(4) NOT NULL,
    "thirdPrize" VARCHAR(4) NOT NULL,
    "fourthPrize" VARCHAR(4) NOT NULL,
    "fifthPrize" VARCHAR(4) NOT NULL,
    "seed" VARCHAR(128),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Draw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bet" (
    "id" TEXT NOT NULL,
    "type" "BetType" NOT NULL,
    "scope" "BetScope" NOT NULL,
    "value" JSONB NOT NULL,
    "pointsStaked" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetResult" (
    "id" TEXT NOT NULL,
    "betId" TEXT NOT NULL,
    "drawId" TEXT NOT NULL,
    "isWin" BOOLEAN NOT NULL,
    "prizePoints" INTEGER NOT NULL DEFAULT 0,
    "matchDetail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BetResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Draw_createdAt_idx" ON "Draw"("createdAt");

-- CreateIndex
CREATE INDEX "Bet_type_scope_idx" ON "Bet"("type", "scope");

-- CreateIndex
CREATE INDEX "Bet_createdAt_idx" ON "Bet"("createdAt");

-- CreateIndex
CREATE INDEX "BetResult_isWin_idx" ON "BetResult"("isWin");

-- CreateIndex
CREATE INDEX "BetResult_createdAt_idx" ON "BetResult"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BetResult_betId_drawId_key" ON "BetResult"("betId", "drawId");

-- AddForeignKey
ALTER TABLE "BetResult" ADD CONSTRAINT "BetResult_betId_fkey" FOREIGN KEY ("betId") REFERENCES "Bet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BetResult" ADD CONSTRAINT "BetResult_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "Draw"("id") ON DELETE CASCADE ON UPDATE CASCADE;
