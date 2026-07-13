import type { EmailMessage } from "@/platform/types";

/**
 * Vendor-swappable email.
 * v1: Spacemail (SMTP) · later: Resend / SES.
 */
export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<{ id: string }>;
}

export class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console";

  async send(message: EmailMessage): Promise<{ id: string }> {
    const id = `console_${Date.now()}`;
    console.info("[email:console]", {
      id,
      to: message.to,
      subject: message.subject,
      from: message.from ?? process.env.EMAIL_FROM ?? "hello@rontgenai.dev",
    });
    return { id };
  }
}

export class SpacemailProvider implements EmailProvider {
  readonly name = "spacemail";

  constructor(
    private readonly smtpUrl = process.env.SPACEMAIL_SMTP_URL,
    private readonly defaultFrom = process.env.EMAIL_FROM ?? "hello@rontgenai.dev",
  ) {}

  async send(message: EmailMessage): Promise<{ id: string }> {
    if (!this.smtpUrl) {
      throw new Error("SPACEMAIL_SMTP_URL is not configured");
    }
    // Phase 1: nodemailer / SMTP transport
    void this.defaultFrom;
    void message;
    throw new Error("Spacemail SMTP send not implemented in web Phase 0");
  }
}

export function getEmailProvider(): EmailProvider {
  if (process.env.SPACEMAIL_SMTP_URL) {
    return new SpacemailProvider();
  }
  return new ConsoleEmailProvider();
}
