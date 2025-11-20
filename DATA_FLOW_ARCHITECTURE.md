# H2-OptiPlant Data Flow Architecture

## Overview

This document explains how data inputs (wind power, solar power, sensors, etc.) flow through the H2-OptiPlant system.

---

## Current Implementation (Demo/Simulation Mode)

### 1. **Simulated Data Generation**

Currently, the system uses **simulated data** for demonstration purposes. This is perfect for hackathons, testing, and development.

#### Backend Data Simulation

**Location**: `backend/main.py` - `/api/dashboard/stats` endpoint

```python
@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    # Simulate real-time data
    solar_input = random.uniform(500, 1000)  # kW - Random between 500-1000
    wind_input = random.uniform(200, 800)    # kW - Random between 200-800
    total_energy = solar_input + wind_input
    
    h2_production_rate = total_energy * 0.02  # Approx kg/hr based on efficiency
    efficiency = calculate_efficiency(total_energy, h2_production_rate)
    
    return {
        "solar_input_kw": round(solar_input, 2),
        "wind_input_kw": round(wind_input, 2),
        "total_energy_kw": round(total_energy, 2),
        "h2_production_rate_kg_hr": round(h2_production_rate, 2),
        "system_efficiency_percent": round(efficiency, 2),
        "storage_level_percent": round(random.uniform(40, 90), 1)
    }
```

**Why Simulation?**
- ✅ No hardware required for demo
- ✅ Consistent data for testing
- ✅ Easy to showcase different scenarios
- ✅ Perfect for hackathon presentations

### 2. **Data Flow Diagram (Current)**

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│                                                              │
│  Dashboard.jsx calls:                                        │
│  fetch('http://localhost:8000/api/dashboard/stats')         │
│                                                              │
│  Every 5 seconds (polling)                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP GET Request
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                         │
│                                                              │
│  main.py - get_dashboard_stats()                            │
│  ├─ Generates random solar_input (500-1000 kW)             │
│  ├─ Generates random wind_input (200-800 kW)               │
│  ├─ Calculates total_energy                                │
│  ├─ Calls thermo.calculate_efficiency()                    │
│  └─ Returns JSON response                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓ JSON Response
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│                                                              │
│  Updates state with new data                                 │
│  Re-renders charts and metrics                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Production Implementation (Real Sensors/IoT)

### 1. **Real Data Sources**

In a production environment, you would integrate with:

#### A. **Solar Power Monitoring**
- **Hardware**: Solar inverter with Modbus/RS485 interface
- **APIs**: SolarEdge API, Enphase API, Fronius Solar API
- **Protocols**: Modbus TCP, MQTT, REST API
- **Data**: Real-time kW output, voltage, current, irradiance

#### B. **Wind Power Monitoring**
- **Hardware**: Wind turbine SCADA system
- **APIs**: Vestas API, GE Wind API, Siemens Gamesa API
- **Protocols**: OPC UA, Modbus, DNP3
- **Data**: Real-time kW output, wind speed, rotor RPM

#### C. **Electrolyzer Sensors**
- **Pressure Sensors**: 4-20mA analog, 0-50 bar range
- **Temperature Sensors**: PT100 RTD, K-type thermocouples
- **Flow Meters**: Coriolis, ultrasonic, thermal mass
- **Gas Analyzers**: H₂ purity, O₂ content, moisture
- **Voltage/Current**: DC power monitoring

#### D. **Storage Tank Sensors**
- **Level Sensors**: Radar, ultrasonic, pressure transmitters
- **Pressure Sensors**: High-accuracy 0-350 bar
- **Temperature Sensors**: Multi-point RTDs
- **Leak Detectors**: Hydrogen-specific sensors (PPM level)

### 2. **Integration Architecture (Production)**

```
┌─────────────────────────────────────────────────────────────┐
│                    Physical Sensors                          │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Solar     │  │Wind      │  │Electrolyzer│ │Storage  │   │
│  │Inverter  │  │Turbine   │  │Sensors    │  │Tank     │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
         ↓              ↓              ↓              ↓
┌─────────────────────────────────────────────────────────────┐
│                    IoT Gateway / PLC                         │
│                                                              │
│  - Modbus TCP/RTU                                           │
│  - OPC UA Server                                            │
│  - MQTT Broker                                              │
│  - Data aggregation & buffering                             │
└─────────────────────────────────────────────────────────────┘
         ↓ MQTT / REST API / WebSocket
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                         │
│                                                              │
│  New Module: iot_connector.py                               │
│  ├─ MQTT subscriber                                         │
│  ├─ Modbus client                                           │
│  ├─ OPC UA client                                           │
│  ├─ Data validation & filtering                             │
│  └─ Real-time database writes                               │
└─────────────────────────────────────────────────────────────┘
         ↓ Database / Cache
┌─────────────────────────────────────────────────────────────┐
│                    Data Storage                              │
│                                                              │
│  - PostgreSQL (structured data)                             │
│  - TimescaleDB (time-series data)                           │
│  - Redis (real-time cache)                                  │
└─────────────────────────────────────────────────────────────┘
         ↓ API Queries
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│                                                              │
│  - WebSocket for real-time updates                          │
│  - REST API for historical data                             │
│  - Charts update automatically                              │
└─────────────────────────────────────────────────────────────┘
```

