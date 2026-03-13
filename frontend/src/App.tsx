import { FormEvent, useMemo, useState, useEffect } from "react";
import api, {
  ApiError,
  BetInput,
  BetScope,
  ParsedNumber,
  PersistedBetHistoryItem,
  PersistedDrawHistoryItem,
} from "./lib/api";

type View = "home" | "aposta" | "historico" | "regras";

type BetType =
  | "grupo"
  | "dezena"
  | "centena"
  | "milhar"
  | "duque_grupo"
  | "terno_grupo"
  | "milhar_invertida";

type DrawUi = {
  first: string;
  second: string;
  third: string;
  fourth: string;
  fifth: string;
  createdAt: string;
};

type DrawParsedUi = {
  first: ParsedNumber;
  second: ParsedNumber;
  third: ParsedNumber;
  fourth: ParsedNumber;
  fifth: ParsedNumber;
};

const navItems: Array<{ key: View; label: string }> = [
  { key: "home", label: "Início" },
  { key: "aposta", label: "Nova Aposta" },
  { key: "historico", label: "Histórico" },
  { key: "regras", label: "Regras" },
];

const betTypeLabels: Record<BetType, string> = {
  grupo: "Grupo",
  dezena: "Dezena",
  centena: "Centena",
  milhar: "Milhar",
  duque_grupo: "Duque de Grupo",
  terno_grupo: "Terno de Grupo",
  milhar_invertida: "Milhar Invertida",
};

