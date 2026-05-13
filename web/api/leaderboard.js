import { createClient } from 'redis';

export default async function handler(req, res) {
    const REDIS_URL = process.env.REDIS_URL;

    if (!REDIS_URL) {
        return res.status(500).json({ error: 'Redis database not configured. Missing REDIS_URL.' });
    }

    const client = createClient({
        url: REDIS_URL
    });

    client.on('error', (err) => console.log('Redis Client Error', err));

    try {
        await client.connect();
    } catch(e) {
        return res.status(500).json({ error: 'Failed to connect to Redis' });
    }

    const key = 'papelio_global_leaderboard';

    if (req.method === 'GET') {
        let raw = await client.get(key);
        await client.disconnect();
        
        let scores = [];
        if (raw) {
            try { scores = JSON.parse(raw); } catch (e) { scores = []; }
        }
        return res.status(200).json(scores);
    }

    if (req.method === 'POST') {
        const payload = req.body;
        
        if (!payload || typeof payload.score === 'undefined') {
            await client.disconnect();
            return res.status(400).json({ error: 'Invalid payload' });
        }

        let raw = await client.get(key);
        let scores = [];
        if (raw) {
            try { scores = JSON.parse(raw); } catch (e) { scores = []; }
        }
        
        scores.push(payload);
        
        // Sort by Highest Score DESC, then Lowest Time ASC
        scores.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.timeMs - b.timeMs;
        });
        
        // Keep top 100
        if (scores.length > 100) scores = scores.slice(0, 100);
        
        await client.set(key, JSON.stringify(scores));
        await client.disconnect();
        
        return res.status(200).json({ success: true });
    }

    await client.disconnect();
    return res.status(405).json({ error: 'Method not allowed' });
}
