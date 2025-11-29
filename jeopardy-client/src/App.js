import { useState, useEffect, useRef, useCallback } from "react";
import { useLobby } from "./useSocket";
import "./App.css";

// ----------------------
// Profilbilder importieren
// ----------------------
import profile1 from "./img/Profile1.webp";
import profile2 from "./img/Profile2.webp";
import profile3 from "./img/Profile3.webp";
import profile4 from "./img/Profile4.webp";
import profile5 from "./img/Profile5.webp";
import profile6 from "./img/Profile6.webp";
import profile7 from "./img/Profile7.webp";
import profile8 from "./img/Profile8.webp";
import profile9 from "./img/Profile9.webp";
import profile10 from "./img/Profile10.webp";
import profile11 from "./img/Profile11.webp";
import profile12 from "./img/Profile12.webp";
import profile13 from "./img/Profile13.webp";
import profile14 from "./img/Profile14.webp";
import profile15 from "./img/Profile15.webp";
import profile16 from "./img/Profile16.webp";

// ----------------------
// Sounds importieren
// ----------------------
import questionSoundFile from "./sounds/question.mp3";
import revealSoundFile from "./sounds/reveal.mp3";
import correctSoundFile from "./sounds/correct.mp3";
import wrongSoundFile from "./sounds/wrong.mp3";

const MAX_TEAMS = 3;

// Liste der Avatar-Optionen
const avatarOptions = [
  { key: "profile1", url: profile1 },
  { key: "profile2", url: profile2 },
  { key: "profile3", url: profile3 },
  { key: "profile4", url: profile4 },
  { key: "profile5", url: profile5 },
  { key: "profile6", url: profile6 },
  { key: "profile7", url: profile7 },
  { key: "profile8", url: profile8 },
  { key: "profile9", url: profile9 },
  { key: "profile10", url: profile10 },
  { key: "profile11", url: profile11 },
  { key: "profile12", url: profile12 },
  { key: "profile13", url: profile13 },
  { key: "profile14", url: profile14 },
  { key: "profile15", url: profile15 },
  { key: "profile16", url: profile16 },
];

const avatarMap = Object.fromEntries(avatarOptions.map((a) => [a.key, a.url]));

// ----------------------
// Sound-Hook
// ----------------------
function useSound(src, volume = 1) {
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(src);
    audio.volume = volume;
    audioRef.current = audio;
  }, [src, volume]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.currentTime = 0;
      audio.play();
    } catch (e) {
      console.warn("Kann Sound nicht abspielen:", e);
    }
  }, []);

  return play;
}

// Frage abrufen
function getActiveQuestion(lobby) {
  const game = lobby?.game;
  if (!game || !game.activeQuestionId) return null;
  return game.questions?.[game.activeQuestionId] || null;
}

