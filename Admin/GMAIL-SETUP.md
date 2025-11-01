# Gmail App Password Setup for Kina Resort System

## Why App Passwords?
Gmail requires an "App Password" instead of your regular password for SMTP authentication. This is a security feature.

## Step-by-Step Instructions

### 1. Enable 2-Factor Authentication (2FA)
1. Go to your Google Account: https://myaccount.google.com
2. Click **Security** (left sidebar)
3. Under "Signing in to Google", click **2-Step Verification**
4. Follow the prompts to enable 2FA if not already enabled

### 2. Generate an App Password

1. Go back to **Security** settings
2. Under "Signing in to Google", find **App passwords**
3. You may need to sign in again
4. Select **Mail** as the app type
5. Select **Other (Custom name)** for the device type
6. Enter "Kina Resort System" as the name
7. Click **Generate**

### 3. Copy the Generated Password

You'll see a 16-character password like: `abcd efgh ijkl mnop`

**Important:** Copy this entire password (with spaces or without spaces - both work)

### 4. Update Your .env File

Edit the `.env` file in your project and replace the SMTP password:

```
SMTP_PASSWORD=abcd efgh ijkl mnop
```

Or remove the spaces:
```
SMTP_PASSWORD=abcdefghijklmnop
```

### 5. Test the Configuration

Start your server:
```bash
npm start
```

Try creating a booking - the system will attempt to send an email.

## Troubleshooting

### Error: "Invalid login"
- Make sure you're using the **App Password**, not your regular Gmail password
- Check that 2FA is enabled

### Error: "Less secure app access"
- Google no longer allows "less secure apps"
- You **must** use App Passwords
- Make sure you generated a new app password

### Email not sending
1. Check the console logs for errors
2. Verify the password is correct
3. Make sure 2FA is enabled
4. Try generating a new app password

### Alternative: Use Different Email Provider

If Gmail continues to cause issues, you can use:

#### Outlook/Hotmail:
```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
```

#### SendGrid (Free tier available):
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

## Security Note

⚠️ **Never commit your actual passwords to version control!**

Your `.env` file should be in `.gitignore` (which it should be by default).

## Current Configuration

Edit your `.env` file to use:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=nashabrenica06@gmail.com
SMTP_PASSWORD=your-16-character-app-password-here
```

Replace `your-16-character-app-password-here` with the actual app password from Google.

## Quick Checklist

- [ ] 2-Factor Authentication enabled on Google account
- [ ] App Password generated in Google Account settings
- [ ] App Password copied (all 16 characters)
- [ ] `.env` file updated with app password
- [ ] Server restarted after updating `.env`
- [ ] Test email sending functionality

## Need Help?

If you continue to have issues:
1. Check server console for specific error messages
2. Verify your Google account is not blocked
3. Try generating a new app password
4. Consider using a different email provider

---

**Remember:** Keep your app password secure and never share it publicly!

