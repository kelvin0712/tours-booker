const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1. create transporter
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      password: process.env.EMAIL_PASSWORD,
    },
    // Activate in gmail "less secure app" option
  });
  // 2. Define email options
  const mailOptions = {
    from: 'Kelvin <hello@gmail.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };
  // 3. Acutally send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
