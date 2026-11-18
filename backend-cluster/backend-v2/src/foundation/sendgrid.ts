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
  /**
   * The unsubscribe group the mail belongs to. SendGrid then adds the
   * List-Unsubscribe headers and drops it for anyone who left the group.
   */
  asm?: { groupId: number };
};

/**
 * The SendGrid account turns on an open pixel and link rewriting for every
 * mail by default. Every mail turns both off, so a reset or sign-in link is the
 * URL we wrote rather than a SendGrid redirect, and nobody is tracked.
 */
const UNTRACKED: MailDataRequired["trackingSettings"] = {
  clickTracking: { enable: false, enableText: false },
  openTracking: { enable: false },
};

export interface ISendGrid {
  sendMail(data: Mail): Promise<void>;
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
      trackingSettings: UNTRACKED,
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
}
