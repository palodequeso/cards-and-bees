import { Room } from "colyseus";

export default class Chat {
  private domNode: HTMLDivElement | null = null;
  private textInputNode: HTMLInputElement | null = null;
  private messagesNode: HTMLDivElement | null = null;
  private room: Room | null = null;
  private messages: any[] = [];
  private sendChat: (message: string) => void;

  constructor(room: Room, sendChat: (message: string) => void) {
    this.room = room;
    this.sendChat = sendChat;
    this.domNode = document.createElement("div");
    this.domNode.id = "chat-area";
    this.messagesNode = document.createElement("div");
    this.messagesNode.id = "chat-messages";
    this.domNode.append(this.messagesNode);
    this.textInputNode = document.createElement("input");
    this.textInputNode.id = "chat-input";
    this.textInputNode.addEventListener("keydown", this.listener.bind(this));
    this.domNode.append(this.textInputNode);
    this.messages = this.room.state.chatMessages;
    console.log("messages", this.messages);
  }

  private listener = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      const message = this.textInputNode?.value;
      if (message) {
        this.sendChat(message);
        this.textInputNode.value = "";
      }
    }
  };

  public renderMessages() {
    this.messages = this.room.state.chatMessages;
    this.messagesNode.innerHTML = ""; // TODO: make this more efficient by only rendering new messages
    console.log("chat messages", JSON.stringify(this.messages, null, 2));
    for (const message of this.messages) {
      const messageNode = document.createElement("div");
      messageNode.classList.add("chat-message");
      const timeNode = document.createElement("span");
      timeNode.style.fontSize = "11px";
      timeNode.style.marginRight = "2px";
      timeNode.innerText = new Date(message.date).toLocaleTimeString();
      messageNode.append(timeNode);
      const nameNode = document.createElement("span");
      nameNode.style.fontWeight = "bold";
      nameNode.style.marginRight = "4px";
      nameNode.innerText = message.name;
      messageNode.append(nameNode);
      const messageText = document.createElement("span");
      messageText.innerText = message.message;
      messageNode.append(messageText);
      this.messagesNode.append(messageNode);
    }
  }

  get node() {
    return this.domNode;
  }
}
