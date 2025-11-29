// useSocket.js
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io(window.location.origin, {
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
    }

    function onLobbyState(newLobby) {
      setLobby(newLobby);
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