function App() {
  const [currentView, setCurrentView] = useState<View>("home");

  // health
  const [healthStatus, setHealthStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [healthMessage, setHealthMessage] = useState<string>("");

  // draw
  const drawLoading,
    setDrawLoading = useState(false);
  const [autoDrawCooldown, setAutoDrawCooldown] = useState<number>(3);
  const [drawUnique, setDrawUnique] = useState(false);
  const [drawData, setDrawData] = useState<DrawUi | null>(null);
  const [drawParsed, setDrawParsed] = useState<DrawParsedUi | null>(null);
  const [drawError, setDrawError] = useState<string>("");

  // bet
  const [betType, setBetType] = useState<BetType>("grupo");
  const [betScope, setBetScope] = useState<BetScope>("head");
  const [betValue, setBetValue] = useState("9");
  const [betLoading, setBetLoading] = useState(false);
  const [betError, setBetError] = useState("");
  const [betResult, setBetResult] = useState<{
    isWin: boolean;
    matches: number[];
    meta?: { requiredGroups?: number[] };
  } | null>(null);

  const [betDrawInput, setBetDrawInput] = useState("1234,5678,9012,3456,7890");
  const [useManualDraw, setUseManualDraw] = useState(false);

  // persisted history
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [drawHistory, setDrawHistory] = useState<PersistedDrawHistoryItem[]>(
    [],
  );
  const [betHistory, setBetHistory] = useState<PersistedBetHistoryItem[]>([]);

  const title = useMemo(() => {
    switch (currentView) {
      case "home":
        return "Painel Inicial";
      case "aposta":
        return "Nova Aposta";
      case "historico":
        return `Histórico de Sorteios - Cooldown: ${autoDrawCooldown} min`;
      case "regras":
        return "Regras Técnicas";
      default:
        return "JOGOBICHO";
    }
  }, [currentView, autoDrawCooldown]);

  // Efeito para countdown automático de sorteios
  useEffect(() => {
    let intervalId: number | null = null;

    const timer = setInterval(() => {
      if (autoDrawCooldown <= 1) {
        clearInterval(intervalId);
      } else {
        setAutoDrawCooldown((prev) => prev - 1);
      }
    }, 60000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoDrawCooldown]);

  async function handleHealthCheck() {
    setHealthStatus("loading");
    setHealthMessage("");
    try {
      const res = await api.health();
      setHealthStatus("ok");
      setHealthMessage(
        `${res.service} online${res.now ? ` • ${new Date(res.now).toLocaleString()}` : ""}`,
      );
    } catch (err) {
      setHealthStatus("error");
      setHealthMessage(formatError(err));
    }
  }

  async function handleDraw() {
    setDrawLoading(true);
    setDrawError("");
    try {
      const res = await api.draw({ unique: drawUnique });
      setDrawData(res.data.draw);
      setDrawParsed(res.data.parsed);
      setCurrentView("historico");
    } catch (err) {
      setDrawError(formatError(err));
    } finally {
      setDrawLoading(false);

      // Resetar cooldown para 3 minutos após cada sorteio
      setAutoDrawCooldown(3);
    }
  }

  async function loadPersistedHistory() {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const [drawsRes, betsRes] = await Promise.all([
        api.drawHistory({ limit: 20 }),
        api.betHistory({ limit: 20 }),
      ]);

      setDrawHistory(drawsRes.data);
      setBetHistory(betsRes.data);
    } catch (err) {
      setHistoryError(formatError(err));
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleCheckBet(e: FormEvent) {
    e.preventDefault();
    setBetLoading(true);
    setBetError("");
    setBetResult(null);

    try {
      const bet = buildBetInput(betType, betValue, betScope);
      const draw = useManualDraw ? parseManualDraw(betDrawInput) : undefined;

      const payload = draw
        ? { bet, draw, persist: true }
        : { bet, persist: true };
      const res = await api.checkBet(payload);
      setBetResult(res.data.result);

      // após validar aposta, recarrega histórico persistido
      await loadPersistedHistory();
    } catch (err) {
      setBetError(formatError(err));
    } finally {
      setBetLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.brand}>JOGOBICHO</h1>
          <p style={styles.subtitle}>
            Projeto educativo • sem dinheiro real • API: {api.baseUrl}
          </p>
        </div>
        <button style={styles.ghostButton} onClick={handleHealthCheck}>
          {healthStatus === "loading" ? "Verificando..." : "Health Check"}
        </button>
      </header>

      {(healthStatus === "ok" || healthStatus === "error") && (
        <div
          style={{
            ...styles.statusBar,
            ...(healthStatus === "ok" ? styles.statusOk : styles.statusError),
          }}
        >
          {healthMessage}
        </div>
      )}

      <nav style={styles.nav}>
        {navItems.map((item) => {
          const active = item.key === currentView;
          return (
            <button
              key={item.key}
              onClick={() => setCurrentView(item.key)}
              style={{
                ...styles.navButton,
                ...(active ? styles.navButtonActive : {}),
              }}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <main style={styles.main}>
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>{title}</h2>

          {currentView === "home" && (
            <div style={styles.content}>
              <p>Frontend conectado com backend real.</p>
              <ul style={styles.list}>
                <li>
                  ✅ Sorteio via endpoint <code>/draw</code>
                </li>
                <li>
                  ✅ Validação de aposta via <code>/bets/check</code>
                </li>
                <li>✅ Exibição de parse (milhar/centena/dezena/grupo)</li>
              </ul>

              <div style={styles.inlineRow}>
                <label style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={drawUnique}
                    onChange={(e) => setDrawUnique(e.target.checked)}
                  />
                  Sorteio sem repetição
                </label>
                <button style={styles.primaryButton} onClick={handleDraw}>
                  {drawLoading ? "Sorteando..." : "Sortear Agora"}
                </button>
                <button
                  style={styles.ghostButton}
                  onClick={loadPersistedHistory}
                >
                  {historyLoading
                    ? "Atualizando histórico..."
                    : "Carregar Histórico Persistido"}
                </button>
              </div>

              {drawError && <div style={styles.errorBox}>{drawError}</div>}
              {historyError && (
                <div style={styles.errorBox}>{historyError}</div>
              )}
            </div>
          )}

          {currentView === "aposta" && (
            <form onSubmit={handleCheckBet} style={styles.content}>
              <div style={styles.grid}>
                <label style={styles.field}>
                  <span>Modalidade</span>
                  <select
                    style={styles.input}
                    value={betType}
                    onChange={(e) => setBetType(e.target.value as BetType)}
                  >
                    {(Object.keys(betTypeLabels) as BetType[]).map((type) => (
                      <option key={type} value={type}>
                        {betTypeLabels[type]}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={styles.field}>
                  <span>Valor</span>
                  <input
                    style={styles.input}
                    value={betValue}
                    onChange={(e) => setBetValue(e.target.value)}
                    placeholder={placeholderByType(betType)}
                  />
                </label>

                <label style={styles.field}>
                  <span>Escopo</span>
                  <select
                    style={styles.input}
                    value={betScope}
                    onChange={(e) => setBetScope(e.target.value as BetScope)}
                  >
                    <option value="head">Na cabeça (1º prêmio)</option>
                    <option value="1to5">Do 1º ao 5º</option>
                  </select>
                </label>
              </div>

              <label style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={useManualDraw}
                  onChange={(e) => setUseManualDraw(e.target.checked)}
                />
                Usar sorteio manual
              </label>

              {useManualDraw && (
                <label style={styles.field}>
                  <span>Prêmios (5 milhares separados por vírgula)</span>
                  <input
                    style={styles.input}
                    value={betDrawInput}
                    onChange={(e) => setBetDrawInput(e.target.value)}
                    placeholder="1234,5678,9012,3456,7890"
                  />
                </label>
              )}

              <button type="submit" style={styles.primaryButton}>
                {betLoading ? "Validando..." : "Validar Aposta"}
              </button>

              {betError && <div style={styles.errorBox}>{betError}</div>}

              {betResult && (
                <div
                  style={{
                    ...styles.resultBox,
                    ...(betResult.isWin ? styles.resultWin : styles.resultLose),
                  }}
                >
                  <strong>
                    {betResult.isWin ? "✅ Aposta vencedora" : "❌ Não bateu"}
                  </strong>
                  <div>
                    Posições:{" "}
                    {betResult.matches.length > 0
                      ? betResult.matches.join(", ")
                      : "nenhuma"}
                  </div>
                  {betResult.meta?.requiredGroups && (
                    <div>
                      Grupos exigidos:{" "}
                      {betResult.meta.requiredGroups.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </form>
          )}

          {currentView === "historico" && (
            <div style={styles.content}>
              {!drawData || !drawParsed ? (
                <div style={styles.placeholder}>
                  Nenhum sorteio local carregado ainda. Vá em{" "}
                  <strong>Início</strong> e clique em{" "}
                  <strong>Sortear Agora</strong>.
                </div>
              ) : (
                <>
                  {autoDrawCooldown > 0 && (
                    <p style={styles.miniText}>
                      ⏱️ Cooldown: {autoDrawCooldown}min antes do próximo
                      sorteio
                    </p>
                  )}

                  <p>
                    <strong>
                      {new Date(drawData.createdAt).toLocaleString()}
                    </strong>
                  </p>

                  <div style={styles.drawGrid}>
                    {[
                      {
                        label: "1º",
                        value: drawData.first,
                        parsed: drawParsed.first,
                      },
                      {
                        label: "2º",
                        value: drawData.second,
                        parsed: drawParsed.second,
                      },
                      {
                        label: "3º",
                        value: drawData.third,
                        parsed: drawParsed.third,
                      },
                      {
                        label: "4º",
                        value: drawData.fourth,
                        parsed: drawParsed.fourth,
                      },
                      {
                        label: "5º",
                        value: drawData.fifth,
                        parsed: drawParsed.fifth,
                      },
                    ].map((item) => (
                      <div key={item.label} style={styles.drawCard}>
                        <strong>
                          {item.label} prêmio: {item.value}
                        </strong>
                        <div style={styles.miniText}>
                          centena {item.parsed.centena} • dezena{" "}
                          {item.parsed.dezena}
                        </div>
                        <div style={styles.miniText}>
                          grupo {item.parsed.grupo} • {item.parsed.animal}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <section style={styles.historySection}>
                <div style={styles.historyHeader}>
                  <h3 style={styles.subTitle}>
                    Histórico Persistido de Sorteios
                  </h3>
                  <button
                    style={styles.ghostButton}
                    onClick={loadPersistedHistory}
                  >
                    {historyLoading ? "Atualizando..." : "Recarregar"}
                  </button>
                </div>

                {drawHistory.length === 0 ? (
                  <div style={styles.placeholder}>
                    Sem sorteios persistidos ainda.
                  </div>
                ) : (
                  <div style={styles.drawGrid}>
                    {drawHistory.map((d) => (
                      <div key={d.id} style={styles.drawCard}>
                        <strong>
                          #{d.id.slice(0, 8)} •{" "}
                          {new Date(d.createdAt).toLocaleString()}
                        </strong>
                        <div style={styles.miniText}>
                          {d.first} • {d.second} • {d.third} • {d.fourth} •{" "}
                          {d.fifth}
                        </div>
                        <div style={styles.miniText}>
                          seed: {d.seed ?? "n/a"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section style={styles.historySection}>
                <h3 style={styles.subTitle}>Histórico Persistido de Apostas</h3>

                {betHistory.length === 0 ? (
                  <div style={styles.placeholder}>
                    Sem resultados persistidos de aposta ainda.
                  </div>
                ) : (
                  <div style={styles.betHistoryList}>
                    {betHistory.map((item) => (
                      <div key={item.id} style={styles.betHistoryItem}>
                        <div style={styles.inlineRow}>
                          <strong>{item.isWin ? "✅ WIN" : "❌ LOSS"}</strong>
                          <span style={styles.miniText}>
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div style={styles.miniText}>
                          tipo: {item.bet.type} • escopo: {item.bet.scope} •
                          pontos: {item.prizePoints}
                        </div>
                        <div style={styles.miniText}>
                          draw: {item.draw.first}, {item.draw.second},{" "}
                          {item.draw.third}, {item.draw.fourth},{" "}
                          {item.draw.fifth}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {currentView === "regras" && (
            <div style={styles.content}>
              <p>Resumo técnico:</p>
              <ul style={styles.list}>
                <li>Dezena = 2 últimos dígitos do número.</li>
                <li>Se dezena = 00, grupo = 25.</li>
                <li>Senão: grupo = ceil(dezena / 4).</li>
              </ul>
              <p>
                Exemplo: <strong>7842</strong> → dezena <strong>42</strong> →
                grupo <strong>11</strong>.
              </p>
            </div>
          )}
        </section>
      </main>

      <footer style={styles.footer}>
        <small>© {new Date().getFullYear()} JOGOBICHO</small>
      </footer>
    </div>
  );
}

function buildBetInput(
  type: BetType,
  rawValue: string,
  scope: BetScope,
): BetInput {
  const cleaned = rawValue.trim();

  switch (type) {
    case "grupo":
      return { type, scope, value: Number(cleaned) };

    case "dezena":
    case "centena":
    case "milhar":
    case "milhar_invertida":
      return { type, scope, value: cleaned };

    case "duque_grupo":
      return {
        type,
        scope,
        value: parseNumberList(cleaned, 2) as [number, number],
      };

    case "terno_grupo":
      return {
        type,
        scope,
        value: parseNumberList(cleaned, 3) as [number, number, number],
      };

    default:
      return { type: "grupo", scope, value: 1 };
  }
}

function parseNumberList(input: string, expectedLen: number): number[] {
  const parts = input
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number(x));

  if (parts.length !== expectedLen || parts.some((n) => Number.isNaN(n))) {
    throw new Error(
      `Informe exatamente ${expectedLen} números separados por vírgula.`,
    );
  }

  return parts;
}

function parseManualDraw(input: string): {
  prizes: [string, string, string, string, string];
} {
  const parts = input
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  if (parts.length !== 5) {
    throw new Error(
      "Sorteio manual deve conter 5 milhares separados por vírgula.",
    );
  }

  const normalized = parts.map((p) => {
    if (!/^\d{1,4}$/.test(p)) {
      throw new Error(`Milhar inválida no sorteio manual: "${p}"`);
    }
    return p.padStart(4, "0");
  }) as [string, string, string, string, string];

  return { prizes: normalized };
}

function placeholderByType(type: BetType): string {
  switch (type) {
    case "grupo":
      return "Ex: 9";
    case "dezena":
      return "Ex: 42";
    case "centena":
      return "Ex: 842";
    case "milhar":
      return "Ex: 7842";
    case "duque_grupo":
      return "Ex: 9,23";
    case "terno_grupo":
      return "Ex: 9,20,3";
    case "milhar_invertida":
      return "Ex: 1234";
    default:
      return "Valor";
  }
}

function formatError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Erro inesperado";
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, #0b1220 0%, #111827 45%, #0f172a 100%)",
    color: "#e5e7eb",
    display: "flex",
    flexDirection: "column",
    fontFamily:
      "Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, sans-serif",
  },
  header: {
    padding: "20px 24px 8px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 12,
  },
  statusBar: {
    margin: "8px 24px 0",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
  },
  statusOk: {
    background: "rgba(16,185,129,0.2)",
    border: "1px solid rgba(16,185,129,0.45)",
    color: "#a7f3d0",
  },
  statusError: {
    background: "rgba(239,68,68,0.18)",
    border: "1px solid rgba(239,68,68,0.45)",
    color: "#fecaca",
  },
  brand: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: 0.5,
  },
  subtitle: {
    margin: "6px 0 0",
    color: "#9ca3af",
    fontSize: 14,
  },
  nav: {
    display: "flex",
    gap: 8,
    padding: "12px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    flexWrap: "wrap",
  },
  navButton: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "transparent",
    color: "#d1d5db",
    cursor: "pointer",
    fontWeight: 600,
  },
  navButtonActive: {
    background: "#7c3aed",
    border: "1px solid #7c3aed",
    color: "#fff",
  },
  main: {
    flex: 1,
    padding: 24,
    display: "grid",
    placeItems: "start center",
  },
  card: {
    width: "100%",
    maxWidth: 980,
    borderRadius: 16,
    background: "rgba(17, 24, 39, 0.8)",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: 20,
    boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
  },
  sectionTitle: {
    margin: "0 0 14px",
    fontSize: 22,
    fontWeight: 700,
  },
  content: {
    display: "grid",
    gap: 12,
    color: "#e5e7eb",
  },
  list: {
    margin: 0,
    paddingLeft: 18,
    display: "grid",
    gap: 6,
  },
  inlineRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  checkboxRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    color: "#cbd5e1",
    fontSize: 14,
  },
  grid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  field: {
    display: "grid",
    gap: 6,
    fontSize: 14,
    color: "#cbd5e1",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(2,6,23,0.5)",
    color: "#f8fafc",
    outline: "none",
  },
  primaryButton: {
    marginTop: 6,
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "#f59e0b",
    color: "#111827",
    fontWeight: 700,
    cursor: "pointer",
    width: "fit-content",
  },
  ghostButton: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "transparent",
    color: "#e5e7eb",
    fontWeight: 600,
  },
  placeholder: {
    border: "1px dashed rgba(255,255,255,0.2)",
    borderRadius: 12,
    padding: 14,
    color: "#cbd5e1",
    background: "rgba(2,6,23,0.35)",
  },
  errorBox: {
    border: "1px solid rgba(239,68,68,0.45)",
    borderRadius: 10,
    padding: 12,
    background: "rgba(239,68,68,0.18)",
    color: "#fecaca",
    fontSize: 14,
  },
  resultBox: {
    borderRadius: 10,
    padding: 12,
    display: "grid",
    gap: 6,
  },
  resultWin: {
    border: "1px solid rgba(16,185,129,0.45)",
    background: "rgba(16,185,129,0.18)",
    color: "#a7f3d0",
  },
  resultLose: {
    border: "1px solid rgba(239,68,68,0.45)",
    background: "rgba(239,68,68,0.18)",
    color: "#fecaca",
  },
  drawGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  drawCard: {
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 12,
    background: "rgba(2,6,23,0.4)",
    display: "grid",
    gap: 4,
  },
  historySection: {
    marginTop: 8,
    display: "grid",
    gap: 10,
  },
  historyHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  subTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: "#e5e7eb",
  },
  betHistoryList: {
    display: "grid",
    gap: 8,
  },
  betHistoryItem: {
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: 10,
    background: "rgba(2,6,23,0.35)",
    display: "grid",
    gap: 4,
  },
  miniText: {
    color: "#cbd5e1",
    fontSize: 13,
  },
  footer: {
    padding: "14px 24px 20px",
    color: "#9ca3af",
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
};

export default App;
