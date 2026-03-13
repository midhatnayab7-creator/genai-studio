const HORDE_API = 'https://stablehorde.net/api/v2';
const API_KEY = '0000000000'; // free anonymous key

export async function POST({ request }) {
  const { prompt } = await request.json();

  if (!prompt) {
    return Response.json({ error: 'No prompt provided' }, { status: 400 });
  }

  try {
    // Step 1: Submit generation job
    const submitRes = await fetch(`${HORDE_API}/generate/async`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY
      },
      body: JSON.stringify({
        prompt,
        params: {
          width: 512,
          height: 512,
          steps: 25,
          n: 2,
          sampler_name: 'k_euler_a',
          cfg_scale: 7.5
        },
        nsfw: false,
        censor_nsfw: true,
        models: ['stable_diffusion']
      })
    });

    const { id } = await submitRes.json();
    if (!id) return Response.json({ error: 'Failed to start generation' }, { status: 500 });

    // Step 2: Poll until done (max 2 minutes)
    let attempts = 0;
    while (attempts < 24) {
      await new Promise(r => setTimeout(r, 5000));
      attempts++;

      const checkRes = await fetch(`${HORDE_API}/generate/check/${id}`, {
        headers: { 'apikey': API_KEY }
      });
      const status = await checkRes.json();

      if (status.done) {
        // Step 3: Fetch the result
        const resultRes = await fetch(`${HORDE_API}/generate/status/${id}`, {
          headers: { 'apikey': API_KEY }
        });
        const result = await resultRes.json();
        const images = result.generations?.map(g => `data:image/webp;base64,${g.img}`) || [];

        if (images.length === 0) {
          return Response.json({ error: 'No images generated' }, { status: 500 });
        }

        return Response.json({ images });
      }

      if (status.faulted) {
        return Response.json({ error: 'Generation failed on server' }, { status: 500 });
      }
    }

    return Response.json({ error: 'Timed out — servers are busy, try again' }, { status: 408 });
  } catch (err) {
    return Response.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
