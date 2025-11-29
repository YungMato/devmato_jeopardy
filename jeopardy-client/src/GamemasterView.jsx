// src/GamemasterView.jsx
import React from 'react';

export default function GamemasterView({ lobby, me, socket }) {
  const startGame = () => {
    // später: richtigen Event definieren
    console.log('Gamemaster startet das Spiel (Platzhalter)');
    // Beispiel für später:
    // socket.emit('game_start');
  };

  return (
    <div style={{ border: '2px solid black', padding: 10, marginTop: 10 }}>
      <h3>Gamemaster-Ansicht</h3>
      <p>Du bist Gamemaster: <strong>{me.name}</strong></p>
      <p>Hier kommen später die Controls für:</p>
      <ul>
        <li>Fragen auswählen / anzeigen</li>
        <li>Punkte vergeben</li>
        <li>Runden steuern</li>
      </ul>

      <button onClick={startGame}>
        Spiel starten (noch ohne Funktion)
      </button>

      <h4>Überblick über Teams</h4>
      {lobby && Object.values(lobby.teams).length === 0 && (
        <p>Noch keine Teams erstellt.</p>
      )}
      {lobby && Object.values(lobby.teams).map(team => (
        <div key={team.id} style={{ border: '1px solid #999', marginBottom: 5, padding: 5 }}>
          <strong>{team.name}</strong>
          <ul>
            {team.playerIds.map(pid => {
              const p = lobby.players[pid];
              return <li key={pid}>{p?.name}</li>;
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}