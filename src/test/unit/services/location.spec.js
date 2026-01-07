process.env.CSC_API_KEY = 'test-key';

jest.resetModules();

const mockFetch = jest.fn();

jest.mock('node-fetch', () => {
  const actual = jest.requireActual('node-fetch');

  return Object.assign(mockFetch, {
    Response: actual.Response
  });
});

const fetch = require('node-fetch');
const { Response } = fetch;

describe('location service - countries only', () => {
  let locationService;

  beforeEach(() => {
    jest.resetModules();
    mockFetch.mockReset();
    locationService = require('~/services/location');
  });

  it('getCountries returns parsed JSON (incl. phone_code)', async () => {
    const fake = [
      { name: 'Ukraine', iso2: 'UA', iso3: 'UKR', phone_code: '+380' }
    ];

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(fake), { status: 200 })
    );

    const res = await locationService.getCountries();
    expect(res).toEqual(fake);
  });

  it('getCountries throws when fetch rejects', async () => {
    mockFetch.mockRejectedValue(new Error('network fail'));

    await expect(locationService.getCountries())
      .rejects.toThrow('Failed to connect to location provider');
  });

  it('getCountries throws on invalid JSON', async () => {
    mockFetch.mockResolvedValue(
      new Response('not-json', { status: 200 })
    );

    await expect(locationService.getCountries())
      .rejects.toThrow('Invalid JSON from location provider');
  });

  it('getCountries uses cache on subsequent calls', async () => {
    const fake = [
      { name: 'Cached', iso2: 'CC', iso3: 'CCC', phone_code: '+999' }
    ];

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(fake), { status: 200 })
    );

    const first = await locationService.getCountries();
    const second = await locationService.getCountries();

    expect(first).toEqual(fake);
    expect(second).toEqual(fake);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
