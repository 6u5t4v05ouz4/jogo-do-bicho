# 🎮 PLANO DE IMPLEMENTAÇÃO — JOGO EDUCATIVO (SEM DOCKER)
## Arquitetura: GitHub + Railway (build/deploy direto)

---

## 1) Objetivo

Construir um jogo **educativo e de entretenimento** inspirado na mecânica técnica que você definiu, sem dinheiro real, com foco em:

- Jogabilidade simples
- UI/UX clara e atrativa
- Código limpo e manutenção fácil
- Deploy automatizado via **GitHub + Railway**
- **Sem Docker** (nem local, nem em produção)

---

## 2) Premissas de domínio (regra do jogo)

### Universo numérico
- Números de `0000` a `9999`
- Dezena = 2 últimos dígitos (`00` a `99`)
- 25 grupos, 4 dezenas por grupo

### Regra de identificação do grupo
1. Isola a dezena (últimos 2 dígitos)
2. Se dezena = `00`, grupo = `25`
3. Senão: `grupo = ceil(dezena / 4)`

Exemplo:
- Número `7842`
- Dezena `42`
- `ceil(42/4) = 11`
- Grupo `11` (Cavalo)

---

## 3) Tabela oficial de grupos e dezenas

| Grupo | Animal     | Dezenas            |
|------:|------------|--------------------|
| 01    | Avestruz   | 01, 02, 03, 04     |
| 02    | Águia      | 05, 06, 07, 08     |
| 03    | Burro      | 09, 10, 11, 12     |
| 04    | Borboleta  | 13, 14, 15, 16     |
| 05    | Cachorro   | 17, 18, 19, 20     |
| 06    | Cabra      | 21, 22, 23, 24     |
| 07    | Carneiro   | 25, 26, 27, 28     |
| 08    | Camelo     | 29, 30, 31, 32     |
| 09    | Cobra      | 33, 34, 35, 36     |
| 10    | Coelho     | 37, 38, 39, 40     |
| 11    | Cavalo     | 41, 42, 43, 44     |
| 12    | Elefante   | 45, 46, 47, 48     |
| 13    | Galo       | 49, 50, 51, 52     |
| 14    | Gato       | 53, 54, 55, 56     |
| 15    | Jacaré     | 57, 58, 59, 60     |
| 16    | Leão       | 61, 62, 63, 64     |
| 17    | Macaco     | 65, 66, 67, 68     |
| 18    | Porco      | 69, 70, 71, 72     |
| 19    | Pavão      | 73, 74, 75, 76     |
| 20    | Peru       | 77, 78, 79, 80     |
| 21    | Touro      | 81, 82, 83, 84     |
| 22    | Tigre      | 85, 86, 87, 88     |
| 23    | Urso       | 89, 90, 91, 92     |
| 24    | Veado      | 93, 94, 95, 96     |
| 25    | Vaca       | 97, 98, 99, 00     |

---

## 4) Stack recomendada (leve, moderna, sem Docker)

### Frontend
- React + Vite + TypeScript
- Tailwind CSS
- Framer Motion (animações)

### Backend
- Node.js + Fastify (ou Express)
- TypeScript
- Zod (validação)

### Banco
- PostgreSQL no Railway

### Auth (opcional fase 2)
- JWT simples ou sessão

### Testes
- Vitest (unitário)
- Playwright (E2E opcional)

---

## 5) Arquitetura de deploy (GitHub + Railway)

### Repositórios
- Opção A (monorepo): `frontend/` e `backend/`
- Opção B (2 repositórios): um para cada app

### Fluxo CI/CD
1. Push para `main`
2. GitHub dispara pipeline (lint + test + build)
3. Railway faz deploy automático conectado ao GitHub
4. Migrations do banco executadas no deploy do backend

### Vantagens
- Sem instalar Docker local
- Menos uso de disco
- Deploy simples e rastreável
- Escala fácil

---

## 6) Estrutura de pastas sugerida (monorepo)

```txt
JOGOBICHO/
  frontend/
    src/
      app/
      components/
      pages/
      hooks/
      lib/
      styles/
    package.json
    tsconfig.json
    vite.config.ts

  backend/
    src/
      modules/
        bet/
        draw/
        result/
        group/
      shared/
      infra/
      app.ts
      server.ts
    prisma/
      schema.prisma
      migrations/
    package.json
    tsconfig.json

  .github/
    workflows/
      ci.yml

  README.md
```

---

## 7) Modelagem de dados (mínimo viável)

### Entidades principais

