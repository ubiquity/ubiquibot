import { Logs } from "./types/log";

enum Level {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  HTTP = "http",
  VERBOSE = "verbose",
  DEBUG = "debug",
  SILLY = "silly",
}

const createGitHubCommentURL = (orgName: string, repoName: string, issueNumber: number, commentId: number) => {
  return `https://github.com/${orgName}/${repoName}/issues/${issueNumber}#issuecomment-${commentId}`;
};

const getLevelString = (level: number) => {
  switch (level) {
    case 0:
      return Level.ERROR;
    case 1:
      return Level.WARN;
    case 2:
      return Level.INFO;
    case 3:
      return Level.HTTP;
    case 4:
      return Level.VERBOSE;
    case 5:
      return Level.DEBUG;
    case 6:
      return Level.SILLY;
    default:
      return -1; // Invalid level
  }
};

const filterSelect = document.getElementById("filter") as unknown as HTMLSelectElement;
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
    const commentUrl = createGitHubCommentURL(log.org_name, log.repo_name, log.issue_number, log.comment_id);
    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${log.log_message}</td>
        <td>${getLevelString(log.level)}</td>
        <td>${log.timestamp}</td>
        <td><a href="${commentUrl}">Comment - ${log.comment_id}</a></td>
    `;
    logBody.appendChild(row);
  });
};

// Initial update
updateLogTable();