### 3. **Example: IoT Connector Module**

Here's how you would implement real sensor integration:

```python
# backend/modules/iot_connector.py

import paho.mqtt.client as mqtt
from pymodbus.client import ModbusTcpClient
import asyncio

class IoTConnector:
    """
    Connects to real sensors and data sources
    """
    
    def __init__(self):
        self.mqtt_client = None
        self.modbus_client = None
        self.latest_data = {
            'solar_kw': 0,
            'wind_kw': 0,
            'pressure_bar': 0,
            'temperature_c': 0,
            'h2_flow_kg_hr': 0,
            'storage_level_percent': 0
        }
    
    def connect_mqtt(self, broker_address="localhost", port=1883):
        """Connect to MQTT broker for real-time sensor data"""
        self.mqtt_client = mqtt.Client()
        self.mqtt_client.on_connect = self.on_mqtt_connect
        self.mqtt_client.on_message = self.on_mqtt_message
        self.mqtt_client.connect(broker_address, port)
        self.mqtt_client.loop_start()
    
    def on_mqtt_connect(self, client, userdata, flags, rc):
        """Subscribe to sensor topics on connection"""
        client.subscribe("plant/solar/power")
        client.subscribe("plant/wind/power")
        client.subscribe("plant/electrolyzer/pressure")
        client.subscribe("plant/electrolyzer/temperature")
        client.subscribe("plant/storage/level")
    
    def on_mqtt_message(self, client, userdata, msg):
        """Process incoming MQTT messages"""
        topic = msg.topic
        value = float(msg.payload.decode())
        
        if topic == "plant/solar/power":
            self.latest_data['solar_kw'] = value
        elif topic == "plant/wind/power":
            self.latest_data['wind_kw'] = value
        elif topic == "plant/electrolyzer/pressure":
            self.latest_data['pressure_bar'] = value
        elif topic == "plant/electrolyzer/temperature":
            self.latest_data['temperature_c'] = value
        elif topic == "plant/storage/level":
            self.latest_data['storage_level_percent'] = value
    
    def connect_modbus(self, host="192.168.1.100", port=502):
        """Connect to Modbus TCP device (e.g., PLC, inverter)"""
        self.modbus_client = ModbusTcpClient(host, port)
        self.modbus_client.connect()
    
    def read_modbus_registers(self):
        """Read data from Modbus holding registers"""
        if self.modbus_client and self.modbus_client.is_socket_open():
            # Example: Read solar power from register 0
            result = self.modbus_client.read_holding_registers(0, 1)
            if not result.isError():
                self.latest_data['solar_kw'] = result.registers[0] / 10.0
            
            # Example: Read wind power from register 1
            result = self.modbus_client.read_holding_registers(1, 1)
            if not result.isError():
                self.latest_data['wind_kw'] = result.registers[0] / 10.0
    
    def get_real_time_data(self):
        """Get latest sensor data"""
        # In production, this would return actual sensor readings
        return self.latest_data

# Global instance
iot_connector = IoTConnector()

def get_real_sensor_data():
    """Get data from real sensors"""
    return iot_connector.get_real_time_data()
```

### 4. **Modified API Endpoint (Production Mode)**

```python
# backend/main.py

from modules.iot_connector import get_real_sensor_data
import os

# Environment variable to switch between simulation and production
USE_REAL_SENSORS = os.getenv("USE_REAL_SENSORS", "false").lower() == "true"

@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    if USE_REAL_SENSORS:
        # Production mode - use real sensor data
        sensor_data = get_real_sensor_data()
        solar_input = sensor_data['solar_kw']
        wind_input = sensor_data['wind_kw']
        storage_level = sensor_data['storage_level_percent']
    else:
        # Demo mode - use simulated data
        solar_input = random.uniform(500, 1000)
        wind_input = random.uniform(200, 800)
        storage_level = random.uniform(40, 90)
    
    total_energy = solar_input + wind_input
    h2_production_rate = total_energy * 0.02
    efficiency = calculate_efficiency(total_energy, h2_production_rate)
    
    return {
        "solar_input_kw": round(solar_input, 2),
        "wind_input_kw": round(wind_input, 2),
        "total_energy_kw": round(total_energy, 2),
        "h2_production_rate_kg_hr": round(h2_production_rate, 2),
        "system_efficiency_percent": round(efficiency, 2),
        "storage_level_percent": round(storage_level, 1),
        "data_source": "real_sensors" if USE_REAL_SENSORS else "simulation"
    }
```

---

## Integration Options

### Option 1: **MQTT (Recommended for IoT)**

**Pros:**
- ✅ Lightweight protocol
- ✅ Publish/Subscribe pattern
- ✅ Real-time updates
- ✅ Works with most IoT devices

