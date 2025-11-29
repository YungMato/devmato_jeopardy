// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',      // React Dev Server
      'https://devmato.pro',    // deine Deployment-URL
    ],
    methods: ['GET', 'POST'],
  },
});


// ----- KONFIG -----

// Gamemaster-PIN (optional, falls du später doch noch manuell wechseln willst)
const GAMEMASTER_PIN = '6518';

// Maximale Anzahl Teams
const MAX_TEAMS = 3;

// Beispiel-Teamnamen
const TEAM_NAMES = [
  'Stolze Säbelzahntiger',
  'Ehrfürchtige Einhörner',
  'Anmutige Aale',
  'Flinke Füchse',
  'Clevere Chamäleons',
  'Blitzschnelle Bären',
  'Listige Lurche',
  'Prächtige Pelikane',
];

// Verfügbare Avatare
const AVATAR_KEYS = [
  'profile1',
  'profile2',
  'profile3',
  'profile4',
  'profile5',
  'profile6',
  'profile7',
  'profile8',
  'profile9',
  'profile10',
  'profile11',
  'profile12',
  'profile13',
  'profile14',
  'profile15',
  'profile16',
];

// Verfügbare Boards (JSON-Dateien im ./data Ordner)
const BOARDS = [
  { id: "board1", filename: "board_HarryPotter1.json", title: "Harry Potter: Lehren von Hogwarts" },
  { id: "board2", filename: "board_HarryPotter2.json", title: "Harry Potter: Magische Orte" },
  { id: "board3", filename: "board_HarryPotter3.json", title: "Harry Potter: Sprechende Bilder" },
  { id: "board4", filename: "board_HarryPotter4.json", title: "Harry Potter: Experte" },
  { id: "board5", filename: "board_LOL1.json", title: "League of Legends: Grundlagen" },
  { id: "board6", filename: "board_LOL2.json", title: "League of Legends: Lore" },
  { id: "board7", filename: "board_LOL3.json", title: "League of Legends: Items, Buffs & Mechaniken" },
  { id: "board8", filename: "board_LOL4.json", title: "League of Legends: Champions & Voice Lines" },
  { id: "board9", filename: "board_LOL5.json", title: "League of Legends: Experte" },
  { id: "board10", filename: "board_Filme1.json", title: "Filme: Allgemein" },
  { id: "board11", filename: "board_Filme2.json", title: "Serien: Allgemein" },
  { id: "board12", filename: "board_Allgemein1.json", title: "Allgemeinwissen: Basics" },
  { id: "board13", filename: "board_Allgemein2.json", title: "Allgemeinwissen: Welt & Natur" },
  { id: "board14", filename: "board_Allgemein3.json", title: "Allgemeinwissen: Wissenschaft & Technik" },
  { id: "board15", filename: "board_Allgemein4.json", title: "Allgemeinwissen: Geschichte & Kultur" },
  { id: "board16", filename: "board_Allgemein5.json", title: "Allgemeinwissen: Mixed" },
];

// ----- MULTI-LOBBY-STATE -----

// Alle Lobbies: { [code]: lobbyState }
const LOBBIES = {};

// Zuordnung Socket -> Lobby-Code
const SOCKET_LOBBY = {};

// Lobby-Code generieren (z.B. 6 Zeichen, eindeutig)
function generateLobbyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (LOBBIES[code]);
  return code;
}

function createEmptyLobby(code) {
  return {
    code,
    players: {},      // { [socketId]: { id, name, teamId, isGamemaster } }
    teams: {},        // { [teamId]: { id, name, playerIds: [], avatarKey } }
    gamemasterId: null,
    phase: 'lobby',   // 'lobby' | 'game'
    game: null,       // GameState oder null

    boards: BOARDS,
    selectedBoardId: BOARDS[0].id, // Standard-Board
  };
}

