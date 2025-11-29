// src/PlayerView.jsx
import React from 'react';

export default function PlayerView({ lobby, me, socket }) {

  const buzz = () => {
    // hier könnte später ein "buzz"-Event hin
    console.log(`${me.name} hat gebuzzert! (Platzhalter)`);
    // Beispiel für später:
    // socket.emit('buzz');
  };

  return (
    <div style={{ border: '2px dashed gray', padding: 10, marginTop: 10 }}>
      <h3>Spieler-Ansicht</h3>
      <p>Du bist Spieler: <strong>{me.name}</strong></p>

      {me.teamId ? (
        <p>Dein Team: <strong>{lobby.teams[me.teamId]?.name}</strong></p>
      ) : (
        <p>Du bist noch in keinem Team.</p>
      )}

      <button onClick={buzz}>
        Buzz! (noch ohne Funktion)
      </button>

      <p style={{ marginTop: 10 }}>
        Hier siehst du später:
      </p>
      <ul>
        <li>Fragen, die der Gamemaster anzeigt</li>
        <li>Deine Punkte</li>
        <li>Status, ob du buzzern darfst</li>
      </ul>
    </div>
  );
}
