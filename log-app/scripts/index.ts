import { getLevelString } from "./helpers/utils";
import { Logs } from "./types/log";

const filterSelect = document.getElementById("filter") as HTMLSelectElement;
const clearButton = document.getElementById("clear") as HTMLButtonElement;
const logBody = document.getElementById("log-body") as HTMLDivElement;

let logs: Logs[] = [];

const websocket = new WebSocket(`wss://${window.location.host}/log-engine`);

websocket.addEventListener("message", (event) => {
  const logEntry = JSON.parse(event.data);
  if (logEntry?.event && logEntry?.event !== "postgres_changes") return;
  if (logEntry.payload?.data?.type !== "INSERT") return;
  logs.push(logEntry.payload.data.record);
  updateLogTable();
});

filterSelect.addEventListener("change", () => {
  updateLogTable();
});

websocket.addEventListener("close", (message) => {
  console.log("Closed websocket");
});

websocket.addEventListener("error", (message) => {
  console.log("Something went wrong with the WebSocket");
});

// Close WebSocket connection at a later point
const closeConnection = () => websocket.close();

clearButton.addEventListener("click", () => {
  logs = [];
  updateLogTable();
});

const updateLogTable = () => {
  const selectedFilter = filterSelect.value;
  const filteredLogs = selectedFilter === "all" ? logs : logs.filter((log) => getLevelString(log.level) === selectedFilter);

  logBody.innerHTML = "";
  filteredLogs.forEach((log) => {
    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${log.timestamp}</td>
        <td>${getLevelString(log.level)}</td>
        <td>${log.log_message}</td>
        `;
    logBody.appendChild(row);
  });
};

// Initial update
updateLogTable();
