const { WakaTimeClient, RANGE } = require("wakatime-client");
const { Octokit } = require("@octokit/rest");
require("dotenv").config();

const wakatime = new WakaTimeClient(process.env.WAKATIME_API_KEY);
const octokit = new Octokit({ auth: `token ${process.env.GH_TOKEN}` });

const MAX_GIST_PREVIEW_LINES = 5;

(async function main() {
  const { data: stats } = await wakatime.getMyStats({
    range: RANGE.LAST_7_DAYS
  });

  const rangeText = `${stats.start.slice(0, 10)} - ${stats.end.slice(0, 10)}`;
  const title = `📊 WakaTime (${rangeText})`;
  const content = formatStats(stats);

  await updateGist(title, content);
})();

function truncateText(text = "", maxLength = 0) {
  return text.length > maxLength
    ? text.substring(0, maxLength - 3) + "..."
    : text;
}

function makePercentageBar(percent = 0, size = 10) {
  return "█".repeat(Math.round(size * (percent / 100))).padEnd(size, "░");
}

function formatStats(stats) {
  const columnWidth = {
    name: "JavaScript".length,
    text: "23 hrs 59 mins".length,
    bar: "██████████░░░░░░░░░░".length,
    percent: "100.0%".length
  };

  const lines = (stats.languages ?? [])
    .slice(0, MAX_GIST_PREVIEW_LINES)
    .map(language =>
      [
        truncateText(language.name, columnWidth["name"]).padEnd(
          columnWidth["name"],
          " "
        ),
        language.text.padEnd(columnWidth["text"], " "),
        makePercentageBar(language.percent, columnWidth["bar"]),
        String(language.percent.toFixed(1) + "%").padStart(
          columnWidth["percent"],
          " "
        )
      ].join("  ")
    );

  return lines.length > 0 ? lines.join("\n") : "No data available.";
}

async function updateGist(title = "", text = "") {
  const { data: gist } = await octokit.gists.get({
    gist_id: process.env.GIST_ID
  });
  const [filename] = Object.keys(gist.files);

  await octokit.gists.update({
    gist_id: process.env.GIST_ID,
    files: {
      [filename]: {
        filename: title,
        content: text
      }
    }
  });
}
