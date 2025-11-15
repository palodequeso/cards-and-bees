import Bee from "./bee";
import { Client } from "colyseus.js";
import Game from "../game/game";
import SocoundrelSolitaire from "../game/solitaire/scoundrel";
import KlondikeSolitaire from "../game/solitaire/klondike";

function buildWSUrl(portOverride: number | null = null) {
  const host = window.document.location.host.replace(/:.*/, "");
  const url =
    location.protocol.replace("http", "ws") +
    "//" +
    host +
    (location.port ? ":" + location.port : "");
  console.log("buildWSUrl", url);
  return url;
}

const gameStateRoomName = "game_room";

export default class App {
  private appNode: HTMLDivElement | null = null;
  private sections: { [key: string]: HTMLDivElement } = {};
  private client: Client | null = null;
  private username: string | null = null;
  private rooms: any[] = [];
  private room: any = null;
  private roomName: string | null = null;
  private game: Game;

  constructor(appNode: HTMLDivElement) {
    this.appNode = appNode;
    console.log("app node construct", appNode);
    this.createBees();
    this.setupSections();
    this.bindButtons();
    this.connectToServer();
  }

  setupSections() {
    this.sections["main-menu"] = this.appNode.querySelector(
      "#main-menu",
    ) as HTMLDivElement;
    this.sections["solitaire-menu"] = this.appNode.querySelector(
      "#solitaire-menu",
    ) as HTMLDivElement;
    this.sections["game"] = this.appNode.querySelector(
      "#game",
    ) as HTMLDivElement;
    this.sections["rooms"] = this.appNode.querySelector(
      "#rooms",
    ) as HTMLDivElement;
  }

  showSection(sectionName: string) {
    for (const section in this.sections) {
      if (section === sectionName) {
        this.sections[section].style.display = "block";
      } else {
        this.sections[section].style.display = "none";
      }
    }
  }

  bindButtons() {
    (
      this.appNode.querySelector("#main-menu-solitaire") as HTMLButtonElement
    ).onclick = this.playSolitaire.bind(this);
    (
      this.appNode.querySelector(
        "#main-menu-play-together",
      ) as HTMLButtonElement
    ).onclick = this.playTogether.bind(this);
    (this.appNode.querySelector("#create-room") as HTMLButtonElement).onclick =
      this.createRoom.bind(this);
  }

  playTogether() {
    const username = (
      this.appNode.querySelector(
        "#main-menu-username-input",
      ) as HTMLInputElement
    ).value;
    this.username = username;
    console.log("play together", username);
    this.showSection("rooms");
    this.getAvailableRooms();
  }

  playSolitaire() {
    console.log("play solitaire");
    this.showSection("solitaire-menu");
    // bind solitaire buttons
    this.appNode.querySelectorAll(".solitaire-game").forEach((button) => {
      button.addEventListener("click", (e) => {
        const gameType = (e.target as HTMLButtonElement).dataset.gamename;
        console.log("game type", gameType);
        this.startSolitaireGame(gameType);
      });
    });
  }

  startSolitaireGame(gameType: string) {
    console.log("start solitaire game", gameType);
    this.showSection("game");
    let game;
    switch (gameType) {
      case "scoundrel":
        game = new SocoundrelSolitaire(
          this.appNode.querySelector("#game") as HTMLDivElement,
        );
        break;
      case "klondike":
        game = new KlondikeSolitaire(
          this.appNode.querySelector("#game") as HTMLDivElement,
          1
        );
        break;
      case "klondike-draw-3":
        game = new KlondikeSolitaire(
          this.appNode.querySelector("#game") as HTMLDivElement,
          3
        );
        break;
    }
  }

  createBees() {
    var beesContainer = this.appNode.querySelector("#bees");
    for (var i = 0; i < 4; i++) {
      var bee = new Bee();
      beesContainer.appendChild(bee.node);
    }
  }

  connectToServer() {
    const wsUrl = buildWSUrl();
    this.client = new Client(wsUrl);
  }

  async createRoom() {
    try {
      // TODO: fix this
      const roomName = (
        this.appNode.querySelector("#room-name-input") as HTMLInputElement
      ).value;
      // const privateRoom = (
      //   document.getElementById("new-room-private") as HTMLInputElement
      // ).checked;

      const options = {
        username: this.username,
        name: roomName,
        private: false, //privateRoom,
        game: "freePlayPoker", // NOTE: Matches backend
      };

      console.log("create room before", roomName, options);
      this.room = await this.client.joinOrCreate(gameStateRoomName, options);
      console.log("create room after", this.room);
      // setCreateRoomOpen(false);
      this.enterGame();
    } catch (e) {
      console.error(e);
    }
  }

  enterGame() {
    this.showSection("game");
    this.game = new Game(
      this.appNode.querySelector("#game") as HTMLDivElement,
      this.room,
      this.client as any, // WHY?!?
      this.username,
    );
  }

  async joinRoom(room) {
    try {
      const roomJoinResult = await this.client.join(room.name, {
        username: this.username,
      });
      this.room = roomJoinResult;
      this.enterGame();
    } catch (e) {
      console.error(e);
    }
  }

  async getAvailableRooms() {
    this.rooms = await this.client.getAvailableRooms(gameStateRoomName);
    console.log("rooms", this.rooms);
    const tbody = this.appNode.querySelector(
      "#rooms-table",
    ) as HTMLTableSectionElement;
    tbody.innerHTML = "";

    for (const room of this.rooms) {
      const tr = document.createElement("tr");

      const id = document.createElement("td");
      id.innerText = room.roomId;
      tr.appendChild(id);

      const name = document.createElement("td");
      name.innerText = room.metadata.name;
      tr.appendChild(name);

      const people = document.createElement("td");
      people.innerText = `${room.clients.toString()}/${room.maxClients.toString()}`;
      tr.appendChild(people);

      const buttons = document.createElement("td");
      const joinButton = document.createElement("button");
      joinButton.innerText = "Join";
      joinButton.onclick = () => this.joinRoom(room);
      buttons.appendChild(joinButton);
      tr.appendChild(buttons);

      tbody.appendChild(tr);
    }
  }
}
