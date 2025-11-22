"""
Database Seeding Script
Generates comprehensive dummy data for H2-OptiPlant demonstration
"""

import asyncio
import random
from datetime import datetime, timedelta
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from modules.database import *
from modules.auth import hash_password

# ========================================
# PLANT DATA
# ========================================

PLANTS = [
    {
        "plant_id": "H2P-001",
        "name": "Delhi Solar-Wind Plant",
        "location": {"city": "New Delhi", "state": "Delhi", "lat": 28.6139, "lng": 77.2090},
        "capacity_kg_per_day": 500,
        "energy_sources": ["solar", "wind"],
        "solar_capacity_kw": 1200,
        "wind_capacity_kw": 800,
        "electrolyzer_type": "PEM",
        "operational_since": "2022-06-15",
        "efficiency_percent": 68,
        "uptime_percent": 92,
        "machine_count": 12,
        "labor_count": 25,
        "cost_efficiency_score": 0.75,
        "energy_score": 0.85,
        "price_per_kg": 5.20,
        "current_capacity_available": random.uniform(200, 450)
    },
    {
        "plant_id": "H2P-002",
        "name": "Mumbai Hydro Plant",
        "location": {"city": "Mumbai", "state": "Maharashtra", "lat": 19.0760, "lng": 72.8777},
        "capacity_kg_per_day": 600,
        "energy_sources": ["hydro", "solar"],
        "solar_capacity_kw": 800,
        "wind_capacity_kw": 0,
        "electrolyzer_type": "Alkaline",
        "operational_since": "2021-03-10",
        "efficiency_percent": 71,
        "uptime_percent": 88,
        "machine_count": 15,
        "labor_count": 30,
        "cost_efficiency_score": 0.82,
        "energy_score": 0.90,
        "price_per_kg": 4.95,
        "current_capacity_available": random.uniform(250, 550)
    },
    {
        "plant_id": "H2P-003",
        "name": "Bangalore Wind Farm",
        "location": {"city": "Bangalore", "state": "Karnataka", "lat": 12.9716, "lng": 77.5946},
        "capacity_kg_per_day": 450,
        "energy_sources": ["wind", "solar"],
        "solar_capacity_kw": 600,
        "wind_capacity_kw": 1000,
        "electrolyzer_type": "PEM",
        "operational_since": "2023-01-20",
        "efficiency_percent": 65,
        "uptime_percent": 95,
        "machine_count": 10,
        "labor_count": 20,
        "cost_efficiency_score": 0.70,
        "energy_score": 0.88,
        "price_per_kg": 5.40,
        "current_capacity_available": random.uniform(180, 400)
    },
    {
        "plant_id": "H2P-004",
        "name": "Chennai Coastal Plant",
        "location": {"city": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lng": 80.2707},
        "capacity_kg_per_day": 550,
        "energy_sources": ["solar", "wind"],
        "solar_capacity_kw": 1000,
        "wind_capacity_kw": 700,
        "electrolyzer_type": "PEM",
        "operational_since": "2022-09-05",
        "efficiency_percent": 69,
        "uptime_percent": 90,
        "machine_count": 14,
        "labor_count": 28,
        "cost_efficiency_score": 0.78,
        "energy_score": 0.87,
        "price_per_kg": 5.10,
        "current_capacity_available": random.uniform(220, 500)
    },
    {
        "plant_id": "H2P-005",
        "name": "Rajasthan Solar Hub",
        "location": {"city": "Jaipur", "state": "Rajasthan", "lat": 26.9124, "lng": 75.7873},
        "capacity_kg_per_day": 700,
        "energy_sources": ["solar"],
        "solar_capacity_kw": 1500,
        "wind_capacity_kw": 0,
        "electrolyzer_type": "Alkaline",
        "operational_since": "2021-11-18",
        "efficiency_percent": 73,
        "uptime_percent": 94,
        "machine_count": 18,
        "labor_count": 35,
        "cost_efficiency_score": 0.85,
        "energy_score": 0.92,
        "price_per_kg": 4.80,
        "current_capacity_available": random.uniform(300, 650)
    }
]

# ========================================
# USER DATA
# ========================================

def generate_users():
    """Generate admin and customer users"""
    users = []
    
    # Admin users
    admin_users = [
        {"name": "Admin Kumar", "email": "admin@h2optiplant.com", "role": "admin"},
        {"name": "Operations Manager", "email": "ops@h2optiplant.com", "role": "admin"},
        {"name": "Plant Supervisor", "email": "supervisor@h2optiplant.com", "role": "admin"}
    ]
    
    for admin in admin_users:
        users.append({
            "name": admin["name"],
            "email": admin["email"],
            "password": hash_password("admin123"),  # Default password
            "role": "admin",
            "phone": f"+91-{random.randint(7000000000, 9999999999)}",
            "department": random.choice(["Operations", "Management", "Technical"]),
            "permissions": ["read", "write", "delete", "manage_users"]
        })
    
    # Customer users
    customer_names = [
        "Rajesh Sharma", "Priya Patel", "Amit Singh", "Sneha Reddy", "Vikram Mehta",
        "Anita Desai", "Rohan Gupta", "Kavita Nair", "Sanjay Joshi", "Deepa Kumar"
    ]
    
    industries = ["Transportation", "Manufacturing", "Energy", "Chemical", "Steel"]
    
    for i, name in enumerate(customer_names):
        email = name.lower().replace(" ", ".") + "@company.com"
        users.append({
            "name": name,
            "email": email,
            "password": hash_password("customer123"),  # Default password
            "role": "customer",
            "phone": f"+91-{random.randint(7000000000, 9999999999)}",
            "company": f"{name.split()[1]} Industries",
            "industry": random.choice(industries),
            "address": f"Address {i+1}, {random.choice(['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Pune'])}",
            "gst_number": f"29ABCDE{random.randint(1000, 9999)}F1Z{random.randint(1, 9)}"
        })
    
    return users

# ========================================
# STORAGE CONTAINERS
# ========================================

def generate_storage_containers():
    """Generate storage container data"""
    containers = []
    
    for plant in PLANTS:
        num_containers = random.randint(2, 4)
        
        for i in range(num_containers):
            container_id = f"{plant['plant_id']}-TANK-{i+1:02d}"
            
            containers.append({
                "container_id": container_id,
                "plant_id": plant['plant_id'],
                "type": random.choice(["Cryogenic", "Compressed Gas", "High-Pressure"]),
                "capacity_kg": random.choice([1000, 1500, 2000]),
                "fill_level_percent": random.uniform(30, 85),
                "pressure_bar": random.uniform(20, 30),
                "temperature_c": random.uniform(15, 35),
                "leak_ppm": random.uniform(5, 50),
                "health_score": random.uniform(75, 98),
                "age_years": random.uniform(1, 5),
                "pressure_cycles": random.randint(500, 3000),
                "last_maintenance": (datetime.utcnow() - timedelta(days=random.randint(10, 365))).isoformat(),
                "volume_m3": random.choice([100, 150, 200]),
                "flow_rate_kg_hr": random.uniform(30, 80),
                "vibration_level": random.uniform(0.1, 0.7),
                "humidity_percent": random.uniform(30, 70),
                "days_since_maintenance": random.randint(10, 180)
            })
    
    return containers

# ========================================
# FLEET VEHICLES
# ========================================

def generate_fleet_vehicles():
    """Generate fleet vehicle data"""
    vehicles = []
    
    for i in range(10):
        vehicle_id = f"HV-{i+1:03d}"
        
        # Random plant assignment
        assigned_plant = random.choice(PLANTS)
        
        vehicles.append({
            "vehicle_id": vehicle_id,
            "type": "Hydrogen Trailer",
            "capacity_kg": 500,
            "current_load_kg": random.uniform(0, 450),
            "status": random.choice(["in_transit", "loading", "idle", "maintenance"]),
            "driver_name": f"Driver {random.choice(['Kumar', 'Patel', 'Singh', 'Sharma', 'Reddy'])}",
            "driver_license": f"DL-{random.randint(100000, 999999)}",
            "current_location": {
                "lat": assigned_plant['location']['lat'] + random.uniform(-0.5, 0.5),
                "lng": assigned_plant['location']['lng'] + random.uniform(-0.5, 0.5),
                "address": f"En route to {random.choice(['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Pune'])}"
            },
            "assigned_plant": assigned_plant['plant_id'],
            "speed_kmh": random.uniform(40, 75) if random.random() > 0.3 else 0,
            "fuel_level_percent": random.uniform(40, 95),
            "next_maintenance_km": random.randint(500, 5000),
            "total_distance_km": random.randint(10000, 100000),
            "registration": f"DL-{random.randint(10, 99)}-ABC-{random.randint(1000, 9999)}"
        })
    
    return vehicles

# ========================================
# ORDERS
# ========================================

def generate_orders(customers: List[Dict]):
    """Generate customer orders"""
    orders = []
    
    statuses = ["pending", "confirmed", "in_transit", "delivered", "cancelled"]
    quantities = [10, 25, 50, 100, 200]
    
    for i in range(50):
        customer = random.choice(customers)
        quantity = random.choice(quantities)
        plant = random.choice(PLANTS)
        status = random.choice(statuses)
        
        created_date = datetime.utcnow() - timedelta(days=random.randint(1, 90))
        
        order = {
            "order_id": f"ORD-{i+1:05d}",
            "customer_id": customer.get('_id', f"CUST-{random.randint(1, 100)}"),
            "customer_name": customer['name'],
            "customer_email": customer['email'],
            "quantity_kg": quantity,
            "unit_price_usd": plant['price_per_kg'],
            "total_price_usd": quantity * plant['price_per_kg'],
            "status": status,
            "assigned_plant_id": plant['plant_id'],
            "assigned_plant_name": plant['name'],
            "delivery_location": customer.get('address', "Customer Address"),
            "delivery_date": (created_date + timedelta(days=random.randint(2, 10))).isoformat(),
            "priority_level": random.choice([0.3, 0.5, 0.7, 0.9]),
            "payment_status": "paid" if status in ["in_transit", "delivered"] else "pending",
            "certification_id": f"CERT-{random.randint(10000, 99999)}" if status == "delivered" else None
        }
        
        orders.append(order)
    
    return orders

# ========================================
# PRODUCTION HISTORY
# ========================================

def generate_production_history():
    """Generate 30 days of production history"""
    history = []
    
    for plant in PLANTS:
        for day_offset in range(30, 0, -1):
            date = datetime.utcnow() - timedelta(days=day_offset)
            
            # Simulate realistic production with trends
            base_production = plant['capacity_kg_per_day'] * random.uniform(0.7, 0.95)
            
            record = {
                "plant_id": plant['plant_id'],
                "plant_name": plant['name'],
                "production_kg": round(base_production, 2),
                "efficiency_percent": plant['efficiency_percent'] + random.uniform(-5, 5),
                "solar_generation_kwh": plant['solar_capacity_kw'] * random.uniform(3, 7) if plant['solar_capacity_kw'] > 0 else 0,
                "wind_generation_kwh": plant['wind_capacity_kw'] * random.uniform(2, 6) if plant['wind_capacity_kw'] > 0 else 0,
                "grid_energy_kwh": random.uniform(0, 500),
                "weather_condition": random.choice(["Clear", "Cloudy", "Rainy", "Windy"]),
                "temperature_c": random.uniform(20, 40),
                "machines_operational": plant['machine_count'] - random.randint(0, 2),
                "labor_present": plant['labor_count'] - random.randint(0, 5),
                "downtime_minutes": random.randint(0, 120),
                "profit_usd": round(base_production * plant['price_per_kg'] * random.uniform(0.15, 0.30), 2),
                "timestamp": date
            }
            
            history.append(record)
    
    return history

# ========================================
# MAIN SEEDING FUNCTION
# ========================================

async def seed_database():
    """Seed the database with all dummy data"""
    print("=" * 60)
    print("H2-OptiPlant Database Seeding")
    print("=" * 60)
    
    # Initialize database
    await initialize_indexes()
    
    # Clear existing data (optional)
    db = get_database()
    print("\nClearing existing data...")
    await db[PLANTS].delete_many({})
    await db[USERS].delete_many({})
    await db[STORAGE].delete_many({})
    await db[FLEET].delete_many({})
    await db[ORDERS].delete_many({})
    await db[PRODUCTION_HISTORY].delete_many({})
    
    # Seed plants
    print(f"\nSeeding {len(PLANTS)} plants...")
    for plant in PLANTS:
        # Calculate distance to customer (for recommendations)
        plant['distance_to_customer_km'] = random.uniform(50, 400)
        await create_plant(plant)
    print(f"✓ {len(PLANTS)} plants created")
    
    # Seed users
    print(f"\nSeeding users...")
    users = generate_users()
    for user in users:
        await create_user(user)
    print(f"✓ {len(users)} users created ({len([u for u in users if u['role'] == 'admin'])} admins, {len([u for u in users if u['role'] == 'customer'])} customers)")
    
    # Seed storage containers
    print(f"\nSeeding storage containers...")
    containers = generate_storage_containers()
    for container in containers:
        await create_storage_container(container)
    print(f"✓ {len(containers)} storage containers created")
    
    # Seed fleet vehicles
    print(f"\nSeeding fleet vehicles...")
    vehicles = generate_fleet_vehicles()
    for vehicle in vehicles:
        await create_fleet_vehicle(vehicle)
    print(f"✓ {len(vehicles)} fleet vehicles created")
    
    # Seed orders
    print(f"\nSeeding customer orders...")
    customers = [u for u in users if u['role'] == 'customer']
    orders = generate_orders(customers)
    for order in orders:
        await create_order(order)
    print(f"✓ {len(orders)} orders created")
    
    # Seed production history
    print(f"\nSeeding production history (30 days)...")
    history = generate_production_history()
    for record in history:
        await add_production_record(record)
    print(f"✓ {len(history)} production records created")
    
    # Generate summary report
    print("\n" + "=" * 60)
    print("Database Seeding Complete!")
    print("=" * 60)
    print(f"\nSummary:")
    print(f"  • Plants: {len(PLANTS)}")
    print(f"  • Users: {len(users)} (Admin: {len([u for u in users if u['role'] == 'admin'])}, Customer: {len(customers)})")
    print(f"  • Storage Containers: {len(containers)}")
    print(f"  • Fleet Vehicles: {len(vehicles)}")
    print(f"  • Orders: {len(orders)}")
    print(f"  • Production History: {len(history)} records (30 days)")
    print(f"\nDefault Credentials:")
    print(f"  • Admin: admin@h2optiplant.com / admin123")
    print(f"  • Customer: (any customer email) / customer123")
    print("\n" + "=" * 60)

if __name__ == "__main__":
    print("\nStarting database seeding...")
    asyncio.run(seed_database())
    print("\n✓ Database ready for use!\n")