// =======================================================================
//                            HAUPTKOMPONENTE
// =======================================================================
function App() {
  const { socket, lobby, connected } = useLobby();

  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [scoreChange, setScoreChange] = useState({});
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editingTeamName, setEditingTeamName] = useState("");
  const [recentlyJoinedPlayerId, setRecentlyJoinedPlayerId] = useState(null);

  const setBoard = (boardId) => {
    if (!socket) return;
    socket.emit("set_board", { boardId });
  };

  // Avatar Picker UI
  const [openAvatarTeamId, setOpenAvatarTeamId] = useState(null);

  // Sounds
  const playQuestionSound = useSound(questionSoundFile, 0.2);
  const playRevealSound = useSound(revealSoundFile, 0.2);
  const playCorrectSound = useSound(correctSoundFile, 0.2);
  const playWrongSound = useSound(wrongSoundFile, 0.2);

  const joinLobby = () => {
    if (!socket) return;
    setError("");

    if (!name.trim() || !joinCode.trim()) {
      setError("Bitte Name und Lobby-Code eingeben");
      return;
    }

    socket.emit("join_lobby", {
      name: name.trim(),
      code: joinCode.trim().toUpperCase(),
    });
  };

  const createLobby = () => {
    if (!socket) return;
    setError("");

    if (!name.trim()) {
      setError("Bitte gib zuerst deinen Namen ein");
      return;
    }

    socket.emit("create_lobby", { name: name.trim() });
  };

  // Fehler handling
  useEffect(() => {
    if (!socket) return;

    const joinErr = (msg) => setError(msg);
    const gmErr = (msg) => setError(msg);
    const teamErr = (msg) => setError(msg);

    socket.on("join_error", joinErr);
    socket.on("gm_error", gmErr);
    socket.on("team_error", teamErr);

    return () => {
      socket.off("join_error", joinErr);
      socket.off("gm_error", gmErr);
      socket.off("team_error", teamErr);
    };
  }, [socket]);

  if (!lobby) {
    return (
      <div className="app-root">
        <div className="app-shell">
          {/* Header */}
          <header className="app-header">
            <div className="app-title">
              <h1>Jeopardy-Online</h1>
              <span className="app-pill">Multiplayer Quiz</span>
            </div>
            <div className="app-status">
              <span className="badge-connection">
                <span
                  className={
                    "badge-dot " +
                    (connected ? "badge-dot--ok" : "badge-dot--bad")
                  }
                />
                {connected ? "Verbunden" : "Nicht verbunden"}
              </span>
            </div>
          </header>

          <div className="lobby-body">
            <div className="panel panel--primary mainmenu">
              <h2>Jeopardy starten</h2>
              <span className="panel-subtitle">
                Erstelle eine neue Lobby oder tritt mit einem Code bei.
              </span>
              <label>
                Name
                <br />
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <button className="btn btn--primary" onClick={createLobby}>
                Lobby erstellen
              </button>
              <label>
                Lobby-Code (zum Beitreten)
                <br />
                <input
                  className="input"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />
              </label>
              <button className="btn" onClick={joinLobby}>
                Lobby beitreten
              </button>
              {error && <p className="error-text">{error}</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const me = socket ? lobby.players?.[socket.id] : null;
  const lobbyPhase = lobby.phase;
  const game = lobby.game;

  const teamCount = Object.keys(lobby.teams).length;

  // -----------------------
  // Aktionen
  // -----------------------

  const createTeam = (slotIndex) => {
    if (!socket) return;
    setError("");
    socket.emit("create_team", { slotIndex });
  };

  const renameTeam = (teamId, newName) => {
    if (!socket) return;
    setError("");
    socket.emit("rename_team", { teamId, name: newName });
  };

  const joinTeam = (teamId) => {
    if (!socket) return;
    setError("");
    socket.emit("join_team", { teamId });

    // Animation nach 1,2 Sek wieder entfernen
    setTimeout(() => setRecentlyJoinedPlayerId(null), 1200);
  };

  const becomeGamemaster = () => {
    const pin = window.prompt("Gamemaster-PIN:");
    if (!pin) return;
    socket.emit("set_gamemaster", { pin: pin.trim() });
  };

  const startGame = () => {
    if (!me?.isGamemaster) return;
    socket.emit("game_start");
  };

  const selectQuestion = (id) => {
    playQuestionSound();
    socket.emit("question_select", { questionId: id });
  };

  const revealAnswer = () => {
    playRevealSound();
    socket.emit("reveal_answer");
  };

  const answerResult = (correct) => {
    if (!socket) return;

    const teamId = game.currentTeamId;
    const points = activeQuestion.points;
    const delta = correct ? points : -points;

    // Score-Animation setzen
    setScoreChange((prev) => ({
      ...prev,
      [teamId]: delta,
    }));

    // nach 1 Sekunde wieder löschen
    setTimeout(() => {
      setScoreChange((prev) => ({
        ...prev,
        [teamId]: null,
      }));
    }, 1000);

    // Sounds abspielen
    if (correct) playCorrectSound();
    else playWrongSound();

    socket.emit("answer_result", { correct });
  };

  const setTeamAvatar = (teamId, avatarKey) => {
    if (!socket) return;
    socket.emit("set_team_avatar", { teamId, avatarKey });
    setOpenAvatarTeamId(null);
  };

  const activeQuestion = getActiveQuestion(lobby);

  // =======================================================================
  // BOARD
  // =======================================================================
  const renderBoard = () => {
    if (!game) return null;

    const categories = Object.values(game.categories);

    // Board-Index für Farbverschiebung ermitteln
    const boards = lobby.boards || [];
    const boardIndex = boards.findIndex((b) => b.id === lobby.selectedBoardId);
    const boardOffset = boardIndex >= 0 ? boardIndex : 0;
    const colorVariantCount = 6; // z.B. 6 verschiedene Farbschemata

    return (
      <div className="board">
        <div className="board-header">
          <div>Board</div>
          {game.currentTeamId && lobby.teams[game.currentTeamId] && (
            <div className="board-current-team">
              Dran: {lobby.teams[game.currentTeamId].name}
            </div>
          )}
        </div>

        <div className="board-grid">
          {categories.map((cat, idx) => {
            const colorIndex = (idx + boardOffset) % colorVariantCount;
            const colorClass = `cat-color-${colorIndex}`;

            return (
              <div className={`category-column ${colorClass}`} key={cat.id}>
                <div className="category-title">{cat.title}</div>

                {cat.questionIds.map((qId) => {
                  const q = game.questions[qId];
                  if (!q) return null;

                  const isAnswered = q.state === "answered";
                  const isDisabled =
                    game.phase !== "board" ||
                    isAnswered ||
                    me.teamId !== game.currentTeamId;

                  return (
                    <div className="question-cell" key={qId}>
                      <button
                        className={
                          "question-button" +
                          (isAnswered ? " question-button--answered" : "") +
                          (isDisabled && !isAnswered
                            ? " question-button--disabled"
                            : "")
                        }
                        onClick={() => selectQuestion(qId)}
                        disabled={isDisabled}
                      >
                        {q.points}
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderEndscreen = () => {
    const teams = Object.values(lobby.teams);

    const sorted = teams
      .map((t) => ({
        ...t,
        score: game.scores[t.id] || 0,
      }))
      .sort((a, b) => b.score - a.score);

    return (
      <div className="endscreen">
        <h1 className="endscreen-title">🎉 Endergebnis 🎉</h1>

        <div className="endscreen-results">
          {sorted.map((team, index) => (
            <div className="endscreen-card" key={team.id}>
              <div className="endscreen-place">
                {index === 0
                  ? "🏆"
                  : index === 1
                  ? "🥈"
                  : index === 2
                  ? "🥉"
                  : index + 1}
              </div>

              <div className={"endscreen-avatar"}>
                <img src={avatarMap[team.avatarKey]} alt="" />
              </div>

              <div className="endscreen-name">{team.name}</div>
              <div className="endscreen-score">{team.score} Punkte</div>
            </div>
          ))}
        </div>

        {me.isGamemaster && (
          <button className="btn btn--primary" onClick={resetLobby}>
            Spiel beenden & zurück zur Lobby
          </button>
        )}
      </div>
    );
  };

  const resetLobby = () => {
    if (!socket) return;
    socket.emit("game_end");
  };

  // =======================================================================
  // FRAGE- / ANTWORT-ANSICHT
  // =======================================================================
  const renderQuestionView = () => {
    if (!game || !activeQuestion) return null;

    const header = (
      <div
        className={
          "question-view " +
          (game.phase === "reveal" && game.lastAnswerCorrect === false
            ? "shake-wrong"
            : "")
        }
      >
        <div>
          <div className="question-heading-title">
            {game.categories[activeQuestion.categoryId]?.title}
          </div>
          <div className="question-points">{activeQuestion.points} Punkte</div>
        </div>
        <span className="tag">
          {game.phase === "question" ? "Frage" : "Antwort"}
        </span>
      </div>
    );

    return (
      <div className="question-view">
        {header}

        <div className="question-body">
          <strong>Frage:</strong> {activeQuestion.questionText}
        </div>

        {game.phase === "reveal" && (
          <div className="question-answer">
            <strong>Antwort:</strong> {activeQuestion.answerText}
          </div>
        )}

        {me?.isGamemaster && (
          <div className="question-actions">
            {game.phase === "question" && (
              <button className="btn btn--primary" onClick={revealAnswer}>
                Antwort anzeigen
              </button>
            )}
            {game.phase === "reveal" && (
              <>
                <button
                  className="btn btn--primary"
                  onClick={() => answerResult(true)}
                >
                  Antwort richtig
                </button>
                <button className="btn" onClick={() => answerResult(false)}>
                  Antwort falsch
                </button>
              </>
            )}
          </div>
        )}

        {!me?.isGamemaster && (
          <div className="helper-text">
            Der Gamemaster steuert die Antworten.
          </div>
        )}
      </div>
    );
  };

  // =======================================================================
  // TEAMS-BAR UNTEN IM SPIEL
  // =======================================================================
  const renderTeamsBar = () => {
    if (!game) return null;

    return (
      <div className="teams-bar">
        {Object.entries(lobby.teams).map(([teamId, team]) => {
          const avatarObj = avatarOptions.find((a) => a.key === team.avatarKey);
          const avatarUrl = avatarObj?.url;
          const score = game.scores[teamId] ?? 0;

          return (
            <div
              key={teamId}
              className={
                "team-card-game " +
                (game.currentTeamId === teamId ? "team-card-game--active" : "")
              }
            >
              <div className="team-info-row">
                <span className="team-info-name">{team.name}</span>
              </div>
              <div
                className="team-avatar-wrap"
                style={{ position: "relative" }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} className="team-avatar-img" alt="" />
                ) : (
                  <div className="team-avatar-placeholder">{team.name[0]}</div>
                )}

                {/* ★ Score Animation */}
                {scoreChange[teamId] !== null &&
                  scoreChange[teamId] !== undefined && (
                    <div className="score-change">
                      {scoreChange[teamId] > 0
                        ? "+" + scoreChange[teamId]
                        : scoreChange[teamId]}
                    </div>
                  )}
              </div>

              <div className="team-info-row">
                <span className="team-info-score">{score}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // =======================================================================
  // UI RENDER
  // =======================================================================
  return (
    <div className="app-root">
      <div className="app-shell">
        {/* Header */}
        <header className="app-header">
          <div className="app-title">
            <h1>Jeopardy-Online</h1>
            <span className="app-pill">Multiplayer Quiz</span>
          </div>
          <div className="app-status">
            <span className="badge-connection">
              <span
                className={
                  "badge-dot " +
                  (connected ? "badge-dot--ok" : "badge-dot--bad")
                }
              />
              {connected ? "Verbunden" : "Nicht verbunden"}
            </span>
            {me && (
              <span style={{ fontSize: 12 }}>Logged in als {me.name}</span>
            )}
          </div>
        </header>

        {error && <p className="error-text">Fehler: {error}</p>}

        <p style={{ fontSize: 40, fontWeight: 700 }}>
          Lobby-Code: {lobby.code}
        </p>

        {/* ============================ LOGIN ============================ */}

        {/* ============================ LOBBY ============================ */}
        {me && lobbyPhase === "lobby" && (
          <div className="panel panel--primary" style={{ marginTop: 12 }}>
            <div className="panel-header">
              <h2>Lobby</h2>
              <span className="panel-subtitle">
                Teams bilden & Gamemaster wählen
              </span>
            </div>

            {lobby.phase === "lobby" && lobby.boards && (
              <div className="board-info-bar">
                <span className="board-info-label">Aktuelles Spielfeld:</span>
                <span className="board-info-title">
                  {lobby.boards.find((b) => b.id === lobby.selectedBoardId)
                    ?.title || "Unbekanntes Board"}
                </span>
              </div>
            )}

            {/* Gamemaster / Spiel starten */}
            <div
              className="form-row"
              style={{ alignItems: "center", justifyContent: "space-between" }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                {me.isGamemaster && (
                  <button className="btn btn--primary" onClick={startGame}>
                    Spiel starten
                  </button>
                )}
              </div>

              {/* Board-Auswahl nur für Gamemaster */}
              {me.isGamemaster && lobby.boards && (
                <div className="board-select">
                  <span style={{ fontSize: 12, marginRight: 6 }}>
                    Spielfeld:
                  </span>
                  <select
                    className="input"
                    style={{ minWidth: 160 }}
                    value={lobby.selectedBoardId || ""}
                    onChange={(e) => setBoard(e.target.value)}
                  >
                    {lobby.boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title || b.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Spieler-Liste zentriert */}
            <div className="lobby-players">
              <h3>Lobby</h3>
              <div className="lobby-players-list">
                {Object.values(lobby.players)
                  .filter((p) => !p.teamId) // ❗ nur Spieler ohne Team anzeigen
                  .map((p) => (
                    <span key={p.id} className="lobby-player-pill">
                      {p.name}
                      {p.isGamemaster && (
                        <span className="tag tag--gm" style={{ marginLeft: 4 }}>
                          GM
                        </span>
                      )}
                    </span>
                  ))}
              </div>
            </div>

            {/* Teams - 4 Slots mit Karten / Plus-Feldern */}
            <div className="lobby-teams-section">
              <h3 className="lobby-teams-title">Teams</h3>
              <div className="teams-grid-lobby">
                {[0, 1, 2].map((slotIndex) => {
                  // Team suchen, das in diesem Slot ist
                  const team = Object.values(lobby.teams).find(
                    (t) => t.slotIndex === slotIndex
                  );

                  if (!team) {
                    // Leerer Slot -> Plus-Karte
                    return (
                      <div className="team-slot" key={slotIndex}>
                        <button
                          className="team-card-empty"
                          onClick={() => createTeam(slotIndex)} // 🔴 Slot mitgeben
                          disabled={teamCount >= MAX_TEAMS}
                        >
                          <span className="team-card-empty-plus">+</span>
                        </button>
                      </div>
                    );
                  }

                  const avatarOption = avatarOptions.find(
                    (a) => a.key === team.avatarKey
                  );
                  const avatarUrl = avatarOption?.url || null;

                  return (
                    <div className="team-slot" key={team.id}>
                      <div
                        className={
                          "team-card" +
                          (me.teamId === team.id ? " team-card--mine" : "")
                        }
                      >
                        <div className="team-card-header">
                          {/* Teamname editierbar */}
                          <div className="team-card-header">
                            {editingTeamId === team.id ? (
                              // ✏️ EDIT-MODUS
                              <>
                                <input
                                  className="team-name-input-edit"
                                  value={editingTeamName}
                                  onChange={(e) =>
                                    setEditingTeamName(e.target.value)
                                  }
                                  autoFocus
                                />

                                <div className="team-name-actions">
                                  {/* ✓ Speichern */}
                                  <button
                                    className="team-name-btn team-name-save"
                                    onClick={() => {
                                      renameTeam(team.id, editingTeamName);
                                      setEditingTeamId(null);
                                    }}
                                  >
                                    ✓
                                  </button>

                                  {/* ✕ Abbrechen */}
                                  <button
                                    className="team-name-btn team-name-cancel"
                                    onClick={() => setEditingTeamId(null)}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </>
                            ) : (
                              // 👁️ ANZEIGE-MODUS
                              <>
                                <span className="team-name-label">
                                  {team.name}
                                </span>

                                {/* ✏️ Nur Team-Mitglieder dürfen editieren */}
                                {me.teamId === team.id && (
                                  <button
                                    className="team-name-btn team-name-edit"
                                    onClick={() => {
                                      setEditingTeamId(team.id);
                                      setEditingTeamName(team.name);
                                    }}
                                  >
                                    ✏️
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Avatar groß */}
                        <div
                          className="team-card-avatar-main"
                          onClick={() => {
                            if (me.teamId === team.id) {
                              setOpenAvatarTeamId(
                                openAvatarTeamId === team.id ? null : team.id
                              );
                            }
                          }}
                          style={{
                            cursor:
                              me.teamId === team.id ? "pointer" : "default",
                          }}
                        >
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={team.name}
                              className="team-card-avatar-img"
                            />
                          ) : (
                            <div className="team-card-avatar-placeholder">
                              {team.name?.[0]?.toUpperCase() || "?"}
                            </div>
                          )}
                        </div>

                        {/* Mitglieder-Liste im Team */}
                        <ul className="team-members">
                          {team.playerIds.map((pid) => {
                            const p = lobby.players[pid];
                            if (!p) return null;
                            return (
                              <li
                                key={pid}
                                className={
                                  "team-member-name" +
                                  (pid === recentlyJoinedPlayerId
                                    ? " team-member-join"
                                    : "")
                                }
                              >
                                {p.name}
                                {p.id === me.id && (
                                  <span className="team-member-badge">Du</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>

                        {me.teamId !== team.id && (
                          <button
                            className="btn btn--ghost"
                            onClick={() => joinTeam(team.id)}
                          >
                            diesem Team beitreten
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {openAvatarTeamId && (
          <div
            className="avatar-picker-overlay"
            onClick={() => setOpenAvatarTeamId(null)}
          >
            <div
              className="avatar-picker-panel"
              onClick={(e) => e.stopPropagation()} // Klicks innen nicht schließen
            >
              <h3 className="avatar-picker-title">Avatar wählen</h3>

              <div className="avatar-picker-grid">
                {avatarOptions.map((opt) => (
                  <button
                    key={opt.key}
                    className={
                      "btn-avatar" +
                      (lobby.teams[openAvatarTeamId]?.avatarKey === opt.key
                        ? " btn-avatar--selected"
                        : "")
                    }
                    onClick={() => {
                      setTeamAvatar(openAvatarTeamId, opt.key);
                      setOpenAvatarTeamId(null);
                    }}
                  >
                    <img src={opt.url} className="avatar-preview" alt="" />
                  </button>
                ))}
              </div>

              <button
                className="avatar-picker-close"
                onClick={() => setOpenAvatarTeamId(null)}
              >
                Schließen
              </button>
            </div>
          </div>
        )}

        {/* ============================ GAME ============================ */}
        {me && lobbyPhase === "game" && (
          <div className="game-screen">
            <div className="game-main-area">
              {game.phase === "finished" && renderEndscreen()}
              {game.phase === "board" && renderBoard()}
              {game.phase !== "board" &&
                game.phase !== "finished" &&
                renderQuestionView()}
            </div>

            <div className="game-bottom">{renderTeamsBar()}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
