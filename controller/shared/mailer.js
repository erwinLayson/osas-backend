const nodemailer = require("nodemailer");
const { getEnv } = require('../../config/env');

const systemEmail = getEnv('SYSTEM_GMAIL');

const mailer = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: getEnv('PRIVATE_GMAIL'),
        pass: getEnv('APP_CODE')
    }
});

/**
 * Build a styled HTML email template.
 * @param {string} logoText - Brand text shown in the header.
 * @param {string} heading    - Main heading of the email.
 * @param {string} bodyHtml  - Inner body HTML (already escaped by caller).
 * @param {string} footerText - Text for the footer.
 * @returns {string} Full HTML document.
 */
function buildEmailHtml(logoText, heading, bodyHtml, footerText) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${logoText}</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Segoe UI', Arial, sans-serif; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #047857, #059669); padding: 28px 32px; color: #fff; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; letter-spacing: 0.5px; }
        .header .sub { margin-top: 6px; font-size: 13px; opacity: 0.9; }
        .body { padding: 32px; color: #374151; line-height: 1.7; font-size: 15px; }
        .body h2 { color: #047857; font-size: 18px; margin: 0 0 12px; }
        .body p { margin: 0 0 14px; }
        .badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; margin-bottom: 16px; }
        .badge-success { background: #d1fae5; color: #065f46; }
        .badge-error { background: #fee2e2; color: #991b1b; }
        .detail-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
        .detail-table th { text-align: left; padding: 8px 10px; background: #f9fafb; color: #6b7280; border-bottom: 1px solid #e5e7eb; width: 40%; }
        .detail-table td { padding: 8px 10px; color: #111827; border-bottom: 1px solid #e5e7eb; }
        .footer { padding: 20px 32px; background: #f9fafb; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
        .footer a { color: #047857; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${logoText}</h1>
            <div class="sub">Office of Student Affairs and Services</div>
        </div>
        <div class="body">
            <h2>${heading}</h2>
            ${bodyHtml}
        </div>
        <div class="footer">
            ${footerText}
        </div>
    </div>
</body>
</html>`;
}

/**
 * Build the body HTML for an approval notification.
 * @param {object} info - { studentName, email, scholarshipName, amount }.
 */
function approvalBody(info) {
    const amountRow = info.amount
        ? `<tr><th>Scholarship Amount</th><td>₱${Number(info.amount).toLocaleString('en-PH')}</td></tr>`
        : '';
    return `
<span class="badge badge-success">Application Approved</span>
<p>Dear <strong>${info.studentName}</strong>,</p>
<p>We are pleased to inform you that your application for <strong>${info.scholarshipName}</strong> has been approved. Congratulations on this achievement!</p>
<p>Your application has been reviewed and accepted by the scholarship committee. Please proceed to the next steps as outlined below.</p>
<table class="detail-table">
    <tr><th>Student Name</th><td>${info.studentName}</td></tr>
    <tr><th>Email Address</th><td>${info.email}</td></tr>
    <tr><th>Scholarship</th><td>${info.scholarshipName}</td></tr>
    ${amountRow}
</table>
<p><strong>Next Steps:</strong></p>
<ul style="margin: 0 0 14px 20px; color: #4b5563;">
    <li>Log in to your student portal to view your updated application status.</li>
    <li>Prepare any additional documents that may be required for disbursement.</li>
    <li>Reach out to the Office of Student Affairs if you have questions about your award.</li>
</ul>
<p>If you have any questions, feel free to contact the OSAS office at <a href="mailto:osas@university.edu">osas@university.edu</a>.</p>
`;
}

/**
 * Build the body HTML for a rejection notification.
 * @param {object} info - { studentName, email, scholarshipName }.
 */
function rejectionBody(info) {
    return `
<span class="badge badge-error">Application Not Approved</span>
<p>Dear <strong>${info.studentName}</strong>,</p>
<p>Thank you for applying for <strong>${info.scholarshipName}</strong> through the OSAS Scholarship Application System.</p>
<p>After careful review of your application and supporting documents, the scholarship committee has decided not to award this particular scholarship at this time.</p>
<p>Please understand that this decision does not reflect on your abilities or potential. Scholarship selection is highly competitive, and many qualified applicants apply for each program.</p>
<table class="detail-table">
    <tr><th>Student Name</th><td>${info.studentName}</td></tr>
    <tr><th>Email Address</th><td>${info.email}</td></tr>
    <tr><th>Scholarship</th><td>${info.scholarshipName}</td></tr>
</table>
<p><strong>What you can do next:</strong></p>
<ul style="margin: 0 0 14px 20px; color: #4b5563;
    <li">Keep an eye on new scholarship postings — opportunities are added regularly.</li>
    <li>Review the requirements for future applications and strengthen your materials.</li>
    <li>Contact your academic adviser for guidance on other funding options.</li>
</ul>
<p>We encourage you to apply again for other available scholarships. For questions, contact <a href="mailto:osas@university.edu">osas@university.edu</a>.</p>
`;
}

/**
 * Rejection mail with full HTML template.
 * Supports two call signatures:
 *   (to, subject, text, scholarshipName, info)
 *   (to, subject, text, content)  — legacy 4-arg call.
 */
async function rejectionMail(to, subject, text, arg4, arg5) {
    try {
        let data;
        if (arg5) {
            // New signature: (to, subject, text, scholarshipName, info)
            data = arg5;
        } else {
            // Legacy 4-arg call: (to, subject, text, content)
            // Guess student name from the text if we can; otherwise use a default.
            const studentName = 'Student';
            data = { studentName, email: to, scholarshipName: arg4 || 'the scholarship' };
        }
        const html = buildEmailHtml('OSAS Scholarship System', subject || 'Scholarship Application Update', rejectionBody(data), '© OSAS System. This is an automated message — please do not reply to this email.');

        const mail = await mailer.sendMail({
            from: systemEmail,
            to,
            subject,
            text,
            html
        });

        console.log('Rejection email sent', mail.messageId);
        return mail;
    } catch (err) {
        console.error('Failed to send rejection email:', err.message);
    }
}

/**
 * Simple text-only scholarship notification mail (kept for backward compat).
 */
async function sendScholarshipMail(subject, to, text) {
    try {
        const mail = await mailer.sendMail({
            from: systemEmail,
            to,
            subject,
            text
        });
        console.log(mail.messageId);
        return mail;
    } catch (err) {
        console.error('Failed to send scholarship mail:', err.message);
    }
}

/**
 * Send a scholarship approval email with a full HTML template.
 * @param {string} to - Recipient email.
 * @param {object} info - Application details.
 */
async function sendScholarshipApprovalMail(to, info) {
    try {
        const subject = `Scholarship Application Approved — ${info.scholarshipName}`;
        const text = `Congratulations, ${info.studentName}! Your application for ${info.scholarshipName} has been approved.`;
        const html = buildEmailHtml('OSAS Scholarship System', 'Your Scholarship Application Has Been Approved', approvalBody(info), '© OSAS System. This is an automated message — please do not reply to this email.');

        const mail = await mailer.sendMail({
            from: systemEmail,
            to,
            subject,
            text,
            html
        });

        console.log('Approval email sent', mail.messageId);
        return mail;
    } catch (err) {
        console.error('Failed to send approval email:', err.message);
    }
}

/**
 * Send an account credentials email after registration.
 * @param {object} info - { email, username, password, studentName }.
 */
async function approvalMail(subject, text, info) {
    try {
        const html = buildEmailHtml('OSAS Scholarship System', 'Welcome to OSAS — Your Account Details', `
<p>Dear <strong>${info.studentName}</strong>,</p>
<p>Your account has been created successfully. You can now log in to the OSAS portal.</p>
<table class="detail-table">
    <tr><th>Student Name</th><td>${info.studentName}</td></tr>
    <tr><th>Email Address</th><td>${info.email}</td></tr>
    <tr><th>Username</th><td>${info.username}</td></tr>
    <tr><th>Temporary Password</th><td>${info.password}</td></tr>
</table>
<p style="color: #dc2626; font-weight: 600;">Please change your password immediately after logging in for security.</p>
<p>Once logged in, you can browse available scholarships, submit applications with your documents, and track your application status.</p>
<p style="margin-top: 24px;"><a href="${process.env.BASE_URL || 'http://localhost:3000'}/login" style="background: #059669; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">Go to Login Page</a></p>
`, '© OSAS System. This is an automated message — please do not reply to this email.');

        const mail = await mailer.sendMail({
            from: systemEmail,
            to: info.email,
            subject,
            text,
            html
        });

        console.log('Account email sent', mail.messageId);
        return mail;
    } catch (err) {
        console.error('Failed to send account email:', err.message);
    }
}

module.exports = {
    approvalMail,
    rejectionMail,
    sendScholarshipMail,
    sendScholarshipApprovalMail
}