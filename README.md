# JOGOBICHO

Projeto educativo inspirado na mecânica técnica do Jogo do Bicho, com foco em aprendizado de engenharia de software (frontend + backend + API + testes + deploy).

> **Importante:** este projeto é para estudo e entretenimento.  
> **Não usa dinheiro real** e não possui integração de pagamento.

---

## Stack

### Frontend
- React
- Vite
- TypeScript

### Backend
- Node.js
- Fastify
- TypeScript
- Zod (validação)

### Banco de dados
- Prisma ORM
- PostgreSQL (local ou Railway)

### Qualidade
- Vitest (testes de domínio)
- GitHub Actions (CI)

---

## Estrutura do projeto

```txt
JOGOBICHO/
  frontend/
  backend/
  .github/workflows/ci.yml
  PLANO_IMPLEMENTACAO.md
  README.md
```

---

## Requisitos

- Node.js 20+
- npm 10+
- (Opcional local) PostgreSQL
- Conta no GitHub
- Conta no Railway (para deploy)

---

## Setup local

## 1) Clonar e entrar no projeto

```bash
git clone <seu-repo.git>
cd JOGOBICHO
```

## 2) Backend

```bash
cd backend
npm install
```

Copie variáveis:

```bash
cp .env.example .env
```

No Windows PowerShell (alternativa):

```powershell
Copy-Item .env.example .env
```

Se for usar PostgreSQL local, ajuste `DATABASE_URL` no `.env`.

Rodar backend:

```bash
npm run dev
```

Backend sobe em `http://localhost:3000` (padrão).

### Testes do backend

```bash
npm run test
```

### Build do backend

```bash
npm run build
npm start
```

---

## 3) Frontend

Em outro terminal:

```bash
cd frontend
npm install
```

Copie variáveis:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Defina `VITE_API_URL` (normalmente `http://localhost:3000` em dev).

Rodar frontend:

```bash
npm run dev
```

Frontend sobe em `http://localhost:5173`.

### Build do frontend

```bash
npm run build
npm run preview
```

---

## Endpoints principais (backend)

### `GET /health`
Verifica status da API.

### `GET /parse/:number`
Faz parsing de número para:
- milhar
- centena
- dezena
- grupo
- animal

Exemplo:
`/parse/7842` -> dezena `42` -> grupo `11` (Cavalo)

### `GET /draw?unique=false|true`
Gera sorteio com 5 prêmios.

### `POST /bets/check`
Valida aposta contra sorteio enviado (ou gerado internamente).

Exemplo de payload:

```json
{
  "bet": {
    "type": "grupo",
    "value": 9,
    "scope": "head"
  },
  "draw": {
    "prizes": ["1234", "5678", "9012", "3456", "7890"]
  }
}
```

Tipos aceitos em `bet.type`:
- `grupo`
- `dezena`
- `centena`
- `milhar`
- `duque_grupo`
- `terno_grupo`
- `milhar_invertida`

---

## Regras técnicas implementadas

- Universo: `0000..9999`
- Dezena = 2 últimos dígitos
- Se dezena = `00`, grupo = `25`
- Caso contrário: `grupo = ceil(dezena / 4)`

Exemplo:
- `7842` -> dezena `42`
- `ceil(42/4)=11`
- grupo 11 (Cavalo)

---

## Integração frontend/backend

O frontend usa `frontend/src/lib/api.ts` com base URL configurável por ambiente:

- `VITE_API_URL=http://localhost:3000` (local)
- `VITE_API_URL=https://seu-backend.up.railway.app` (produção)

A UI já está conectada para:
- health check
- sorteio real
- validação de aposta real

---

## Banco de dados com Prisma

Schema em:
- `backend/prisma/schema.prisma`

Comandos úteis:

```bash
cd backend
npx prisma generate
npx prisma migrate dev
npx prisma migrate deploy
```

> Para produção no Railway, use `prisma migrate deploy`.

---

## Deploy no Railway (sem Docker)

## Backend

1. Suba o projeto para GitHub.
2. No Railway, crie novo projeto **a partir do repositório**.
3. Selecione o diretório `backend`.
4. Configure variáveis:
   - `NODE_ENV=production`
   - `PORT` (Railway injeta automaticamente)
   - `DATABASE_URL` (PostgreSQL do Railway)
5. Build/start:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
6. (Opcional recomendado) adicione etapa de migration:
   - `npm run prisma:migrate` no pipeline de deploy.

## Frontend

Você pode publicar no Railway também (servindo build estático com Node) ou usar Vercel/Netlify.

Se usar Railway:
1. Crie novo serviço apontando para `frontend`.
2. Configure:
   - `VITE_API_URL=https://<seu-backend>.up.railway.app`
3. Build command:
   - `npm install && npm run build`
4. Start command:
   - `npm run preview -- --host 0.0.0.0 --port $PORT`

---

## CI (GitHub Actions)

Arquivo:
- `.github/workflows/ci.yml`

Pipeline atual cobre o backend (instalar, typecheck, build, test).  
Você pode expandir para incluir frontend no mesmo workflow.

---

## Scripts úteis

### Backend (`backend/package.json`)
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run test`
- `npm run typecheck`
- `npm run prisma:migrate`

### Frontend (`frontend/package.json`)
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run test`
- `npm run lint`

---

## Troubleshooting

### Front não conecta no back
- Verifique `VITE_API_URL` no `frontend/.env`
- Verifique se backend está rodando na porta correta
- Teste `GET /health` direto no navegador

### Erro de CORS
- Confirme se backend está com CORS habilitado (já está no app)
- Confira URL correta do frontend em produção

### Erro de banco no deploy
- Confirme `DATABASE_URL`
- Rode migrations: `npm run prisma:migrate`

---

## Roadmap curto

- Persistir sorteios/apostas no PostgreSQL
- Histórico real no frontend
- Dashboard de estatísticas
- Melhorias de UX e animações
- Cobertura de testes ampliada

---

## Licença

Defina a licença desejada (ex.: MIT) antes de publicar como open source.