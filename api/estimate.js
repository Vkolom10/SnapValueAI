// Vercel serverless function — keeps the Anthropic API key server-side.
// Deployed automatically by Vercel because it lives in /api.
// Set ANTHROPIC_API_KEY in Vercel → Project → Settings → Environment Variables.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, mediaType } = req.body || {};
  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  const prompt = `You are looking at a photo of a single item someone might sell secondhand (garage sale, Facebook Marketplace, eBay, Craigslist).

Identify the item and estimate its resale value based on your general knowledge of secondhand markets (you do not have live sold-listing data, so give a realistic range based on typical resale prices for this kind of item in the condition shown).

Respond with ONLY a JSON object, no markdown fences, no extra text, in exactly this shape:
{
  "name": "short item name, e.g. 'KitchenAid Artisan Stand Mixer'",
  "category": "one short category word, e.g. 'Kitchen', 'Electronics', 'Tools', 'Fashion', 'Home Decor'",
  "condition": "one of: Poor, Fair, OK, Good, Excellent",
  "referencePrices": [ { "platform": "eBay", "price": 120 }, { "platform": "Facebook", "price": 95 } ],
  "low": <integer, conservative low price in USD>,
  "good": <integer, realistic price in USD>,
  "best": <integer, optimistic best-case price in USD>,
  "platform": "one of: eBay, Facebook, Craigslist, Mercari",
  "confidence": <integer 0-100, how confident you are in the identification>,
  "notes": "one short sentence on condition/flaws visible, or what would raise the price"
}

For referencePrices: give up to 3 entries, each a different platform (eBay, Facebook, Craigslist, or Mercari), sorted highest price first. These are your own estimates for what it would likely go for on that platform — not verified sold listings.

If you genuinely cannot identify the item well enough to price it (too blurry, too generic, no clear item), instead respond with:
{ "needsInfo": true, "notes": "short reason, e.g. 'Photo too blurry to identify' or 'Need a closer shot of the label/model number'" }`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType || 'image/jpeg',
                  data: imageBase64,
                },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', errText);
      return res.status(502).json({ error: 'AI request failed' });
    }

    const data = await response.json();
    const text = data.content?.map((b) => b.text || '').join('') || '';
    const clean = text.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      console.error('Failed to parse AI response:', text);
      return res.status(502).json({ error: 'Could not parse AI response' });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Estimate function error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
