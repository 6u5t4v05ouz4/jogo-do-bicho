import "dotenv/config";
import { buildApp } from "./app.js";

const HOST = process.env.HOST ?? "0.0.0.0";
const PORT = Number(process.env.PORT ?? 3000);

async function start() {
  const app = await buildApp();

  const shutdown = async (signal: NodeJS.Signals) => {
    app.log.info(`Recebido ${signal}. Encerrando servidor...`);
    try {
      await app.close();
      app.log.info("Servidor encerrado com sucesso.");
      process.exit(0);
    } catch (error: unknown) {
      app.log.error(error);
      process.exit(1);
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await app.listen({ host: HOST, port: PORT });
    app.log.info(`🚀 JOGOBICHO backend rodando em http://${HOST}:${PORT}`);
  } catch (error: unknown) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
