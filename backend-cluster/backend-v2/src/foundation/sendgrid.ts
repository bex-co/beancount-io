import sendgrid, { MailDataRequired } from "@sendgrid/mail";
import { logger } from "@/shared/logger";
import { ServiceUnavailableError } from "@/shared/errors";

const emailLogger = logger.child({ module: "sendgrid" });
const PROVIDER_TIMEOUT_MS = 10_000;
const SENDGRID_API_URL = "https://api.sendgrid.com/v3";

export type SendGridOpts = {
  apiKey: string;
  retryLimit: number;
  defaultFrom?: string;
};

type Mail = {
  from?: string;
  to: string | Array<string>;
  subject?: string;
  html?: string;
  text?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, unknown>;
  /**
   * The unsubscribe group the mail belongs to. SendGrid then adds the
   * List-Unsubscribe headers and drops it for anyone who left the group.
   */
  asm?: { groupId: number };
};

type TemplateMailParams = {
  to: string | Array<string>;
  templateId: string;
  dynamicTemplateData: Record<string, unknown>;
  from?: string;
};

export interface ISendGrid {
  sendMail(data: Mail): Promise<void>;
  sendTemplate(params: TemplateMailParams): Promise<void>;
  /** Whether `email` unsubscribed from the unsubscribe group `groupId`. */
  isSuppressed(email: string, groupId: number): Promise<boolean>;
}

export class SendGrid implements ISendGrid {
  public opts: SendGridOpts;

  constructor(opts: SendGridOpts) {
    this.opts = opts;
    sendgrid.setApiKey(opts.apiKey);
    sendgrid.setTimeout(PROVIDER_TIMEOUT_MS);
  }

  public async sendMail(data: Mail): Promise<void> {
    const mailData: MailDataRequired = {
      to: data.to,
      from: data.from || this.opts.defaultFrom || "noreply@mail.beancount.io",
      subject: data.subject || "",
      html: data.html,
      text: data.text,
      templateId: data.templateId,
      dynamicTemplateData: data.dynamicTemplateData,
      ...(data.asm && { asm: { groupId: data.asm.groupId } }),
    } as MailDataRequired;

    for (let i = this.opts.retryLimit; i > 0; i -= 1) {
      try {
        await sendgrid.send(mailData);
        return;
      } catch {
        emailLogger.error("Email delivery failed", {
          operation: "sendMail",
          errorCategory: "MAIL_PROVIDER_FAILURE",
        });
        if (i === 1) {
          throw new ServiceUnavailableError("Email delivery", 5);
        }
      }
    }
  }

  public async sendTemplate(params: TemplateMailParams): Promise<void> {
    const mailData: MailDataRequired = {
      to: params.to,
      from: params.from || this.opts.defaultFrom || "noreply@mail.beancount.io",
      templateId: params.templateId,
      dynamicTemplateData: params.dynamicTemplateData,
    } as MailDataRequired;

    for (let i = this.opts.retryLimit; i > 0; i -= 1) {
      try {
        await sendgrid.send(mailData);
        return;
      } catch {
        emailLogger.error("Email delivery failed", {
          operation: "sendTemplate",
          errorCategory: "MAIL_PROVIDER_FAILURE",
        });
        if (i === 1) {
          throw new ServiceUnavailableError("Email delivery", 5);
        }
      }
    }
  }

  public async isSuppressed(email: string, groupId: number): Promise<boolean> {
    const response = await fetch(
      `${SENDGRID_API_URL}/asm/groups/${groupId}/suppressions/search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.opts.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipient_emails: [email] }),
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      },
    ).catch(() => null);
    if (!response?.ok) {
      emailLogger.error("Suppression lookup failed", {
        operation: "isSuppressed",
        errorCategory: "MAIL_PROVIDER_FAILURE",
        status: response?.status,
      });
      throw new ServiceUnavailableError("Email suppression lookup", 5);
    }
    const suppressed = (await response.json()) as string[];
    const wanted = email.toLowerCase();
    return suppressed.some((address) => address.toLowerCase() === wanted);
  }
}

export class ConsoleSendGrid implements ISendGrid {
  public opts: SendGridOpts;

  constructor(opts: SendGridOpts) {
    this.opts = opts;
    emailLogger.debug(
      "ConsoleSendGrid initialized for development environment",
    );
  }

  public async sendMail(data: Mail): Promise<void> {
    emailLogger.debug("Email delivery suppressed in development", {
      operation: "sendMail",
      recipientCount: Array.isArray(data.to) ? data.to.length : 1,
    });
  }

  public async sendTemplate(params: TemplateMailParams): Promise<void> {
    emailLogger.debug("Email delivery suppressed in development", {
      operation: "sendTemplate",
      recipientCount: Array.isArray(params.to) ? params.to.length : 1,
    });
  }

  public async isSuppressed(): Promise<boolean> {
    return false;
  }
}
