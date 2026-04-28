const BASE_URL      = 'https://graph.responder.live/v2';
const CLIENT_ID     = '143';
const CLIENT_SECRET = '4oehPjI7ZJhOg6K9bP4zam0XTec147EfS9DSW2S0';
const USER_TOKEN    = 'a208b32e03c8e0a756cfbab7b4dc84c549628ab3fd0f9c4d98c60e7976a9ce95';
const LIST_ID       = 97929; // רשימת אבחון

let cachedToken = null;
let tokenExpiry  = 0;

async function getToken() {
  if (cachedToken && Date.now() / 1000 < tokenExpiry - 300) return cachedToken;
  const res = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      user_token: USER_TOKEN,
      grant_type: 'client_credentials',
    }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('Auth failed: ' + JSON.stringify(data));
  cachedToken = data.token;
  tokenExpiry  = data.expire;
  return cachedToken;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, full_name } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });

    const parts = (full_name || '').trim().split(' ');
    const first = parts[0] || '';
    const last  = parts.slice(1).join(' ');

    const token = await getToken();
    const rmRes = await fetch(`${BASE_URL}/subscribers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        list_ids: [LIST_ID],
        first,
        last,
        override: true,
        rejoin: true,
      }),
    });

    const rmData = await rmRes.json();
    if (!rmData.status) throw new Error(JSON.stringify(rmData));
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('subscribe error:', err);
    return res.status(500).json({ error: err.message });
  }
}
