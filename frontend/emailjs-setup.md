# EmailJS Setup Instructions

To receive emails directly in your inbox from the contact form, follow these steps:

## 1. Create EmailJS Account
- Go to https://www.emailjs.com/
- Sign up for a free account
- Verify your email address

## 2. Create Email Service
- In EmailJS dashboard, go to "Email Services"
- Click "Add New Service"
- Choose "Gmail" (recommended)
- Connect your Gmail account (shadsbrian@gmail.com)
- Note the Service ID (e.g., "service_abc123")

## 3. Create Email Template
- Go to "Email Templates"
- Click "Create New Template"
- Use this template:

**Subject:** New Contact Form Message - {{topic}}

**Content:**
```
Hello,

You have received a new message from your CampusVote contact form:

Name: {{from_name}}
Email: {{from_email}}
Topic: {{topic}}

Message:
{{message}}

---
This message was sent from the CampusVote contact form.
```

- Save and note the Template ID (e.g., "template_xyz789")

## 4. Get Public Key
- Go to "Account" > "General"
- Copy your Public Key (e.g., "user_abcdef123456")

## 5. Update Code
Replace these values in app.js:

```javascript
emailjs.init('YOUR_PUBLIC_KEY'); // Replace with your actual public key
await emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', formData);
```

Example:
```javascript
emailjs.init('user_abcdef123456');
await emailjs.send('service_abc123', 'template_xyz789', formData);
```

## 6. Test
- Fill out the contact form on your website
- Check your Gmail inbox for the message
- Check spam folder if not received

## Free Plan Limits
- 200 emails per month
- EmailJS branding in emails
- Upgrade to paid plan for more emails and no branding

The contact form will now send emails directly to shadsbrian@gmail.com!