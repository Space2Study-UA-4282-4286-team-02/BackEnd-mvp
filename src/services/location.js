const fetch = require('node-fetch');
const createError = require('http-errors');
const { config } = require('~/configs/config');
const { CSC_API_KEY, CSC_BASE_URL } = config;

const cache = {
  countries: { ts: 0, data: null }
};
const TTL_MS = 1000 * 60 * 60; 

const buildUrl = (path) =>
  `${(CSC_BASE_URL || 'https://api.countrystatecity.in/v1').replace(/\/$/, '')}${path}`;

async function fetchFromCsc(path) {
  if (!CSC_API_KEY) {
    throw createError(401, 'CSC API key is not configured');
  }

  const url = buildUrl(path);
  const headers = {
    'X-CSCAPI-KEY': CSC_API_KEY,
    Accept: 'application/json'
  };

  let res;
  try {
    res = await fetch(url, { headers, timeout: 7000 });
  } catch (err) {
    console.error('Failed to connect to location provider:', err);
    const e = createError(502, 'Failed to connect to location provider');
    e.cause = err;
    throw e;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`Location provider returned ${res.status}: ${text}`);
    throw createError(502, `Location provider returned ${res.status}: ${text}`);
  }

  try {
    return await res.json();
  } catch (err) {
    console.error('Invalid JSON from location provider:', err);
    throw createError(502, 'Invalid JSON from location provider');
  }
}

async function getCountries() {
  if (cache.countries.data && Date.now() - cache.countries.ts < TTL_MS) {
    return cache.countries.data;
  }

  const data = await fetchFromCsc('/countries');
  cache.countries = { ts: Date.now(), data };
  return data;
}

module.exports = {
  getCountries
};
