// ============================================================
// 📧 GMAIL API ROUTES (v1.0)
// Integration with Official Google Gmail API
// ============================================================

const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');

dotenv.config();

// Load Credentials from .env
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

// OAuth2 Client initialization
const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

// Define API Scopes (Read-only for security)
const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.profile'
];

module.exports = function(store) {
    const router = express.Router();

    /** 🚪 1. INITIATE OAUTH FLOW */
    router.get('/auth', (req, res) => {
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline', // Get refresh token
            scope: SCOPES,
            prompt: 'consent'
        });
        res.json({ url });
    });

    /** 🔄 2. OAUTH CALLBACK — EXCHANGE CODE FOR TOKENS */
    router.get('/callback', async (req, res) => {
        const { code } = req.query;
        try {
            const { tokens } = await oauth2Client.getToken(code);
            console.log("Gmail Auth: Tokens received successfully.");
            // Store tokens (in-memory for now, persist in real DB)
            store.setGmailTokens(tokens);
            
            // Redirect back to the dashboard manage page
            res.send(`
                <html>
                    <body style="background: #0B0F14; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh;">
                        <div style="text-align: center; background: rgba(255,255,255,0.05); padding: 2rem; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);">
                            <h2 style="color: #22C55E;">✓ Authenticated!</h2>
                            <p>You can close this window now.</p>
                            <script>
                                setTimeout(() => window.close(), 2000);
                            </script>
                        </div>
                    </body>
                </html>
            `);
        } catch (error) {
            console.error('Google Auth Error:', error);
            res.status(500).send('Authentication failed');
        }
    });

    /** 📊 3. FETCH EMAILS VIA API */
    router.get('/emails', async (req, res) => {
        const tokens = store.getGmailTokens();
        
        if (!tokens) {
            console.log("Gmail Fetch: No tokens found in store.");
            return res.status(401).json({ error: 'NOT_AUTHENTICATED' });
        }

        try {
            oauth2Client.setCredentials(tokens);
            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

            console.log("Gmail Fetch: Fetching messages list...");
            const query = 'is:unread -category:social -category:promotions';
            
            const listRes = await gmail.users.messages.list({
                userId: 'me',
                maxResults: 20,
                q: query
            });

            if (!listRes.data.messages) {
                console.log("Gmail Fetch: No messages found matching query:", query);
                return res.json([]);
            }

            console.log(`Gmail Fetch Success: ${listRes.data.messages.length} messages found.`);
            const messages = listRes.data.messages;
            
            // 2. Fetch details for each message
            const emailDetails = await Promise.all(
                messages.map(async (msg) => {
                    try {
                        const detail = await gmail.users.messages.get({
                            userId: 'me',
                            id: msg.id
                        });

                        const headers = detail.data.payload.headers;
                        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
                        const fromRaw = headers.find(h => h.name === 'From')?.value || 'Unknown';
                        const dateRaw = headers.find(h => h.name === 'Date')?.value || '';

                        // Clean sender name (strip email)
                        const senderName = fromRaw.split('<')[0].trim() || fromRaw;
                        const sender = senderName.length > 20 ? senderName.substring(0, 20) + '...' : senderName;

                        return {
                            id: msg.id,
                            sender,
                            subject,
                            time: new Date(dateRaw).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            isUnread: detail.data.labelIds.includes('UNREAD'),
                            snippet: detail.data.snippet
                        };
                    } catch (e) {
                        console.error(`Gmail Individual Fetch Error [${msg.id}]:`, e);
                        return null;
                    }
                })
            );

            // Filter out any null results from individual fetch errors
            res.json(emailDetails.filter(email => email !== null));
        } catch (error) {
            console.error('Gmail API Main Fetch Error:', error);
            // Handle token expiry
            if (error.code === 401 || error.response?.data?.error === 'invalid_grant') {
                console.log("Gmail Fetch: Token expired or invalid, clearing local store.");
                store.setGmailTokens(null);
                return res.status(401).json({ error: 'TOKEN_EXPIRED' });
            }
            res.status(500).json({ error: 'Failed to fetch emails' });
        }
    });

    /** 🏁 4. CHECK STATUS */
    router.get('/status', (req, res) => {
        const hasTokens = !!store.getGmailTokens();
        res.json({ authenticated: hasTokens });
    });

    /** 🚪 5. DISCONNECT */
    router.post('/disconnect', (req, res) => {
        store.setGmailTokens(null);
        res.json({ status: 'success' });
    });

    return router;
};
