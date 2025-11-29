// useSocket.js
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const isLocalhost = window.location.hostname === "localhost";

const SOCKET_URL = isLocalhost
  ? "http://localhost:4000"
  : "https://devmato.pro"; // dein Backend

const socket = io(SOCKET_URL, {
  path: "/socket.io",
  transports: ["websocket"],
});

export function useLobby() {
  const [lobby, setLobby] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => {
      setConnected(false);
      setLobby(null);
    };
    const onLobbyState = (nextLobby) => {
      // WICHTIG: hier muss der komplette neue Lobby-Stand gesetzt werden
      setLobby(nextLobby);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("lobby_state", onLobbyState);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("lobby_state", onLobbyState);
    };
  }, []);

  return { socket, lobby, connected };
}
