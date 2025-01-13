import type { Server, Socket } from "socket.io";
import { GameChannel } from "./game-channel";
import { WebSocketMessageType } from "../config/enum";
import { ClientIdSocketMap } from "../data-structures/clientid-socket-map";
import { GameClientsMap } from "../data-structures/game-clients-map";
import { GameGridMap } from "../data-structures/game-grid-map";
import { updatePlayer } from "../handlers/player";
import { getRandomLightColor } from "../../utils/utils";

export class GameChannelManager {
  private gameChannel: GameChannel;
  private gameGridMap: GameGridMap;
  private gameClientsMap: GameClientsMap;
  private clientIdSocketMap: ClientIdSocketMap;

  constructor(gameId: string, io: Server) {
    this.gameChannel = new GameChannel(gameId);
    this.gameGridMap = new GameGridMap();
    this.gameClientsMap = new GameClientsMap();
    this.clientIdSocketMap = new ClientIdSocketMap(io);
  }

  // Initialize a new game
  async setGame(gameId: string, ws: Socket) {
    const existingGame = await this.gameGridMap.get(gameId);
    if (!existingGame) {
      await this.gameGridMap.set(gameId, JSON.stringify({ grid: Array(9).fill(null) })); // Initialize empty grid
      console.log(`Game ${gameId} created`);
    } else {
      console.log(`Game ${gameId} already exists`);
      const grid = JSON.parse(existingGame).grid;
      ws.emit(WebSocketMessageType.GAME_LIVE, { grid });
    }
  }

  // Add client to the game
  async addClientToGame(gameId: string, clientId: string, ws: Socket) {
    await this.gameClientsMap.set(gameId, clientId);
    await this.clientIdSocketMap.set(clientId, ws);

    // Notify other players
    this.gameChannel.publish(
      JSON.stringify({ type: WebSocketMessageType.PLAYER_JOINED, clientId })
    );
  }


  // Start the game when two players are ready
  async checkAndStartGame(gameId: string) {
    const clients = await this.gameClientsMap.get(gameId);
    if (clients?.length === 2) {
      console.log(`Starting game ${gameId}`);
      const symbols = this.generateSymbols();
      const colors = this.generateColors();

      // Assign symbols and colors to players
      this.updatePlayers(clients, symbols, colors);

      // Notify both players
      for (const clientId of clients) {
        const ws = await this.clientIdSocketMap.getSocketFromClientId(clientId);
        ws?.emit(WebSocketMessageType.GAME_START);
      }

      await this.gameChannel.publish(
        JSON.stringify({ type: WebSocketMessageType.GAME_START })
      );
    }
  }

  // Generate symbols for players
  private generateSymbols(): [string, string] {
    return Math.random() > 0.5 ? ["X", "O"] : ["O", "X"];
  }

  // Generate random colors for players
  private generateColors(): [string, string] {
    return [getRandomLightColor(), getRandomLightColor()]
  }

  // Update player information (symbols and colors)
  private updatePlayers(clientIds: string[], symbols: string[], colors: string[]) {
    clientIds.forEach((clientId, index) => {
      // Update player state in the database or memory here
      updatePlayer(clientId, { symbol: symbols[index], color: colors[index] });
    });
  }

  // Mark grid cell and notify opponent
  async markGrid(gameId: string, clientId: string, index: number) {
    const gridData = await this.gameGridMap.get(gameId);
    const grid = gridData ? JSON.parse(gridData).grid : [];
    grid[index] = clientId;

    // Update the grid in Redis
    await this.gameGridMap.set(gameId, JSON.stringify({ grid }));

    // Notify the opponent
    const clients = await this.gameClientsMap.get(gameId);
    const opponentId = clients?.find((id: string) => id !== clientId);
    if (opponentId) {
      const ws = await this.clientIdSocketMap.getSocketFromClientId(opponentId);
      ws?.emit(WebSocketMessageType.GRID_MARKED, { index, clientId });
    }
  }

  // Resolve incoming actions
  async resolveActions(action: {
    type: WebSocketMessageType;
    gameId: string;
    clientId: string;
    index?: number;
    ws: Socket;
  }) {
    const { type, gameId, clientId, index, ws } = action;
    switch (type) {
      case WebSocketMessageType.SET_GAME:
        await this.setGame(gameId, ws);
        break;

      case WebSocketMessageType.JOIN_GAME:
        await this.addClientToGame(gameId, clientId, ws);
        await this.checkAndStartGame(gameId);
        break;

      case WebSocketMessageType.MARK_GRID:
        if (index !== undefined) {
          await this.markGrid(gameId, clientId, index);
        }
        break;

      default:
        console.log("Unknown action type:", type);
    }
  }
}
