import { containsValidJson, createGitHubCommentURL, generateRandomId, getLevelString } from "./helpers/utils";
import { Logs } from "./types/log";

const filterSelect = document.getElementById("filter") as unknown as HTMLSelectElement;
const clearButton = document.getElementById("clear") as HTMLButtonElement;
const logBody = document.getElementById("log-body") as HTMLDivElement;

const jsonModal = document.getElementById("json-modal") as HTMLDivElement;
const closeModalButton = document.getElementById("close-modal") as HTMLButtonElement;
const jsonContent = document.getElementById("json-content") as HTMLDivElement;

const openJsonModal = (validJson) => {
  jsonContent.textContent = validJson;

  jsonModal.style.display = "flex";
};

const updateLogTable = () => {
  const selectedFilter = filterSelect.value;
  const filteredLogs = selectedFilter === "all" ? logs : logs.filter((log) => getLevelString(log.level) === selectedFilter);

  logBody.innerHTML = "";
  filteredLogs.forEach((log) => {
    const classId = generateRandomId(10);
    const commentUrl = createGitHubCommentURL(log.org_name, log.repo_name, log.issue_number, log.comment_id);
    const row = document.createElement("tr");
    const [validJson, match, beforeText] = containsValidJson(log.log_message);
    row.innerHTML = `
        ${validJson ? `<td>${beforeText} - <button id="button_${classId}">Show JSON</button></td>` : `<td>${log.log_message}</td>`}
        <td>${getLevelString(log.level)}</td>
        <td>${log.timestamp}</td>
        <td><a href="${commentUrl}">Comment - ${log.comment_id}</a></td>
    `;
    logBody.appendChild(row);
    if (validJson) {
      // show modal button for valid json row
      const showMoreButton = document.getElementById(`button_${classId}`) as HTMLButtonElement;
      showMoreButton.addEventListener("click", () => {
        if (validJson) {
          openJsonModal(JSON.stringify(JSON.parse(match), null, 2)); // properly formatted json
        }
      });
    }
  });
};

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

closeModalButton.addEventListener("click", () => {
  jsonModal.style.display = "none";
});

window.addEventListener("click", (event) => {
  if (event.target === jsonModal) {
    jsonModal.style.display = "none";
  }
});

// Initial update
updateLogTable();
