# Real-Time Weather API Integration Guide

## ✅ Successfully Integrated!

Your H2-OptiPlant system now uses **real-time weather data** from OpenWeatherMap API to calculate accurate solar and wind power generation.

---

## How It Works

### 1. **Weather Data Source**
- **API**: OpenWeatherMap (Free tier - 1000 calls/day)
- **Location**: Delhi, India (28.6139°N, 77.2090°E)
- **Update Frequency**: Every API call (cached for 10 minutes)

### 2. **Solar Power Calculation**
The system calculates solar power based on:

```python
Solar Power = Panel Capacity × Time Factor × Cloud Factor × Temperature Factor
```

**Factors:**
- **Time of Day**: Peak at 11 AM - 2 PM (100%), reduced at dawn/dusk
- **Cloud Cover**: 0-100% clouds reduce output proportionally
- **Temperature**: Panels lose 0.4% efficiency per °C above 25°C
- **Panel Capacity**: 1000 kW (1 MW solar array)

**Example:**
- Clear day at noon: ~900-1000 kW
- Cloudy day: ~400-600 kW
- Night time: 0 kW

### 3. **Wind Power Calculation**
Uses real wind turbine power curve:

```python
Wind Power = f(wind_speed)
```

**Power Curve:**
- **Cut-in speed**: 3 m/s (turbine starts)
- **Rated speed**: 12 m/s (full power - 800 kW)
- **Cut-out speed**: 25 m/s (safety shutdown)
- **Relationship**: Cubic between cut-in and rated speed

**Example:**
- 5 m/s wind: ~150 kW
- 10 m/s wind: ~600 kW
- 15 m/s wind: 800 kW (max)

### 4. **Additional Weather Data**
The API also provides:
- ✅ Temperature (°C)
- ✅ Humidity (%)
- ✅ Atmospheric pressure (hPa)
- ✅ Wind speed (m/s)
- ✅ Cloud cover (%)
- ✅ Weather condition (Clear, Clouds, Rain, etc.)

---

## API Response Example

```json
{
  "solar_input_kw": 785.43,
  "wind_input_kw": 456.78,
  "total_energy_kw": 1242.21,
  "h2_production_rate_kg_hr": 24.84,
  "system_efficiency_percent": 66.7,
  "storage_level_percent": 72.3,
  "data_source": "OpenWeatherMap API",
  "weather": {
    "temperature_c": 28.5,
    "humidity_percent": 45,
    "wind_speed_ms": 6.2,
    "cloud_cover_percent": 20,
    "weather_condition": "Clear",
    "location": "Delhi"
  }
}
```

---

## Configuration

### Change Location
Edit `backend/modules/weather_api.py`:

```python
# For Mumbai
weather_provider.location = {
    'lat': 19.0760,
    'lon': 72.8777,
    'city': 'Mumbai'
}

# For Bangalore
weather_provider.location = {
    'lat': 12.9716,
    'lon': 77.5946,
    'city': 'Bangalore'
}
```

### Toggle Real/Simulated Data
Set environment variable:

```bash
# Use real weather data (default)
set USE_REAL_WEATHER=true

# Use simulated data
set USE_REAL_WEATHER=false
```

### Get Your Own API Key
1. Sign up at https://openweathermap.org/api
2. Get free API key (1000 calls/day)
3. Update in `weather_api.py`:
   ```python
   self.api_key = "YOUR_API_KEY_HERE"
   ```

---

## Benefits for Hackathon

### 1. **Real-World Accuracy**
- Actual weather conditions affect power generation
- Demonstrates understanding of renewable energy variability
- Shows realistic plant operation

### 2. **Live Demonstration**
- Data changes based on actual weather
- Different times of day show different outputs
- Judges can see real-time updates

### 3. **Professional Implementation**
- Industry-standard API integration
- Proper error handling (fallback to simulation)
- Caching to avoid rate limits

### 4. **Scalability**
- Easy to add more locations
- Can integrate multiple weather services
- Ready for production deployment

---

## Testing

### Test Real-Time Data
```bash
# Check current weather
curl "http://localhost:8000/api/dashboard/stats"

# Response will show:
# - Real solar/wind power based on Delhi weather
# - Current weather conditions
# - Data source confirmation
```

### Verify Weather Integration
```python
# In Python console
from modules.weather_api import get_real_time_energy_data

data = get_real_time_energy_data()
print(f"Solar: {data['solar_kw']} kW")
print(f"Wind: {data['wind_kw']} kW")
print(f"Weather: {data['weather_condition']}")
print(f"Location: {data['location']}")
```

---

## Fallback Mechanism

If the weather API is unavailable:
- ✅ System automatically falls back to simulation
- ✅ No errors or crashes
- ✅ `data_source` field indicates "Simulation (API unavailable)"
- ✅ Seamless user experience

---

## Advanced Features (Future)

### 1. **Historical Weather Data**
- Analyze past performance
- Seasonal patterns
- Capacity factor calculations

### 2. **Weather Forecasting**
- 7-day power generation forecast
- Maintenance scheduling
- Production planning

### 3. **Multiple Locations**
- Multi-plant monitoring
- Geographic diversification
- Portfolio optimization

### 4. **Additional APIs**
- Solar irradiance data (SolarAnywhere, PVGIS)
- Wind forecasting (Windy API)
- Air quality (for panel soiling)

---

## Current Status

✅ **Real-time weather integration active**
✅ **Solar power calculation based on actual conditions**
✅ **Wind power calculation based on real wind speed**
✅ **Automatic fallback to simulation if API fails**
✅ **Weather information displayed in dashboard**

---

## Impact on Demo

Your hackathon demo now shows:
- 🌞 **Real solar power** varying with time of day and clouds
- 💨 **Real wind power** based on actual wind conditions
- 🌡️ **Live weather data** from Delhi
- 📊 **Accurate H₂ production** based on real renewable energy
- 🎯 **Professional-grade** API integration

This makes your project stand out as a **production-ready solution** rather than just a simulation!

---

**Last Updated**: November 20, 2025  
**API Provider**: OpenWeatherMap  
**Status**: ✅ Active and Operational
