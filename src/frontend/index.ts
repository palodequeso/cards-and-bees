import App from "./ui/app";

document.addEventListener("DOMContentLoaded", () => {
  new App(document.getElementById("app-container") as HTMLDivElement);
});
