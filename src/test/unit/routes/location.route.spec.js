const request = require('supertest');
const express = require('express');

describe('GET /locations/countries', () => {
  let app;
  let locationService;
  let locationRoutes;

  beforeEach(() => {
    jest.resetModules();    

    locationService = require('~/services/location');
    jest.spyOn(locationService, 'getCountries');

    locationRoutes = require('~/routes/location');

    app = express();
    app.use(express.json());
    app.use('/locations', locationRoutes);

    app.use((err, req, res, next) => {
      res.status(err.status || 500).json({ message: err.message });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns mapped countries (including phone_code)', async () => {
    locationService.getCountries.mockResolvedValue([
      { name: 'Ukraine', iso2: 'UA', iso3: 'UKR', phone_code: '+380' }
    ]);

    const res = await request(app).get('/locations/countries').expect(200);

    expect(res.body).toEqual([
      { name: 'Ukraine', iso2: 'UA', iso3: 'UKR', phone_code: '+380' }
    ]);
  });

  it('returns error when service throws', async () => {
    locationService.getCountries.mockRejectedValue(new Error('service failure'));

    const res = await request(app).get('/locations/countries').expect(500);

    expect(res.body).toHaveProperty('message', 'service failure');
  });
});