function getLobbyForSocket(socket) {
  const code = SOCKET_LOBBY[socket.id];
  if (!code) return null;
  return LOBBIES[code] || null;
}

function broadcastLobbyState(lobby) {
  if (!lobby) return;
  io.to(lobby.code).emit('lobby_state', lobby);
}

// Socket aus aktueller Lobby entfernen (z.B. bei Disconnect oder Lobby-Wechsel)
function leaveCurrentLobby(socket) {
  const code = SOCKET_LOBBY[socket.id];
  if (!code) return;

  const lobby = LOBBIES[code];
  if (!lobby) {
    delete SOCKET_LOBBY[socket.id];
    socket.leave(code);
    return;
  }

  const player = lobby.players[socket.id];

  if (player) {
    // Aus Team entfernen
    if (player.teamId) {
      const team = lobby.teams[player.teamId];
      if (team) {
        team.playerIds = team.playerIds.filter((id) => id !== socket.id);
      }
    }

    // Gamemaster-Handling
    if (lobby.gamemasterId === socket.id) {
      lobby.gamemasterId = null;
      Object.values(lobby.players).forEach((p) => (p.isGamemaster = false));

      // Neuen GM bestimmen, falls noch Spieler da sind
      const remainingIds = Object.keys(lobby.players).filter(
        (id) => id !== socket.id
      );
      if (remainingIds.length > 0) {
        const newGmId = remainingIds[0];
        lobby.gamemasterId = newGmId;
        lobby.players[newGmId].isGamemaster = true;
        console.log(`Neuer Gamemaster in Lobby ${code}:`, newGmId);
      }
    }

    delete lobby.players[socket.id];
  }

  delete SOCKET_LOBBY[socket.id];
  socket.leave(code);

  // Wenn keine Spieler mehr: Lobby löschen
  if (Object.keys(lobby.players).length === 0) {
    delete LOBBIES[code];
    console.log('Lobby gelöscht:', code);
  } else {
    broadcastLobbyState(lobby);
  }
}

// ----- BOARD-LOADING -----

