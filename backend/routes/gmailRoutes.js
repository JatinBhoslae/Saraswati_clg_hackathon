const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const { GmailAuth } = require('../models/db');

dotenv.config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];

module.exports = function(store) {
    const router = express.Router();

    router.get('/auth', (req, res) => {
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent'
        });
        res.json({ url });
    });

    router.get('/callback', async (req, res) => {
        const { code } = req.query;
        try {
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);
            const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
            const userinfo = await oauth2.userinfo.get();
            const email = userinfo.data.email;

            await GmailAuth.findOneAndUpdate({ email }, { 
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiryDate: tokens.expiry_date,
                email
            }, { upsert: true });

            res.send(`
                <html>
                    <body style="background: #0B0F14; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                        <div style="text-align: center; background: rgba(255,255,255,0.03); padding: 3rem; border-radius: 40px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 50px rgba(0,0,0,0.5); max-width: 400px; width: 90%;">
                            <div style="font-size: 60px; margin-bottom: 20px;">🛡️</div>
                            <h2 style="color: #22C55E; font-size: 28px; margin-bottom: 10px;">✓ Gmail Linked!</h2>
                            <p style="color: rgba(255,255,255,0.6); margin-bottom: 30px;">${email} is now connected to your assistant.</p>
                            
                            <a href="http://localhost:5173/schedule" style="display: inline-block; background: #6366F1; color: white; padding: 15px 40px; border-radius: 16px; text-decoration: none; font-weight: bold; font-size: 14px; transition: all 0.3s ease; box-shadow: 0 10px 20px rgba(99,102,241,0.3);">
                                GO TO SCHEDULE
                            </a>
                            
                            <p style="margin-top: 25px; font-size: 11px; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 2px;">This window can be closed safely</p>
                        </div>
                    </body>
                </html>
            `);
        } catch (error) {
            console.error('Gmail Auth Error:', error);
            res.status(500).send('Authentication failed');
        }
    });

    router.get('/emails', async (req, res) => {
        try {
            const auth = await GmailAuth.findOne();
            if (!auth) return res.status(401).json({ error: 'NOT_AUTHENTICATED' });

            oauth2Client.setCredentials({
                access_token: auth.accessToken,
                refresh_token: auth.refreshToken,
                expiry_date: auth.expiryDate
            });

            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
            const listRes = await gmail.users.messages.list({
                userId: 'me',
                maxResults: 15,
                q: 'is:unread -category:social -category:promotions'
            });

            if (!listRes.data.messages) return res.json([]);

            const emailDetails = await Promise.all(
                listRes.data.messages.map(async (msg) => {
                    try {
                        const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id });
                        const headers = detail.data.payload.headers;
                        return {
                            id: msg.id,
                            sender: headers.find(h => h.name === 'From')?.value.split('<')[0].trim(),
                            subject: headers.find(h => h.name === 'Subject')?.value || 'No Subject',
                            time: new Date(headers.find(h => h.name === 'Date')?.value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            snippet: detail.data.snippet
                        };
                    } catch (e) { return null; }
                })
            );

            res.json(emailDetails.filter(e => e !== null));
        } catch (error) {
            console.error('Gmail Fetch Error:', error);
            res.status(500).json({ error: 'Failed to fetch' });
        }
    });

    router.get('/status', async (req, res) => {
        const auth = await GmailAuth.findOne();
        res.json({ authenticated: !!auth, email: auth?.email });
    });

    router.post('/disconnect', async (req, res) => {
        await GmailAuth.deleteMany({});
        res.json({ status: 'success' });
    });

    return router;
};
