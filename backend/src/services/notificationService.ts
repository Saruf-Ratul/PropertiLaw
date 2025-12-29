import nodemailer from 'nodemailer';

/**
 * Email Notification Service
 * Handles sending email notifications to users
 */
export class NotificationService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * Send email notification
   */
  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('SMTP not configured, skipping email send');
        return false;
      }

      const info = await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || process.env.SMTP_USER,
        to,
        subject,
        text: text || html.replace(/<[^>]*>/g, ''),
        html
      });

      console.log('Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Notify user of new case assignment
   */
  async notifyCaseAssigned(
    userEmail: string,
    userName: string,
    caseNumber: string,
    propertyName: string
  ): Promise<boolean> {
    const subject = `New Case Assigned: ${caseNumber}`;
    const html = `
      <h2>New Case Assigned</h2>
      <p>Hello ${userName},</p>
      <p>You have been assigned to a new case:</p>
      <ul>
        <li><strong>Case Number:</strong> ${caseNumber}</li>
        <li><strong>Property:</strong> ${propertyName}</li>
      </ul>
      <p>Please log in to PropertiLaw to review the case details.</p>
    `;

    return this.sendEmail(userEmail, subject, html);
  }

  /**
   * Notify client of case status update
   */
  async notifyCaseStatusUpdate(
    clientEmail: string,
    clientName: string,
    caseNumber: string,
    status: string,
    propertyName: string
  ): Promise<boolean> {
    const subject = `Case Status Update: ${caseNumber}`;
    const html = `
      <h2>Case Status Update</h2>
      <p>Hello ${clientName},</p>
      <p>The status of your case has been updated:</p>
      <ul>
        <li><strong>Case Number:</strong> ${caseNumber}</li>
        <li><strong>Property:</strong> ${propertyName}</li>
        <li><strong>New Status:</strong> ${status}</li>
      </ul>
      <p>Please log in to PropertiLaw to view more details.</p>
    `;

    return this.sendEmail(clientEmail, subject, html);
  }

  /**
   * Notify of upcoming court hearing
   */
  async notifyUpcomingHearing(
    userEmail: string,
    userName: string,
    caseNumber: string,
    hearingDate: Date,
    court: string
  ): Promise<boolean> {
    const subject = `Upcoming Court Hearing: ${caseNumber}`;
    const html = `
      <h2>Upcoming Court Hearing</h2>
      <p>Hello ${userName},</p>
      <p>You have an upcoming court hearing:</p>
      <ul>
        <li><strong>Case Number:</strong> ${caseNumber}</li>
        <li><strong>Hearing Date:</strong> ${hearingDate.toLocaleDateString()}</li>
        <li><strong>Court:</strong> ${court}</li>
      </ul>
      <p>Please prepare accordingly and log in to PropertiLaw for case details.</p>
    `;

    return this.sendEmail(userEmail, subject, html);
  }

  /**
   * Notify of document ready for review
   */
  async notifyDocumentReady(
    userEmail: string,
    userName: string,
    caseNumber: string,
    documentName: string
  ): Promise<boolean> {
    const subject = `Document Ready for Review: ${caseNumber}`;
    const html = `
      <h2>Document Ready for Review</h2>
      <p>Hello ${userName},</p>
      <p>A new document is ready for your review:</p>
      <ul>
        <li><strong>Case Number:</strong> ${caseNumber}</li>
        <li><strong>Document:</strong> ${documentName}</li>
      </ul>
      <p>Please log in to PropertiLaw to review the document.</p>
    `;

    return this.sendEmail(userEmail, subject, html);
  }

  /**
   * Notify client of new case submission
   */
  async notifyNewCaseSubmitted(
    firmEmails: string[],
    caseNumber: string,
    clientName: string,
    propertyName: string
  ): Promise<boolean> {
    const subject = `New Case Submitted: ${caseNumber}`;
    const html = `
      <h2>New Case Submitted</h2>
      <p>A new case has been submitted by ${clientName}:</p>
      <ul>
        <li><strong>Case Number:</strong> ${caseNumber}</li>
        <li><strong>Property:</strong> ${propertyName}</li>
        <li><strong>Client:</strong> ${clientName}</li>
      </ul>
      <p>Please log in to PropertiLaw to review and process the case.</p>
    `;

    // Send to all firm emails
    const promises = firmEmails.map(email => this.sendEmail(email, subject, html));
    const results = await Promise.all(promises);
    return results.every(r => r);
  }
}

