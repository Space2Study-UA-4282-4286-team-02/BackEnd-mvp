const locationService = require('~/services/location');

async function getCountries(req, res, next) {
  try {
    const countries = await locationService.getCountries();
    const mapped = (countries || []).map((c) => ({
      name: c.name,
      iso2: c.iso2,
      iso3: c.iso3,
      phone_code: c.phone_code ?? c.phonecode
    }));
    return res.status(200).json(mapped);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getCountries
};
