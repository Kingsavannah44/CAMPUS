# Campus Election System - Deployment Guide

## Quick Deployment Options

### Option 1: Local Production Setup (Recommended for Testing)

1. **Setup Environment**:
```bash
cd campus-election-backend
cp .env.example .env
```

2. **Configure .env**:
```env
MONGODB_URI=mongodb://localhost:27017/CampusElectionsDB
JWT_SECRET=your-64-character-random-string-here
NODE_ENV=production
PORT=5000
```

3. **Install & Start**:
```bash
npm install
npm start
```

4. **Serve Frontend**:
```bash
cd ../frontend
python -m http.server 3000
# OR
npx serve -s . -l 3000
```

### Option 2: Cloud Deployment (Production Ready)

#### Backend - Heroku/Railway/Render
1. **Create account** on Heroku/Railway/Render
2. **Connect GitHub** repository
3. **Set environment variables**:
   - `MONGODB_URI`: MongoDB Atlas connection string
   - `JWT_SECRET`: Generate with `openssl rand -hex 64`
   - `NODE_ENV`: production

#### Frontend - Netlify/Vercel
1. **Update API URL** in `frontend/app.js`:
```javascript
const API_BASE = 'https://your-backend-url.herokuapp.com/api';
```
2. **Deploy** to Netlify/Vercel from GitHub

#### Database - MongoDB Atlas
1. **Create cluster** at mongodb.com/atlas
2. **Get connection string**
3. **Add to backend environment**

### Option 3: VPS/Server Deployment

#### Prerequisites
```bash
# Install Node.js, MongoDB, Nginx
sudo apt update
sudo apt install nodejs npm mongodb nginx certbot
```

#### Setup
```bash
# Clone repository
git clone your-repo-url
cd campus-election-system

# Backend setup
cd campus-election-backend
npm install --production
cp .env.example .env
# Edit .env with production values

# Start with PM2
npm install -g pm2
pm2 start server.js --name "election-backend"
pm2 startup
pm2 save

# Frontend setup
cd ../frontend
# Update API_BASE to your domain
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Frontend
    location / {
        root /path/to/frontend;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### SSL Certificate
```bash
sudo certbot --nginx -d yourdomain.com
```

## Pre-Deployment Checklist

### Security
- [ ] Change default JWT secret
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall
- [ ] Set up MongoDB authentication
- [ ] Update CORS origins
- [ ] Enable rate limiting

### Configuration
- [ ] Set NODE_ENV=production
- [ ] Configure database connection
- [ ] Set up file upload directory
- [ ] Configure email settings (optional)

### Testing
- [ ] Test user registration
- [ ] Test voting functionality
- [ ] Test admin features
- [ ] Verify security headers
- [ ] Check mobile responsiveness

## Environment Variables

```env
# Required
MONGODB_URI=mongodb://localhost:27017/CampusElectionsDB
JWT_SECRET=your-super-secure-64-character-secret
NODE_ENV=production
PORT=5000

# Optional
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## Monitoring & Maintenance

### Logs
```bash
# PM2 logs
pm2 logs election-backend

# System logs
tail -f /var/log/nginx/access.log
```

### Backup
```bash
# MongoDB backup
mongodump --db CampusElectionsDB --out backup/
```

### Updates
```bash
git pull origin main
npm install
pm2 restart election-backend
```

## Troubleshooting

### Common Issues
- **CORS errors**: Update frontend API_BASE URL
- **Database connection**: Check MongoDB URI and network access
- **File uploads**: Ensure uploads/ directory exists and has write permissions
- **SSL issues**: Verify certificate installation and renewal

### Support
- Check logs for error details
- Verify environment variables
- Test database connectivity
- Confirm all dependencies installed

## Quick Start Commands

```bash
# Development
npm run dev

# Production
npm start

# Install dependencies
npm install

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Choose the deployment option that best fits your needs and infrastructure requirements.