import sendgrid, { MailDataRequired } from "@sendgrid/mail";
import { logger } from "@/shared/logger";

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
    } as MailDataRequired;

    for (let i = this.opts.retryLimit; i > 0; i -= 1) {
      try {
        await sendgrid.send(mailData);
        return;
      } catch (e) {
        logger.error(`failed to SendGrid.sendMail: ${e}`);
        if (i === 1) {
          throw e;
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
      } catch (e) {
        logger.error(`failed to SendGrid.sendTemplate: ${e}`);
        if (i === 1) {
          throw e;
        }
      }
    }
  }
}

export class ConsoleSendGrid implements ISendGrid {
  public opts: SendGridOpts;

  constructor(opts: SendGridOpts) {
    this.opts = opts;
    logger.debug("ConsoleSendGrid initialized for development environment");
  }

  public async sendMail(data: Mail): Promise<void> {
    logger.debug("ConsoleSendGrid.sendMail called with data:", {
      to: data.to,
      from: data.from || this.opts.defaultFrom || "noreply@mail.beancount.io",
      subject: data.subject,
      html: data.html,
      text: data.text,
      templateId: data.templateId,
      dynamicTemplateData: data.dynamicTemplateData,
    });
  }

  public async sendTemplate(params: TemplateMailParams): Promise<void> {
    logger.debug("ConsoleSendGrid.sendTemplate called with data:", {
      to: params.to,
      from: params.from || this.opts.defaultFrom || "noreply@mail.beancount.io",
      templateId: params.templateId,
      dynamicTemplateData: params.dynamicTemplateData,
    });
  }
}
