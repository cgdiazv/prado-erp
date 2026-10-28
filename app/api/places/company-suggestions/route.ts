import { NextResponse } from 'next/server';

const AUTOCOMPLETE_ENDPOINT = 'https://places.googleapis.com/v1/places:autocomplete';

function getApiKey() {
  return (
    process.env.GOOGLE_MAPS_SERVER_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ''
  );
}

function getRefererHeader(req: Request) {
  const incomingReferer = req.headers.get('referer');
  if (incomingReferer) return incomingReferer;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000/';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim() || '';

  if (!query || query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const response = await fetch(AUTOCOMPLETE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'Referer': getRefererHeader(request),
        'X-Goog-FieldMask':
          'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text',
      },
      body: JSON.stringify({
        input: query,
      }),
    });

    if (!response.ok) {
      console.warn('Google Places autocomplete response status:', response.status);
      return NextResponse.json({ suggestions: [] });
    }

    const data = await response.json();
    const suggestions = (data?.suggestions || [])
      .map((item: any) => {
        const pred = item?.placePrediction;
        const mainText = pred?.structuredFormat?.mainText?.text || '';
        const secondaryText = pred?.structuredFormat?.secondaryText?.text || '';
        const fullText = pred?.text?.text || mainText;
        return {
          placeId: pred?.placeId || '',
          name: mainText || fullText,
          address: secondaryText,
          fullText: fullText,
        };
      })
      .filter((s: { name: string }) => Boolean(s.name))
      .slice(0, 6);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Company suggestion lookup error:', error);
    return NextResponse.json({ suggestions: [] });
  }
}
