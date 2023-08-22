import { containsValidJson, createGitHubCommentURL, generateRandomId, getLevelString } from "./helpers/utils";
import { Logs } from "./types/log";
import { createClient } from "@supabase/supabase-js";

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
        ${
          validJson
            ? `<td class="log-cell">${beforeText} - <button id="button_${classId}">Show JSON</button></td>`
            : `<td class="log-cell">${log.log_message}</td>`
        }
        <td>${getLevelString(log.level)}</td>
        <td>${log.timestamp}</td>
        <td><a href="${commentUrl}">Comment - ${log.comment_id}</a></td>
    `;
    logBody.appendChild(row);
    let logCell = document.getElementsByClassName("log-cell");
    if (validJson) {
      // show modal button for valid json row
      const showMoreButton = document.getElementById(`button_${classId}`) as HTMLButtonElement;
      showMoreButton.addEventListener("click", () => {
        if (validJson) {
          openJsonModal(JSON.stringify(JSON.parse(match), null, 2)); // properly formatted json
        }
      });
    }
    // scroll to last added data
    logCell[logCell.length - 1].scrollIntoView();
  });
};

let logs: Logs[] = [];

const supabaseClient = createClient(
  "https://qzfjblxdroqrmlheoajw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmpibHhkcm9xcm1saGVvYWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODA4NTMwMzMsImV4cCI6MTk5NjQyOTAzM30.BM_qkpX-egNdiMc0PDO_34bIaXHB7ewnr2k4U2hGFMM"
);

const channel = supabaseClient
  .channel("table-db-changes")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "logs",
    },
    (payload) => handlePayload(payload)
  )
  .subscribe();

const handlePayload = (logEntry) => {
  if (logEntry?.eventType !== "INSERT") return;
  logs.push(logEntry.new);
  updateLogTable();
};

filterSelect.addEventListener("change", () => {
  updateLogTable();
});

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
