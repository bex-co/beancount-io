import sendgrid, { MailDataRequired } from "@sendgrid/mail";
import { logger } from "@/shared/logger";
import { ServiceUnavailableError } from "@/shared/errors";

const emailLogger = logger.child({ module: "sendgrid" });
const PROVIDER_TIMEOUT_MS = 10_000;

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
  /**
   * Turn off the open pixel and link rewriting that the SendGrid account
   * applies to every mail by default, so the links stay the URLs we wrote.
   */
  untracked?: boolean;
};

const UNTRACKED: MailDataRequired["trackingSettings"] = {
  clickTracking: { enable: false, enableText: false },
  openTracking: { enable: false },
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
      ...(data.untracked && { trackingSettings: UNTRACKED }),
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
}
