import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter object
const createTransporter = () => {
  try {
    // Log full configuration for debugging
    console.log('Email Configuration:', {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      user: process.env.EMAIL_USER,
      // Password not logged for security
    });
    
    // Gmail requires specific configuration
    if (process.env.EMAIL_HOST === 'smtp.gmail.com') {
      console.log('Setting up Gmail transporter');
      // Pure Gmail configuration for maximum compatibility
      return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // Use SSL
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        debug: true,
        logger: true
      });
    }
    
    // Default configuration for other email providers
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      debug: true, // Enable debug mode
      logger: true // Enable logging
    });
  } catch (err) {
    console.error('Error creating transport:', err);
    throw err;
  }
};

/**
 * Send OTP Email
 * @param {string} to - Recipient email
 * @param {string} otp - One Time Password
 * @returns {Promise<boolean>} - Success status
 */
export const sendOtpEmail = async (to, otp) => {
  try {
    console.log(`Attempting to send OTP email to ${to}`);
    const transporter = createTransporter();
    
    // Verify connection first
    try {
      const verificationResult = await new Promise((resolve, reject) => {
        transporter.verify(function (error, success) {
          if (error) {
            console.error('Transporter verification failed:', error);
            reject(error);
          } else {
            console.log('Transporter is ready to send messages');
            resolve(success);
          }
        });
      });
      console.log('Verification result:', verificationResult);
    } catch (verifyError) {
      console.error('SMTP connection failed during verification:', verifyError);
      throw verifyError;
    }
    
    // Email content
    const mailOptions = {
      from: `"CraveBites Admin" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Password Reset OTP - CraveBites Admin',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #1a3b39; text-align: center;">CraveBites Admin Password Reset</h2>
          <p>Hello,</p>
          <p>You have requested to reset your password for the CraveBites Admin account. Please use the following One-Time Password (OTP) to complete the process:</p>
          <div style="text-align: center; padding: 15px; background-color: #f5f5f5; border-radius: 5px; margin: 20px 0; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
            ${otp}
          </div>
          <p>This OTP is valid for 10 minutes and can be used only once.</p>
          <p>If you did not request this password reset, please ignore this email or contact support if you have any concerns.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
            &copy; ${new Date().getFullYear()} CraveBites. All rights reserved.
          </p>
        </div>
      `,
      text: `Your OTP for CraveBites Admin password reset is: ${otp}. This code is valid for 10 minutes.`
    };
    
    console.log('Mail options ready:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    // Send email
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('OTP Email sent successfully:', info.messageId);
      return true;
    } catch (sendError) {
      console.error('Error during sendMail operation:', sendError);
      if (sendError.code) console.error('Error code:', sendError.code);
      if (sendError.command) console.error('SMTP command that failed:', sendError.command);
      if (sendError.response) console.error('SMTP server response:', sendError.response);
      if (sendError.responseCode) console.error('SMTP response code:', sendError.responseCode);
      throw sendError;
    }
  } catch (error) {
    console.error('Overall email error:', error);
    // Log detailed error information
    if (error.stack) console.error('Error stack:', error.stack);
    return false;
  }
};

/**
 * Send Password Reset Confirmation Email
 * @param {string} to - Recipient email
 * @returns {Promise<boolean>} - Success status
 */
export const sendPasswordResetConfirmationEmail = async (to) => {
  try {
    console.log(`Sending password reset confirmation to ${to}`);
    const transporter = createTransporter();
    
    // Email content
    const mailOptions = {
      from: `"CraveBites Admin" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Password Reset Successful - CraveBites Admin',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #1a3b39; text-align: center;">Password Reset Successful</h2>
          <p>Hello,</p>
          <p>Your password for the CraveBites Admin account has been successfully reset.</p>
          <p>You can now log in with your new password.</p>
          <p>If you did not make this change, please contact support immediately.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
            &copy; ${new Date().getFullYear()} CraveBites. All rights reserved.
          </p>
        </div>
      `,
      text: `Your password for CraveBites Admin has been successfully reset. You can now log in with your new password.`
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset confirmation email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending password reset confirmation email:', error);
    return false;
  }
}; 