export default async function handler(req, res) {
    const KV_REST_API_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
        return res.status(500).json({ error: 'KV database not configured. Please link Upstash Redis in the dashboard.' });
    }

    const key = 'papelio_global_leaderboard';

    if (req.method === 'GET') {
        try {
            const response = await fetch(`${KV_REST_API_URL}/get/${key}`, {
                headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
            });
            const data = await response.json();
            const scores = data.result ? JSON.parse(data.result) : [];
            return res.status(200).json(scores);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }
    } 
    else if (req.method === 'POST') {
        try {
            const newScore = req.body;
            
            // Fetch current leaderboard
            const getResponse = await fetch(`${KV_REST_API_URL}/get/${key}`, {
                headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
            });
            const getData = await getResponse.json();
            let scores = getData.result ? JSON.parse(getData.result) : [];
            
            scores.push(newScore);
            
            // Sort by Highest Score DESC, then Lowest Time ASC
            scores.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.timeMs - b.timeMs;
            });
            
            // Keep top 100
            if (scores.length > 100) scores = scores.slice(0, 100);
            
            // Save updated leaderboard back to KV
            await fetch(`${KV_REST_API_URL}/set/${key}`, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${KV_REST_API_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(JSON.stringify(scores))
            });
            
            return res.status(200).json(scores);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Failed to update leaderboard' });
        }
    }
    
    res.status(405).json({ error: 'Method not allowed' });
}
