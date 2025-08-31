import { useEffect, useMemo, useRef, useState } from "react";
import LZString from "lz-string";
import { useLocalStorage } from "./utils/UseLocalStorage";
import { buildBracket } from "./utils/buildBracket";
import { autoAdvanceByes } from "./utils/autoAdvanceByes";
import { deepClone } from "./utils/deepClone";
import { clearDownstream } from "./utils/clearDownstream";
import { resolveSlotName } from "./utils/resolveSlotName";
import { roundLabel } from "./utils/roundLabel";
import Section from "./components/section";
import Pill from "./components/Pill";
import { RoundColumn } from "./components/RoundColumn";

const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } =
  LZString;

const nowISO = () => new Date().toISOString().slice(0, 16);

// ---------- App ----------
export default function App() {
  // Configurações
  const [settings, setSettings] = useLocalStorage("chess-settings-v2", {
    title: "Torneio de Xadrez · SENAI",
    primaryColor: "#005ca9",
    seedingMode: "random",
    bo3: false,
    mesas: 8,
    durationMin: 15,
    breakMin: 5,
    startISO: nowISO(),
    logoDataUrl: "",
  });

  const [rawNames, setRawNames] = useState(
    Array.from({ length: 34 }, (_, i) => `Jogador ${i + 1}`).join("\n")
  );

  const [players, setPlayers] = useLocalStorage("chess-players-v2", []);

  const [state, setState] = useLocalStorage("chess-tournament-state-v2", {
    rounds: [],
    baseSize: 0,
    prelimCount: 0,
  });

  const hasPrelim = state.prelimCount > 0;

  const [readOnly, setReadOnly] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareURL, setShareURL] = useState("");

  useEffect(() => {
    const hash = window.location.hash?.slice(1) || "";
    const params = new URLSearchParams(hash);
    const v = params.get("view");
    const data = params.get("data");
    if (data) {
      try {
        const json = JSON.parse(decompressFromEncodedURIComponent(data));
        if (json?.state && json?.settings) {
          setState(json.state);
          setSettings((s) => ({ ...s, ...json.settings }));
          setReadOnly(v === "1");
        }
      } catch (e) {
        console.error("Snapshot inválido", e);
      }
    }
  }, []);

  // Sincroniza check-in a partir do textarea
  function syncPlayersFromRaw() {
    const names = rawNames
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    const map = new Map(players.map((p) => [p.name, p.present]));
    const merged = names.map((n) => ({
      name: n,
      present: map.has(n) ? map.get(n) : true,
    }));
    setPlayers(merged);
  }

  // Gera chaves
  function generate() {
    const list = players.length
      ? players.filter((p) => p.present).map((p) => p.name)
      : rawNames
          .split("\n")
          .map((n) => n.trim())
          .filter(Boolean);

    const res = buildBracket(list, settings.seedingMode);
    let { rounds } = res;
    let step = autoAdvanceByes(rounds);
    while (step.changed) {
      rounds = step.rounds;
      step = autoAdvanceByes(rounds);
    }
    setState({ ...res, rounds });
  }

  // Escolha no BO1
  function handlePick(roundIndex, matchIndex, winnerIndex) {
    if (settings.bo3) return;
    const R = deepClone(state.rounds);
    R[roundIndex][matchIndex].winnerIndex = winnerIndex;
    R[roundIndex][matchIndex].scores = [0, 0];
    const cleared = clearDownstream(R, roundIndex, matchIndex);
    let step = autoAdvanceByes(cleared);
    while (step.changed) step = autoAdvanceByes(step.rounds);
    setState((s) => ({ ...s, rounds: step.rounds }));
  }

  // BO3
  function handleBo3Win(roundIndex, matchIndex, playerIdx) {
    if (!settings.bo3) return;
    const R = deepClone(state.rounds);
    const m = R[roundIndex][matchIndex];
    if (!m.scores) m.scores = [0, 0];
    if (m.winnerIndex !== -1) return;
    m.scores[playerIdx] = Math.min(2, (m.scores[playerIdx] || 0) + 1);
    if (m.scores[playerIdx] >= 2) {
      m.winnerIndex = playerIdx;
      const cleared = clearDownstream(R, roundIndex, matchIndex);
      let step = autoAdvanceByes(cleared);
      while (step.changed) step = autoAdvanceByes(step.rounds);
      setState((s) => ({ ...s, rounds: step.rounds }));
    } else {
      setState((s) => ({ ...s, rounds: R }));
    }
  }

  function handleBo3Reset(roundIndex, matchIndex) {
    const R = deepClone(state.rounds);
    const m = R[roundIndex][matchIndex];
    m.scores = [0, 0];
    m.winnerIndex = -1;
    const cleared = clearDownstream(R, roundIndex, matchIndex);
    setState((s) => ({ ...s, rounds: cleared }));
  }

  const containerRef = useRef(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e) => {
    setIsDown(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDown(false);
  const handleMouseUp = () => setIsDown(false);

  const handleMouseMove = (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1; // multiplicador da velocidade
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  // Agendamento
  function scheduleRounds() {
    if (!state.rounds.length) return;
    const R = deepClone(state.rounds);
    const mesas = Math.max(1, parseInt(settings.mesas || 1, 10));
    const dur = Math.max(5, parseInt(settings.durationMin || 15, 10));
    const brk = Math.max(0, parseInt(settings.breakMin || 0, 10));
    let cursor = new Date(settings.startISO || nowISO());
    for (let r = 0; r < R.length; r++) {
      const matches = R[r];
      for (let i = 0; i < matches.length; i++) {
        const block = Math.floor(i / mesas);
        const t = new Date(cursor.getTime() + block * dur * 60000);
        matches[i].meta = {
          ...(matches[i].meta || {}),
          table: (i % mesas) + 1,
          timeISO: t.toISOString(),
        };
      }
      const blocks = Math.ceil(matches.length / mesas);
      cursor = new Date(cursor.getTime() + (blocks * dur + brk) * 60000);
    }
    setState((s) => ({ ...s, rounds: R }));
  }

  // Export/Import
  function exportJSON() {
    const data = JSON.stringify({ settings, players, state }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "torneio-xadrez.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (obj?.state?.rounds) {
          setSettings((s) => ({ ...s, ...(obj.settings || {}) }));
          setPlayers(obj.players || []);
          setState(obj.state);
        } else {
          alert("Arquivo inválido.");
        }
      } catch {
        alert("Falha ao ler JSON.");
      }
    };
    reader.readAsText(file);
  }

  function resetAll() {
    setState({ rounds: [], baseSize: 0, prelimCount: 0 });
  }

  function shareSnapshot() {
    const snapshot = { settings, state };
    const encoded = compressToEncodedURIComponent(JSON.stringify(snapshot));
    const url = `${window.location.origin}${window.location.pathname}#view=1&data=${encoded}`;
    setShareURL(url);
    setShareOpen(true);
  }

  function uploadLogo(file) {
    const reader = new FileReader();
    reader.onload = () =>
      setSettings((s) => ({ ...s, logoDataUrl: reader.result }));
    reader.readAsDataURL(file);
  }

  const champion = useMemo(() => {
    const lastRound = state.rounds[state.rounds.length - 1];
    if (!lastRound || !lastRound[0]) return null;
    const m = lastRound[0];
    const wIdx = m.winnerIndex;
    if (wIdx === 0) return resolveSlotName(m.p1, state.rounds);
    if (wIdx === 1) return resolveSlotName(m.p2, state.rounds);
    return null;
  }, [state.rounds]);

  const primary = settings.primaryColor || "#005ca9";

  return (
    <div
      className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at top right, rgba(0,92,169,0.08), transparent 50%)",
      }}
    >
      <div className="max-w-screen-2xl mx-auto px-4 py-6">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            {settings.logoDataUrl ? (
              <img
                src={settings.logoDataUrl}
                alt="logo"
                className="h-12 w-12 object-contain rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white"
              />
            ) : (
              <div className="h-12 w-12 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white flex items-center justify-center text-sm">
                LOGO
              </div>
            )}
            <div>
              <h1
                className="text-2xl md:text-3xl font-extrabold tracking-tight"
                style={{ color: primary }}
              >
                {settings.title}
              </h1>
              <p className="text-neutral-600 dark:text-neutral-300">
                Mata-mata com pré-eliminatória automática, check-in, agendamento
                e compartilhamento por link.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportJSON}
              className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              Exportar JSON
            </button>
            <label className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer">
              Importar JSON
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) =>
                  e.target.files?.[0] && importJSON(e.target.files[0])
                }
              />
            </label>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                shareSnapshot();
              }}
              className="px-4 py-2 rounded-xl text-white font-semibold"
              style={{ backgroundColor: primary }}
            >
              Compartilhar / Link
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Lateral: identidade, jogadores, regras */}
          <div className="xl:col-span-1">
            <Section title="Identidade visual" right={<Pill>Personalize</Pill>}>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-sm w-32">Título</label>
                  <input
                    className="flex-1 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2"
                    value={settings.title}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, title: e.target.value }))
                    }
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm w-32">Cor primária</label>
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        primaryColor: e.target.value,
                      }))
                    }
                  />
                  <input
                    className="flex-1 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 font-mono"
                    value={settings.primaryColor}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        primaryColor: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm w-32">Logotipo</label>
                  <label className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer">
                    Carregar imagem
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files?.[0] && uploadLogo(e.target.files[0])
                      }
                    />
                  </label>
                  {settings.logoDataUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((s) => ({ ...s, logoDataUrl: "" }))
                      }
                      className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </Section>

            <Section
              title="Jogadores"
              right={
                <Pill>
                  {players.length ||
                    rawNames.split("\n").filter(Boolean).length}{" "}
                  alunos
                </Pill>
              }
            >
              <div className="space-y-3">
                <label className="block text-sm font-medium">
                  Cole os nomes (um por linha):
                </label>
                <textarea
                  className="w-full h-40 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 font-mono text-sm"
                  value={rawNames}
                  onChange={(e) => setRawNames(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={syncPlayersFromRaw}
                    className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700"
                  >
                    Sincronizar check-in
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRawNames(
                        Array.from(
                          { length: 34 },
                          (_, i) => `Jogador ${i + 1}`
                        ).join("\n")
                      )
                    }
                    className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700"
                  >
                    Preencher 34 genéricos
                  </button>
                </div>
                {players.length > 0 && (
                  <div className="max-h-56 overflow-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
                    {players.map((p, idx) => (
                      <label
                        key={idx}
                        className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 border-neutral-100 dark:border-neutral-800"
                      >
                        <span className="truncate">{p.name}</span>
                        <input
                          type="checkbox"
                          checked={!!p.present}
                          onChange={(e) =>
                            setPlayers((pl) =>
                              pl.map((x, i) =>
                                i === idx
                                  ? { ...x, present: e.target.checked }
                                  : x
                              )
                            )
                          }
                        />
                      </label>
                    ))}
                  </div>
                )}
                {players.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPlayers((pl) =>
                          pl.map((x) => ({ ...x, present: true }))
                        )
                      }
                      className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700"
                    >
                      Marcar todos
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPlayers((pl) =>
                          pl.map((x) => ({ ...x, present: false }))
                        )
                      }
                      className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700"
                    >
                      Desmarcar todos
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      id="seed-random"
                      type="radio"
                      name="seeding"
                      checked={settings.seedingMode === "random"}
                      onChange={() =>
                        setSettings((s) => ({ ...s, seedingMode: "random" }))
                      }
                    />
                    <label htmlFor="seed-random" className="text-sm">
                      Sorteio aleatório
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="seed-ordered"
                      type="radio"
                      name="seeding"
                      checked={settings.seedingMode === "ordered"}
                      onChange={() =>
                        setSettings((s) => ({ ...s, seedingMode: "ordered" }))
                      }
                    />
                    <label htmlFor="seed-ordered" className="text-sm">
                      Preservar ordem
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={generate}
                    disabled={readOnly}
                    className="px-4 py-2 rounded-xl text-white font-semibold disabled:opacity-50"
                    style={{ backgroundColor: primary }}
                  >
                    Gerar chaves (
                    {players.filter((p) => p.present).length ||
                      rawNames.split("\n").filter(Boolean).length}
                    )
                  </button>
                  <button
                    type="button"
                    onClick={resetAll}
                    disabled={readOnly}
                    className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 disabled:opacity-50"
                  >
                    Reiniciar
                  </button>
                </div>
              </div>
            </Section>

            <Section
              title="Regras e agendamento"
              right={<Pill>{settings.bo3 ? "BO3" : "BO1"}</Pill>}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-sm w-32">Formato da partida</label>
                  <select
                    value={settings.bo3 ? "bo3" : "bo1"}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        bo3: e.target.value === "bo3",
                      }))
                    }
                    className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2"
                  >
                    <option value="bo1">1 jogo (BO1)</option>
                    <option value="bo3">Melhor de 3 (BO3)</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm w-32">Mesas disponíveis</label>
                  <input
                    type="number"
                    min={1}
                    value={settings.mesas}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        mesas: parseInt(e.target.value || "1", 10),
                      }))
                    }
                    className="w-24 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm w-32">Início</label>
                  <input
                    type="datetime-local"
                    value={settings.startISO}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, startISO: e.target.value }))
                    }
                    className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3">
                    <label className="text-sm w-24">Duração (min)</label>
                    <input
                      type="number"
                      min={5}
                      value={settings.durationMin}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          durationMin: parseInt(e.target.value || "15", 10),
                        }))
                      }
                      className="w-24 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm w-28">Intervalo (min)</label>
                    <input
                      type="number"
                      min={0}
                      value={settings.breakMin}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          breakMin: parseInt(e.target.value || "0", 10),
                        }))
                      }
                      className="w-24 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={scheduleRounds}
                    disabled={readOnly || !state.rounds.length}
                    className="px-4 py-2 rounded-xl text-white font-semibold disabled:opacity-50"
                    style={{ backgroundColor: primary }}
                  >
                    Agendar rodadas
                  </button>
                </div>
                <p className="text-xs text-neutral-500">
                  O agendamento percorre as rodadas, distribui partidas nas
                  mesas e calcula horários por blocos, com intervalo entre
                  rodadas.
                </p>
              </div>
            </Section>

            <Section title="Status do torneio">
              <div className="flex items-center gap-3 flex-wrap">
                <Pill>Base: {state.baseSize || "-"}</Pill>
                <Pill>Pré: {state.prelimCount}</Pill>
                <Pill>Rodadas: {state.rounds.length}</Pill>
                {champion && (
                  <Pill className="bg-yellow-100 border-yellow-300 dark:bg-yellow-950 dark:border-yellow-800 text-yellow-900 dark:text-yellow-300">
                    🏆 Campeão: {champion}
                  </Pill>
                )}
                {readOnly && (
                  <Pill className="bg-purple-100 border-purple-300 dark:bg-purple-950 dark:border-purple-800 text-purple-900 dark:text-purple-300">
                    Somente leitura
                  </Pill>
                )}
              </div>
            </Section>

            <Section title="Ajuda rápida">
              <ol className="list-decimal list-inside space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
                <li>
                  Sincronize a lista com <strong>check-in</strong> e gere as
                  chaves.
                </li>
                <li>
                  Escolha <strong>BO1</strong> ou <strong>BO3</strong>.
                </li>
                <li>
                  Use <strong>Agendar rodadas</strong> para mesas/horários.
                </li>
                <li>
                  No BO1, clique no nome do vencedor. No BO3, registre vitórias
                  parciais até 2.
                </li>
                <li>
                  Compartilhe pelo <strong>link</strong> (snapshot em modo
                  leitura).
                </li>
              </ol>
            </Section>
          </div>

          {/* Chaveamento */}
          <div className="xl:col-span-2 overflow-x-auto">
            {state.rounds.length === 0 ? (
              <div className="h-[60vh] flex items-center justify-center text-neutral-500">
                Gere as chaves para visualizar o chaveamento.
              </div>
            ) : (
              <div
                style={{ overflow: "hidden" }}
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className="
    grid grid-cols-1 gap-4 pb-8 w-full

    md:flex md:items-start md:gap-4 md:overflow-x-auto md:cursor-grab md:select-none
  "
              >
                {state.rounds.map((matches, rIdx) => (
                  <RoundColumn
                    key={rIdx}
                    title={roundLabel(rIdx, hasPrelim, state.baseSize)}
                    matches={matches}
                    rounds={state.rounds}
                    roundIndex={rIdx}
                    onPick={handlePick}
                    onBo3Win={handleBo3Win}
                    onBo3Reset={handleBo3Reset}
                    bo3={settings.bo3}
                    readOnly={readOnly}
                    primary={primary}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <footer className="mt-8 text-xs text-neutral-500 flex items-center justify-between">
          <span>
            Feito para torneios escolares · Funciona offline · Dark mode
            automático
          </span>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              resetAll();
            }}
            className="underline"
          >
            Limpar tudo
          </a>
        </footer>

        {/* Modal de compartilhamento (só link) */}
        {shareOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShareOpen(false)}
          >
            <div
              className="bg-white dark:bg-neutral-900 rounded-2xl p-5 max-w-lg w-full border border-neutral-200 dark:border-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">Compartilhar snapshot</h3>
                <button
                  type="button"
                  onClick={() => setShareOpen(false)}
                  className="px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700"
                >
                  Fechar
                </button>
              </div>

              <label className="block text-sm mb-1">
                Link (somente leitura):
              </label>
              <input
                readOnly
                value={shareURL}
                className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-xs"
                onFocus={(e) => e.target.select()}
              />

              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(shareURL)}
                  className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700"
                >
                  Copiar
                </button>
                <button
                  type="button"
                  onClick={() => window.open(shareURL, "_blank")}
                  className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700"
                >
                  Abrir em nova aba
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = shareURL;
                  }}
                  className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700"
                >
                  Abrir nesta aba
                </button>
              </div>

              <p className="mt-2 text-xs text-neutral-500">
                O link abre um snapshot do torneio em modo leitura. Se atualizar
                resultados, gere um novo link.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
