const properties = PropertiesService.getScriptProperties();
const TODOIST_ENDPOINT = properties.getProperty("TODOIST_ENDPOINT");
const TODOIST_TOKEN = properties.getProperty("TODOIST_TOKEN");
const TODOIST_PROJECT_ID = properties.getProperty("TODOIST_PROJECT_ID");
const SLACK_WEBHOOK_URL = properties.getProperty("SLACK_WEBHOOK_URL");
const SLACK_WEBHOOK_COLOR =
  properties.getProperty("SLACK_WEBHOOK_COLOR") || "good";
const SLACK_CHANNEL = properties.getProperty("SLACK_CHANNEL") || "#notify-text";
const SLACK_WEBHOOK_EMOJI =
  properties.getProperty("SLACK_WEBHOOK_EMOJI") || ":bow:";
const SLACK_WEBHOOK_USERNAME =
  properties.getProperty("SLACK_WEBHOOK_USERNAME") || "bot";
const MSG_TEMPLATE = `
%{tasks} \n
Goodluck :+1:
`;

const debug = (msg: string) => {
  Logger.log(`[debug] ${msg}`);
};

class TodoistFetcher {
  public static allTask(): any[] {
    const qs =
      "?token=" +
      TODOIST_TOKEN +
      "&sync_token=%27*%27&resource_types=[%22items%22]";
    const res = UrlFetchApp.fetch(TODOIST_ENDPOINT + qs, {
      method: "get",
      contentType: "x-www-form-urlencoded",
      muteHttpExceptions: true
    });

    return JSON.parse(res.getContentText());
  }

  public static todayTasks(projectId: number): any[] {
    const currentDate = new Date();
    currentDate.setTime(currentDate.getTime() + 1000 * 60 * 60 * 9);

    const result = TodoistFetcher.allTask().items.filter(item => {
      if (!item.due_date_utc) {
        return false;
      }

      const dueDate = new Date(item.due_date_utc);
      dueDate.setTime(dueDate.getTime() + 1000 * 60 * 60 * 9);

      return (
        currentDate.getUTCDate() === dueDate.getUTCDate() &&
        item.checked === 0 &&
        String(projectId) === String(item.project_id)
      );
    });

    return result;
  }
}

class SlackWebhooker {
  public static send(text: string): void {
    UrlFetchApp.fetch(SLACK_WEBHOOK_URL, {
      method: "post",
      payload: JSON.stringify({
        attachments: [
          {
            color: SLACK_WEBHOOK_COLOR,
            pretext: ":memo: *Today Tasks*",
            text
          }
        ],
        icon_emoji: SLACK_WEBHOOK_EMOJI,
        link_names: 1,
        username: SLACK_WEBHOOK_USERNAME
      })
    });
  }
}

function main(): void {
  const todayTasks = TodoistFetcher.todayTasks(TODOIST_PROJECT_ID);
  const taskNames = todayTasks.map(item => `- ${item.content}`);

  const msg = MSG_TEMPLATE.replace(/%{tasks}/g, taskNames.join("\n"));
  SlackWebhooker.send(msg);
}
