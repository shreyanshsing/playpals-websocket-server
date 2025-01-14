import { Socket } from "socket.io";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { WebSocketMessageType } from "./services/config/enum";
import { ClientIdSocketMap } from "./services/data-structures/clientid-socket-map";
import { GameGridMap } from "./services/data-structures/game-grid-map";
import { GameClientsMap } from "./services/data-structures/game-clients-map";
import { GameChannel } from "./services/channels/game-channel";
import { getRandomLightColor } from "./utils/utils";
import { updatePlayer } from "./services/handlers/player";
import { getGameData, updateGameData } from "./services/handlers/game";

dotenv.config();

const PORT = process.env.PORT || 3031;
const CLIENT_URL = process.env.PROD_CLIENT_URL;

// Create a Socket.io server
const io = new Server(PORT as number, {
  cors: {
    origin: CLIENT_URL, // Client's URL
    methods: ["GET", "POST"],
  },
});

const clientIdSocketMap = new ClientIdSocketMap(io);
const gameGridMap = new GameGridMap();
const gameClientsMap = new GameClientsMap();
let gameChannel: GameChannel;

const setGame = async (gameId: string, ws: Socket) => {
  const existingGame = await gameGridMap.get(gameId);
  if (!existingGame) {
    await gameGridMap.set(
      gameId,
      JSON.stringify({ grid: Array(9).fill(null) }) // Initialize empty grid
    );
    gameChannel = new GameChannel(gameId);
    console.log(`Game ${gameId} created`);
  } else {
    console.log(`Game ${gameId} already exists`);
    const { success, data } = await getGameData(gameId);
    if (!success) {
      console.error("Error getting game status:", data);
      return;
    }
    console.log("Game status:", data.status);
    if (data.status === WebSocketMessageType.GAME_LIVE) {
      const grid = JSON.parse(existingGame).grid;
      ws.emit(WebSocketMessageType.GAME_LIVE, { grid });
    }
  }
};

const addClientToGame = async (
  gameId: string,
  clientId: string,
  ws: Socket
) => {
  await gameClientsMap.set(gameId, clientId);
  await clientIdSocketMap.set(clientId, ws);

  // Notify other players
  gameChannel.publish(
    JSON.stringify({ type: WebSocketMessageType.PLAYER_JOINED, clientId })
  );

  console.log(`Client ${clientId} joined game ${gameId}`);
};

const generateSymbols = (): [string, string] => {
  return Math.random() > 0.5 ? ["X", "O"] : ["O", "X"];
};

const generateColors = (): [string, string] => {
  return [getRandomLightColor(), getRandomLightColor()];
};

const updatePlayers = (
  clientIds: string[],
  symbols: string[],
  colors: string[]
) => {
  clientIds.forEach((clientId, index) => {
    // Update player state in the database or memory here
    updatePlayer(clientId, { symbol: symbols[index], color: colors[index] });
  });
};

const checkAndStartGame = async (gameId: string) => {
  const clients = await gameClientsMap.get(gameId);
  console.log(`Checking Clients for game -> ${gameId}`, clients);
  if (clients?.length === 2) {
    console.log(`Starting game ${gameId}`);
    const symbols = generateSymbols();
    const colors = generateColors();

    // Assign symbols and colors to players
    updatePlayers(clients, symbols, colors);

    // Notify both players
    for (const clientId of clients) {
      const ws = await clientIdSocketMap.getSocketFromClientId(clientId);
      ws?.emit(WebSocketMessageType.GAME_START);
    }

    await gameChannel.publish(
      JSON.stringify({ type: WebSocketMessageType.GAME_START })
    );
    await updateGameData(gameId, { status: WebSocketMessageType.GAME_LIVE });
    console.log(`Game ${gameId} started`);
  }
};

const isWinningMove = (grid: string[], clientId: string) => {
  const winningCombinations = [
    [0, 1, 2], // Horizontal
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6], // Vertical
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8], // Diagonal
    [2, 4, 6],
  ];

  for (const combination of winningCombinations) {
    const [a, b, c] = combination;
    if (grid[a] === clientId && grid[b] === clientId && grid[c] === clientId) {
      return true;
    }
  }

  return false;
};

const markGrid = async (gameId: string, clientId: string, index: number) => {
  const gridData = await gameGridMap.get(gameId);
  const grid = gridData ? JSON.parse(gridData).grid : [];
  grid[index] = clientId;

  // Update the grid in Redis
  console.log(`Marking grid ${index} for client ${clientId}`);
  await gameGridMap.set(gameId, JSON.stringify({ grid }));

  
  // Notify the opponent
  const clients = await gameClientsMap.get(gameId);
  const opponentId = clients?.find((id: string) => id !== clientId);
  if (opponentId) {
    const ws = await clientIdSocketMap.getSocketFromClientId(opponentId);
    console.log(`Notifying opponent ${opponentId}`);
    ws?.emit(WebSocketMessageType.GRID_MARKED, { index, clientId });
  }
  
  const isWin = isWinningMove(grid, clientId);

  if (isWin) {
    // Notify the clients
    const clients = await gameClientsMap.get(gameId);
    for (const id of clients) {
      const ws = await clientIdSocketMap.getSocketFromClientId(id);
      ws?.emit(WebSocketMessageType.GAME_OVER, { winner: clientId });
    }
    await updateGameData(gameId, { status: WebSocketMessageType.GAME_OVER, winner: clientId });
  }

};

// Handle connections
io.on("connection", (socket: Socket) => {
  socket.on(WebSocketMessageType.CONNECTED, (data) => {
    const clientId = data.clientId;
    clientIdSocketMap.set(clientId, socket);
    console.log(`Client ${clientId} connected`);
  });

  socket.on(WebSocketMessageType.SET_GAME, async (data) => {
    const { gameId } = data;
    await setGame(gameId, socket);
  });

  socket.on(WebSocketMessageType.JOIN_GAME, async (data) => {
    const { gameId, clientId } = data;
    await addClientToGame(gameId, clientId, socket);
    await checkAndStartGame(gameId);
  });

  socket.on(WebSocketMessageType.MARK_GRID, async (data) => {
    const { gameId, clientId, index } = data;
    await markGrid(gameId, clientId, index);
  });

  // Send messages to the client
  socket.emit("message", "Hello from the server!");

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

console.log("Socket.io server running on port 3031");