function loadBoardJson(filename = "board1.json") {
  const filePath = path.join(__dirname, "data", filename);
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

// Wandelt die JSON-Struktur in ein internes Board (Categories/Questions) um
function buildBoardFromJson(data) {
  const categories = {};
  const questions = {};

  data.categories.forEach((cat) => {
    const questionIds = [];

    cat.questions.forEach((q, index) => {
      const qId = `${cat.id}_q${index + 1}`;

      questionIds.push(qId);

      questions[qId] = {
        id: qId,
        categoryId: cat.id,
        points: q.points,
        questionText: q.question,
        answerText: q.answer,
        state: "closed", // 'closed' | 'open' | 'answered'
      };
    });

    categories[cat.id] = {
      id: cat.id,
      title: cat.title,
      questionIds,
    };
  });

  return { categories, questions };
}

// GamePhase: 'board' | 'question' | 'reveal' | 'finished'

// ----- SOCKET-LOGIK -----

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // ----- LOBBY ERSTELLEN -----
  // Spieler erstellt eine neue Lobby und wird direkt Gamemaster
  socket.on('create_lobby', ({ name }) => {
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      socket.emit('join_error', 'Name wird benötigt.');
      return;
    }

    // Falls der Socket schon in einer Lobby ist → erst rausnehmen
    leaveCurrentLobby(socket);

    const code = generateLobbyCode();
    const lobby = createEmptyLobby(code);
    LOBBIES[code] = lobby;

    SOCKET_LOBBY[socket.id] = code;
    socket.join(code);

    lobby.players[socket.id] = {
      id: socket.id,
      name: trimmedName,
      teamId: null,
      isGamemaster: true,
    };
    lobby.gamemasterId = socket.id;

    console.log(`Lobby ${code} erstellt von ${trimmedName} (${socket.id})`);

    // optional: separater Event mit dem Code
    socket.emit('lobby_created', { code });

    broadcastLobbyState(lobby);
  });

  // ----- LOBBY BEITRETEN -----
  socket.on('join_lobby', ({ name, code }) => {
    const trimmedName = (name || '').trim();
    const trimmedCode = (code || '').trim().toUpperCase();

    if (!trimmedName || !trimmedCode) {
      socket.emit('join_error', 'Name und Lobby-Code werden benötigt.');
      return;
    }

    const lobby = LOBBIES[trimmedCode];
    if (!lobby) {
      socket.emit('join_error', 'Diese Lobby existiert nicht (mehr).');
      return;
    }

    // Zuvorige Lobby verlassen (falls vorhanden)
    leaveCurrentLobby(socket);

    SOCKET_LOBBY[socket.id] = trimmedCode;
    socket.join(trimmedCode);

    lobby.players[socket.id] = {
      id: socket.id,
      name: trimmedName,
      teamId: null,
      isGamemaster: false,
    };

    console.log(`Player joined lobby ${trimmedCode}: ${trimmedName} (${socket.id})`);
    broadcastLobbyState(lobby);
  });

  // ----- TEAMS -----

  // Team erstellen (nur in der Lobbyphase, max. MAX_TEAMS Teams)
  // Spieler, der das Team erstellt, wird automatisch Mitglied
  socket.on('create_team', () => {
    const lobby = getLobbyForSocket(socket);
    if (!lobby) return;
    if (lobby.phase !== 'lobby') return;

    const player = lobby.players[socket.id];
    if (!player) return;

    const existingTeams = Object.keys(lobby.teams).length;
    if (existingTeams >= MAX_TEAMS) {
      socket.emit(
        'team_error',
        `Es können maximal ${MAX_TEAMS} Teams erstellt werden.`
      );
      return;
    }

    // Spieler ggf. aus altem Team entfernen
    if (player.teamId) {
      const oldTeam = lobby.teams[player.teamId];
      if (oldTeam) {
        oldTeam.playerIds = oldTeam.playerIds.filter((id) => id !== socket.id);
      }
    }

    const teamId = 'team_' + Date.now();

    // zufälligen Namen wählen
    const randomName =
      TEAM_NAMES[Math.floor(Math.random() * TEAM_NAMES.length)] ||
      `Team ${existingTeams + 1}`;

    // zufälligen Avatar wählen
    const randomAvatar =
      AVATAR_KEYS[Math.floor(Math.random() * AVATAR_KEYS.length)];

    lobby.teams[teamId] = {
      id: teamId,
      name: randomName,
      playerIds: [socket.id],
      avatarKey: randomAvatar,
    };

    // Spieler in dieses Team setzen
    player.teamId = teamId;

    console.log(
      'Team created:',
      randomName,
      teamId,
      'Avatar:',
      randomAvatar,
      'by',
      player.name
    );
    broadcastLobbyState(lobby);
  });

  // Spieler einem Team zuordnen (nur in Lobbyphase)
  socket.on('join_team', ({ teamId }) => {
    const lobby = getLobbyForSocket(socket);
    if (!lobby) return;
    if (lobby.phase !== 'lobby') return;

    const player = lobby.players[socket.id];
    const team = lobby.teams[teamId];
    if (!player || !team) return;

    // aus altem Team entfernen
    if (player.teamId) {
      const oldTeam = lobby.teams[player.teamId];
      if (oldTeam) {
        oldTeam.playerIds = oldTeam.playerIds.filter((id) => id !== socket.id);
      }
    }

    player.teamId = teamId;
    if (!team.playerIds.includes(socket.id)) {
      team.playerIds.push(socket.id);
    }

    console.log(`Player ${player.name} joined team ${team.name}`);
    broadcastLobbyState(lobby);
  });

  // Gamemaster setzen – weiterhin optional via PIN (falls du es im UI noch hast)
  socket.on('set_gamemaster', ({ pin }) => {
    const lobby = getLobbyForSocket(socket);
    if (!lobby) return;

    const player = lobby.players[socket.id];
    if (!player) return;

    const trimmedPin = (pin || '').trim();
    if (trimmedPin !== GAMEMASTER_PIN) {
      socket.emit('gm_error', 'Gamemaster-PIN ist falsch.');
      return;
    }

    lobby.gamemasterId = socket.id;

    Object.values(lobby.players).forEach((p) => {
      p.isGamemaster = p.id === socket.id;
    });

    console.log('Gamemaster set:', player.name);
    broadcastLobbyState(lobby);
  });

  // Team umbenennen (nur in Lobbyphase; nur Team-Mitglieder)
  socket.on('rename_team', ({ teamId, name }) => {
    const lobby = getLobbyForSocket(socket);
    if (!lobby) return;
    if (lobby.phase !== 'lobby') return;

    const team = lobby.teams[teamId];
    const player = lobby.players[socket.id];
    if (!team || !player) return;

    const trimmed = (name || '').trim();
    if (!trimmed) return;

    // Nur Team-Mitglieder dürfen den Namen ihres Teams ändern
    if (player.teamId !== teamId) return;

    team.name = trimmed.slice(0, 30); // max 30 Zeichen

    console.log(`Team umbenannt: ${teamId} -> ${team.name} durch ${player.name}`);
    broadcastLobbyState(lobby);
  });

  // Profilbild / Avatar für ein Team setzen (nur in Lobbyphase, nur Team-Mitglieder)
  socket.on('set_team_avatar', ({ teamId, avatarKey }) => {
    const lobby = getLobbyForSocket(socket);
    if (!lobby) return;
    if (lobby.phase !== 'lobby') return;

    const team = lobby.teams[teamId];
    const player = lobby.players[socket.id];
    if (!team || !player) return;

    // Nur Team-Mitglieder dürfen Avatar ändern
    if (player.teamId !== teamId) return;

    if (!AVATAR_KEYS.includes(avatarKey)) return;

    team.avatarKey = avatarKey;

    console.log(
      `Avatar für Team ${team.name} geändert durch ${player.name}: ${avatarKey}`
    );

    broadcastLobbyState(lobby);
  });

  // Gamemaster wählt das Board für die Runde
  socket.on('set_board', ({ boardId }) => {
    const lobby = getLobbyForSocket(socket);
    if (!lobby) return;
    if (lobby.phase !== 'lobby') return;
    if (socket.id !== lobby.gamemasterId) return;

    const board = BOARDS.find((b) => b.id === boardId);
    if (!board) return;

    lobby.selectedBoardId = boardId;
    console.log('Board ausgewählt:', boardId);

    broadcastLobbyState(lobby);
  });

  // ----- GAME FLOW -----

  // Spiel starten → Game-State initialisieren
  socket.on("game_start", () => {
    const lobby = getLobbyForSocket(socket);
    if (!lobby) return;
    if (lobby.phase !== "lobby") return;
    if (socket.id !== lobby.gamemasterId) return;

    const teamIds = Object.keys(lobby.teams);
    if (teamIds.length === 0) return;

    // Gewähltes Board aus Lobby finden
    const selected =
      BOARDS.find((b) => b.id === lobby.selectedBoardId) || BOARDS[0];

    // JSON laden und in Kategorien/Fragen umwandeln
    const rawBoard = loadBoardJson(selected.filename);
    const { categories, questions } = buildBoardFromJson(rawBoard);

    // Game initialisieren
    lobby.game = {
      categories,
      questions,
      scores: {},
      currentTeamId: teamIds[0],
      activeQuestionId: null,
      phase: "board", // 'board' | 'question' | 'reveal' | 'finished'
      lastAnswerCorrect: null,
    };

    // Scores auf 0 setzen
    for (const id of teamIds) {
      lobby.game.scores[id] = 0;
    }

    lobby.phase = "game";

    console.log(
      "Game gestartet in Lobby",
      lobby.code,
      "mit Board:",
      selected.id,
      selected.filename
    );
    broadcastLobbyState(lobby);
  });

  // Feld/Frage auswählen (nur Board-Phase, nur aktuelles Team)
  socket.on('question_select', ({ questionId }) => {
    const lobby = getLobbyForSocket(socket);
    if (!lobby) return;

    const game = lobby.game;
    if (!game) return;
    if (lobby.phase !== 'game') return;
    if (game.phase !== 'board') return;

    const question = game.questions[questionId];
    if (!question) return;
    if (question.state !== 'closed') return;

    const player = lobby.players[socket.id];
    if (!player) return;

    // Nur das aktuelle Team darf wählen
    if (player.teamId !== game.currentTeamId) {
      return;
    }

    question.state = 'open';
    game.activeQuestionId = questionId;
    game.phase = 'question';

    console.log(
      `Question selected: ${questionId} by player ${player.name} (${player.teamId}) in Lobby ${lobby.code}`
    );
    broadcastLobbyState(lobby);
  });

  // Gamemaster zeigt Antwort
  socket.on('reveal_answer', () => {
    const lobby = getLobbyForSocket(socket);
    if (!lobby) return;

    const game = lobby.game;
    if (!game) return;
    if (socket.id !== lobby.gamemasterId) return;
    if (game.phase !== 'question') return;

    game.phase = 'reveal';
    console.log('Answer revealed in Lobby', lobby.code);
    broadcastLobbyState(lobby);
  });

  // Gamemaster entscheidet: richtig oder falsch
  socket.on("answer_result", ({ correct }) => {
    const lobby = getLobbyForSocket(socket);
    if (!lobby) return;

    const game = lobby.game;
    if (!game) return;

    const teamId = game.currentTeamId;
    const qId = game.activeQuestionId;
    const question = game.questions[qId];
    if (!teamId || !question) return;

    game.lastAnswerCorrect = !!correct;

    // Punkte vergeben
    if (correct) {
      game.scores[teamId] += question.points;
    } else {
      // falsche Antwort: halbe Punktzahl abziehen
      game.scores[teamId] -= question.points / 2;
    }

    // Frage abgeschlossen
    question.state = "answered";
    game.activeQuestionId = null;

    // Prüfen ob ALLE Fragen "answered" sind
    const allDone = Object.values(game.questions).every(
      (q) => q.state === "answered"
    );

    if (allDone) {
      console.log("🎉 Alle Fragen beantwortet! Spiel endet in Lobby", lobby.code);
      game.phase = "finished";
      broadcastLobbyState(lobby);
      return;
    }

    // Wenn NICHT alle fertig → zurück zum Board
    game.phase = "board";

    // nächstes Team
    const teamIds = Object.keys(lobby.teams);
    const idx = teamIds.indexOf(teamId);
    const nextIdx = (idx + 1) % teamIds.length;
    game.currentTeamId = teamIds[nextIdx];

    broadcastLobbyState(lobby);
  });

  // Spiel vorzeitig beenden (Gamemaster)
  socket.on("game_end", () => {
    const lobby = getLobbyForSocket(socket);
    if (!lobby) return;
    if (socket.id !== lobby.gamemasterId) return;
    if (!lobby.game) return;

    lobby.phase = "lobby";
    lobby.game = null;

    broadcastLobbyState(lobby);
  });

  // Lobby / Game zurücksetzen (Gamemaster)
  socket.on("lobby_reset", () => {
    const lobby = getLobbyForSocket(socket);
    if (!lobby) return;
    if (socket.id !== lobby.gamemasterId) return;

    lobby.phase = "lobby";
    lobby.game = null;

    broadcastLobbyState(lobby);
  });

  // ----- DISCONNECT -----
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    leaveCurrentLobby(socket);
  });
});

// ----- SERVER STARTEN -----

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
