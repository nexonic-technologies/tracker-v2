import express from 'express';
import { Country, State, City } from 'country-state-city';

const router = express.Router();

// Get all countries
router.get('/countries', (req, res) => {
  try {
    const countries = Country.getAllCountries().map(country => ({
      _id: country.isoCode,
      name: country.name,
      code: country.isoCode
    }));
    
    res.json({
      success: true,
      data: countries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch countries'
    });
  }
});

// Get states by country
router.get('/states/:countryId', (req, res) => {
  try {
    const { countryId } = req.params;
    const states = State.getStatesOfCountry(countryId).map(state => ({
      _id: state.isoCode,
      name: state.name,
      code: state.isoCode,
      countryCode: state.countryCode
    }));
    
    res.json({
      success: true,
      data: states
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch states'
    });
  }
});

// Get cities by state
router.get('/cities/:stateId', (req, res) => {
  try {
    const { stateId } = req.params;
    const { countryCode } = req.query;
    
    const cities = City.getCitiesOfState(countryCode, stateId).map(city => ({
      _id: city.name,
      name: city.name,
      stateCode: city.stateCode,
      countryCode: city.countryCode
    }));
    
    res.json({
      success: true,
      data: cities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cities'
    });
  }
});

export default router;