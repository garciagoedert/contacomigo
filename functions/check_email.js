const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: 'marketing@southsea.com.br',
        pass: 'dzjjhqnpvxlrobyk'
    }
});

async function verify() {
    try {
        console.log("Verifying SMTP connection...");
        await transporter.verify();
        console.log("✅ SMTP Credentials are VALID.");
    } catch (error) {
        console.error("❌ SMTP Credentials INVALID or Connection Failed:", error);
    }
}

verify();
