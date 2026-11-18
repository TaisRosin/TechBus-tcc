import { GoogleMaps } from '../../src/maps/google-maps';

describe('Google Maps adapter', () => {
  const location = {
    address: 'Praça',
    placeId: 'first',
    lat: -26,
    lng: -52,
    approximate: false,
  };
  it('preserves waypoint order and requests only route display fields', async () => {
    const request = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            routes: [
              {
                distanceMeters: 1400,
                duration: '150s',
                polyline: { encodedPolyline: 'encoded' },
              },
            ],
          }),
        ),
      );
    const maps = new GoogleMaps('private-test', request);
    expect(
      await maps.route([
        location,
        { ...location, placeId: 'middle' },
        { ...location, placeId: 'last' },
      ]),
    ).toEqual({
      distanceMeters: 1400,
      durationSeconds: 150,
      polyline: 'encoded',
    });
    const options = request.mock.calls[0][1]!;
    expect(JSON.parse(options.body as string)).toMatchObject({
      origin: { placeId: 'first' },
      intermediates: [{ placeId: 'middle' }],
      destination: { placeId: 'last' },
      optimizeWaypointOrder: false,
      routingPreference: 'TRAFFIC_UNAWARE',
    });
  });
  it('marks approximate geocodes and returns no candidate for an unknown address', async () => {
    const request = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'OK',
            results: [
              {
                formatted_address: 'Praça',
                place_id: 'first',
                partial_match: true,
                geometry: {
                  location: { lat: -26, lng: -52 },
                  location_type: 'APPROXIMATE',
                },
              },
            ],
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'ZERO_RESULTS' })),
      );
    const maps = new GoogleMaps('private-test', request);
    expect(await maps.geocode('Praça')).toEqual([
      { ...location, approximate: true },
    ]);
    expect(await maps.geocode('Desconhecido')).toEqual([]);
  });
  it('sanitizes provider failures and refuses calls without a key', async () => {
    const request = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockRejectedValue(new Error('url with private-test'));
    await expect(
      new GoogleMaps('private-test', request).geocode('Praça'),
    ).rejects.toMatchObject({ code: 'MAPS_UNAVAILABLE' });
    request.mockClear();
    await expect(
      new GoogleMaps(undefined, request).geocode('Praça'),
    ).rejects.toMatchObject({ code: 'MAPS_UNCONFIGURED' });
    expect(request).not.toHaveBeenCalled();
  });
});
