// useSocket.js
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL =
  process.env.NODE_ENV === "production"
    ? "https://devmato.pro"     // ✅ deine echte Domain
    : "http://localhost:4000";  // ✅ lokal direkt auf Node

const socket = io(SOCKET_URL, {
  path: "/socket.io",
  transports: ["websocket"],
});

export function useLobby() {
  const [lobby, setLobby] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
    }
    function onDisconnect() {
      setConnected(false);
      setLobby(null);
    }
    function onLobbyState(nextLobby) {
      setLobby(nextLobby);
    }

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