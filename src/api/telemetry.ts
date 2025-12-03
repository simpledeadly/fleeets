// api/telemetry.js
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed')
  }

  const targetUrl = 'https://us.i.posthog.com' + req.url.replace('/api/telemetry', '')

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    })

    const data = await response.json()
    res.status(response.status).json(data)
  } catch (error) {
    res.status(500).send('Proxy error')
  }
}
