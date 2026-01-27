const express = require('express');
const router = express.Router();
const controller = require('~/controllers/location');

router.get('/countries', controller.getCountries);
router.get('/cities/:countryCode', controller.getCities);
module.exports = router;
