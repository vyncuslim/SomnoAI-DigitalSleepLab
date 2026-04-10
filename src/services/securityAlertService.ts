import { sendTelegramMessage } from '../lib/telegram';

export interface Report {
  id: string;
  title: string;
  type: string;
  severity?: string;
  user_id?: string;
  reporterName?: string;
  description?: string;
}

export const SecurityAlertService = {
  async notifyNewReport(report: Report, aiSuggestion?: { type: string; severity: string; confidence: number }) {
    const message = `🛠️ *New Issue Detected*

🔍 *Title:* ${report.title}
📂 *Type:* ${report.type}
📊 *Severity:* ${aiSuggestion?.severity.toUpperCase() || 'N/A'}

🤖 *AI Confidence:* ${aiSuggestion?.confidence || 'N/A'}%

📌 *Status:* Pending Review
🔗 [View in Dashboard](https://sleepsomno.com/admin/dashboard)`;

    await sendTelegramMessage(message);
  },

  async notifyReportValidated(report: Report, severity: string) {
    if (severity === 'critical' || severity === 'high') {
      const message = `🚨 *SECURITY ALERT*

🔍 *Title:* ${report.title}
👤 *Reporter:* ${report.reporterName || 'Anonymous'}
🛡️ *Type:* ${report.type}
🔥 *Severity:* ${severity.toUpperCase()}

📄 *Description:*
${report.description?.substring(0, 100) || 'No description provided'}...

⚡ *Action:* Immediate investigation required
🔗 [View in Dashboard](https://sleepsomno.com/admin/dashboard)`;

      await sendTelegramMessage(message);
    } else {
      const message = `🛠️ *Issue Validated*

🔍 *Title:* ${report.title}
📂 *Type:* ${report.type}
📊 *Severity:* ${severity.toUpperCase()}

📌 *Status:* Validated
🔗 [View in Dashboard](https://sleepsomno.com/admin/dashboard)`;

      await sendTelegramMessage(message);
    }
  }
};