**Setup:**
```bash
# Install MQTT broker (Mosquitto)
# Windows: Download from mosquitto.org
# Linux: sudo apt-get install mosquitto

# Install Python MQTT client
pip install paho-mqtt

# Publish test data
mosquitto_pub -h localhost -t "plant/solar/power" -m "750.5"
```

### Option 2: **Modbus TCP/RTU**

**Pros:**
- ✅ Industry standard for PLCs
- ✅ Direct device communication
- ✅ Reliable and proven

**Setup:**
```bash
# Install Modbus library
pip install pymodbus

# Connect to Modbus device
from pymodbus.client import ModbusTcpClient
client = ModbusTcpClient('192.168.1.100', port=502)
```

### Option 3: **OPC UA**

**Pros:**
- ✅ Modern industrial protocol
- ✅ Secure communication
- ✅ Rich data modeling

**Setup:**
```bash
# Install OPC UA library
pip install opcua

# Connect to OPC UA server
from opcua import Client
client = Client("opc.tcp://192.168.1.100:4840")
```

### Option 4: **REST APIs (Cloud Services)**

**Pros:**
- ✅ Easy integration
- ✅ Cloud-based data
- ✅ Historical data access

**Examples:**
```python
# SolarEdge API
import requests

def get_solar_power():
    api_key = "YOUR_API_KEY"
    site_id = "YOUR_SITE_ID"
    url = f"https://monitoringapi.solaredge.com/site/{site_id}/currentPowerFlow"
    response = requests.get(url, params={"api_key": api_key})
    data = response.json()
    return data['siteCurrentPowerFlow']['PV']['currentPower']

# Weather API for wind data
def get_wind_speed():
    api_key = "YOUR_WEATHER_API_KEY"
    url = "https://api.openweathermap.org/data/2.5/weather"
    response = requests.get(url, params={
        "lat": 28.6139,  # Delhi
        "lon": 77.2090,
        "appid": api_key
    })
    data = response.json()
    return data['wind']['speed']
```

---

## Database Schema (Production)

### TimescaleDB (Time-Series Data)

```sql
CREATE TABLE sensor_readings (
    timestamp TIMESTAMPTZ NOT NULL,
    sensor_id VARCHAR(50) NOT NULL,
    sensor_type VARCHAR(50) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(20) NOT NULL,
    quality VARCHAR(20) DEFAULT 'GOOD'
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('sensor_readings', 'timestamp');

-- Example insert
INSERT INTO sensor_readings VALUES
    (NOW(), 'SOLAR_001', 'power', 750.5, 'kW', 'GOOD'),
    (NOW(), 'WIND_001', 'power', 450.2, 'kW', 'GOOD'),
    (NOW(), 'PRESS_001', 'pressure', 29.5, 'bar', 'GOOD');
```

---

## WebSocket for Real-Time Updates

### Backend WebSocket Server

```python
# backend/main.py

from fastapi import WebSocket
from typing import List

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/realtime")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Send real-time data every second
            data = get_dashboard_stats()
            await websocket.send_json(data)
            await asyncio.sleep(1)
    except:
        manager.disconnect(websocket)
```

### Frontend WebSocket Client

```javascript
// frontend/src/hooks/useWebSocket.js

import { useEffect, useState } from 'react';

export const useWebSocket = (url) => {
  const [data, setData] = useState(null);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    const websocket = new WebSocket(url);
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
    };
    
    websocket.onmessage = (event) => {
      const newData = JSON.parse(event.data);
      setData(newData);
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    setWs(websocket);
    
    return () => {
      websocket.close();
    };
  }, [url]);
  
  return data;
};

// Usage in component
const Dashboard = () => {
  const realtimeData = useWebSocket('ws://localhost:8000/ws/realtime');
  
  return (
    <div>
      <h1>Solar Power: {realtimeData?.solar_input_kw} kW</h1>
    </div>
  );
};
```

---

## Summary

### Current System (Demo Mode)
- ✅ **Simulated data** using `random.uniform()`
- ✅ **Polling** every 5 seconds via REST API
- ✅ **Perfect for hackathons** and demonstrations

### Production System (Real Sensors)
- 🔧 **IoT Connector** module for sensor integration
- 🔧 **MQTT/Modbus/OPC UA** protocols
- 🔧 **TimescaleDB** for time-series storage
- 🔧 **WebSocket** for real-time updates
- 🔧 **Environment variable** to switch modes

### To Enable Real Sensors
1. Install IoT libraries: `pip install paho-mqtt pymodbus opcua`
2. Configure sensor connections in `iot_connector.py`
3. Set environment variable: `USE_REAL_SENSORS=true`
4. Deploy IoT gateway/PLC for data collection
5. Update frontend to use WebSocket for real-time data

---

**Current Status**: ✅ Simulation mode (perfect for demo)  
**Production Ready**: 🔧 Architecture designed, easy to integrate real sensors