- `draws` (sorteios)
  - `id`
  - `first_prize` ... `fifth_prize` (strings `0000-9999`)
  - `created_at`

- `bets` (apostas simuladas)
  - `id`
  - `type` (`grupo|dezena|centena|milhar|duque|terno|invertida`)
  - `value` (json/string)
  - `scope` (`head|1to5`)
  - `points_staked` (moeda fictícia)
  - `created_at`

- `bet_results`
  - `id`
  - `bet_id`
  - `draw_id`
  - `is_win`
  - `prize_points`
  - `match_detail` (json)

---

## 8) Regras de cálculo (motor do jogo)

### Extrações
- Gerar 5 números de 4 dígitos (`0000-9999`), podendo permitir repetição (configurável)

### Níveis de apuração
- Milhar: 4 dígitos
- Centena: 3 últimos
- Dezena: 2 últimos
- Grupo: grupo da dezena

### Escopo da aposta
- `head`: apenas 1º prêmio
- `1to5`: avalia os 5 prêmios (cercado)

### Probabilidades base (1º prêmio)
- Grupo: `1/25`
- Dezena: `1/100`
- Centena: `1/1000`
- Milhar: `1/10000`

### Variações
- Duque de grupo: acertar 2 grupos entre os 5
- Terno de grupo: acertar 3 grupos entre os 5
- Milhar invertida: permutações dos 4 dígitos

---

## 9) UI/UX (direto ao ponto)

### Princípios
- Mobile-first
- 1 ação principal por tela
- Feedback imediato (ganhou/perdeu)
- Texto didático curto
- Baixa carga cognitiva

### Telas MVP
1. Home
2. Nova aposta
3. Resultado do sorteio
4. Histórico
5. Regras (explicação técnica simples)

### Componentes-chave
- Card de grupo/animal
- Input mascarado para número
- Seletor de modalidade
- Indicador visual de acerto
- Tabela de prêmios fictícios

---

## 10) Segurança e integridade

- Sem dinheiro real
- Sem integração de pagamento
- Limite de requests por IP
- Validação estrita de payload (Zod)
- Logs de auditoria de sorteio e apuração
- Seed aleatória registrada para reprodutibilidade em ambiente de teste

---

## 11) Plano de implementação por fases

### Fase 1 — Base técnica (2-4 dias)
- Setup frontend/backend
- Banco no Railway
- Pipeline GitHub (lint/test/build)
- Endpoint de sorteio e parse de grupo

### Fase 2 — MVP jogável (4-7 dias)
- Tela de aposta
- Motor de apuração (grupo/dezena/centena/milhar)
- Histórico de sorteios e apostas
- Pontos fictícios

### Fase 3 — Modalidades avançadas (3-5 dias)
- Duque/Terno de grupo
- Milhar invertida
- Cercado 1º ao 5º

### Fase 4 — UX polish (2-4 dias)
- Animações
- Melhorias visuais
- Onboarding rápido
- Revisão de acessibilidade

---

## 12) CI/CD (GitHub Actions) — exemplo

- Trigger: push/PR
- Jobs:
  1. `frontend`: install, lint, test, build
  2. `backend`: install, lint, test, build
- Deploy: Railway conectado ao branch `main`
- Variáveis no Railway:
  - `DATABASE_URL`
  - `NODE_ENV=production`
  - `PORT`

---

## 13) Checklist objetivo

- [ ] Criar projeto frontend (Vite + React + TS)
- [ ] Criar projeto backend (Node + Fastify + TS)
- [ ] Configurar PostgreSQL no Railway
- [ ] Implementar tabela de grupos fixa
- [ ] Implementar parser de dezena -> grupo
- [ ] Implementar sorteio 5 prêmios
- [ ] Implementar apuração de modalidades base
- [ ] Criar telas MVP
- [ ] Configurar GitHub Actions
- [ ] Conectar deploy no Railway
- [ ] Escrever testes unitários do motor
- [ ] Documentar regras no README

---

## 14) Decisões finais aprovadas

- ✅ Sem Docker
- ✅ Deploy direto com GitHub + Railway
- ✅ Banco gerenciado no Railway
- ✅ Projeto focado em aprendizagem e entretenimento

---

## 15) Próximo passo imediato

Implementar primeiro o **motor de domínio** (parse, sorteio e apuração) com testes.
Depois plugamos UI por cima.

Se você quiser, no próximo passo eu já te entrego o arquivo `backend/src/modules/draw/domain.ts` com:
- `extractDezena`
- `resolveGroup`
- `parseNumber`
- `runDraw`
- `checkBet`
- testes unitários prontos.