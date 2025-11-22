"""
MongoDB Database Integration for H2-OptiPlant
Handles all database operations with Motor (async MongoDB driver)
"""

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import os
from typing import Optional, List, Dict
import asyncio

# MongoDB connection
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
DB_NAME = "h2optiplant"

client = None
db = None

def get_database():
    """Get database instance"""
    global client, db
    if db is None:
        client = AsyncIOMotorClient(MONGODB_URI)
        db = client[DB_NAME]
    return db

# Collection names
USERS = "users"
PLANTS = "plants"
FLEET = "fleet"
STORAGE = "storage"
ORDERS = "orders"
CERTIFICATIONS = "certifications"
PRODUCTION_HISTORY = "production_history"
WEATHER_HISTORY = "weather_history"

# ========================================
# USER MANAGEMENT
# ========================================

async def create_user(user_data: dict) -> dict:
    """Create a new user (admin or customer)"""
    db = get_database()
    user_data['created_at'] = datetime.utcnow()
    user_data['updated_at'] = datetime.utcnow()
    result = await db[USERS].insert_one(user_data)
    user_data['_id'] = str(result.inserted_id)
    return user_data

async def get_user_by_email(email: str) -> Optional[dict]:
    """Get user by email"""
    db = get_database()
    user = await db[USERS].find_one({"email": email})
    if user:
        user['_id'] = str(user['_id'])
    return user

async def get_user_by_id(user_id: str) -> Optional[dict]:
    """Get user by ID"""
    db = get_database()
    from bson import ObjectId
    user = await db[USERS].find_one({"_id": ObjectId(user_id)})
    if user:
        user['_id'] = str(user['_id'])
    return user

async def update_user(user_id: str, update_data: dict) -> bool:
    """Update user data"""
    db = get_database()
    from bson import ObjectId
    update_data['updated_at'] = datetime.utcnow()
    result = await db[USERS].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    return result.modified_count > 0

# ========================================
# PLANT MANAGEMENT
# ========================================

async def create_plant(plant_data: dict) -> dict:
    """Create a new plant"""
    db = get_database()
    plant_data['created_at'] = datetime.utcnow()
    result = await db[PLANTS].insert_one(plant_data)
    plant_data['_id'] = str(result.inserted_id)
    return plant_data

async def get_all_plants() -> List[dict]:
    """Get all plants"""
    db = get_database()
    plants = []
    async for plant in db[PLANTS].find():
        plant['_id'] = str(plant['_id'])
        plants.append(plant)
    return plants

async def get_plant_by_id(plant_id: str) -> Optional[dict]:
    """Get plant by ID"""
    db = get_database()
    from bson import ObjectId
    plant = await db[PLANTS].find_one({"_id": ObjectId(plant_id)})
    if plant:
        plant['_id'] = str(plant['_id'])
    return plant

async def update_plant(plant_id: str, update_data: dict) -> bool:
    """Update plant data"""
    db = get_database()
    from bson import ObjectId
    result = await db[PLANTS].update_one(
        {"_id": ObjectId(plant_id)},
        {"$set": update_data}
    )
    return result.modified_count > 0

# ========================================
# PRODUCTION HISTORY
# ========================================

async def add_production_record(record: dict) -> dict:
    """Add production history record"""
    db = get_database()
    record['timestamp'] = datetime.utcnow()
    result = await db[PRODUCTION_HISTORY].insert_one(record)
    record['_id'] = str(result.inserted_id)
    return record

async def get_production_history(plant_id: str, days: int = 30) -> List[dict]:
    """Get production history for a plant"""
    db = get_database()
    from datetime import timedelta
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    history = []
    async for record in db[PRODUCTION_HISTORY].find({
        "plant_id": plant_id,
        "timestamp": {"$gte": cutoff_date}
    }).sort("timestamp", -1):
        record['_id'] = str(record['_id'])
        history.append(record)
    return history

# ========================================
# FLEET MANAGEMENT
# ========================================

async def create_fleet_vehicle(vehicle_data: dict) -> dict:
    """Create a new fleet vehicle"""
    db = get_database()
    vehicle_data['created_at'] = datetime.utcnow()
    result = await db[FLEET].insert_one(vehicle_data)
    vehicle_data['_id'] = str(result.inserted_id)
    return vehicle_data

async def get_all_fleet_vehicles() -> List[dict]:
    """Get all fleet vehicles"""
    db = get_database()
    vehicles = []
    async for vehicle in db[FLEET].find():
        vehicle['_id'] = str(vehicle['_id'])
        vehicles.append(vehicle)
    return vehicles

async def update_fleet_location(vehicle_id: str, location: dict) -> bool:
    """Update fleet vehicle location"""
    db = get_database()
    from bson import ObjectId
    result = await db[FLEET].update_one(
        {"_id": ObjectId(vehicle_id)},
        {"$set": {
            "current_location": location,
            "last_updated": datetime.utcnow()
        }}
    )
    return result.modified_count > 0

# ========================================
# STORAGE MANAGEMENT
# ========================================

async def create_storage_container(container_data: dict) -> dict:
    """Create a new storage container"""
    db = get_database()
    container_data['created_at'] = datetime.utcnow()
    result = await db[STORAGE].insert_one(container_data)
    container_data['_id'] = str(result.inserted_id)
    return container_data

async def get_all_storage_containers() -> List[dict]:
    """Get all storage containers"""
    db = get_database()
    containers = []
    async for container in db[STORAGE].find():
        container['_id'] = str(container['_id'])
        containers.append(container)
    return containers

async def update_storage_metrics(container_id: str, metrics: dict) -> bool:
    """Update storage container metrics"""
    db = get_database()
    from bson import ObjectId
    metrics['last_updated'] = datetime.utcnow()
    result = await db[STORAGE].update_one(
        {"_id": ObjectId(container_id)},
        {"$set": metrics}
    )
    return result.modified_count > 0

# ========================================
# ORDER MANAGEMENT
# ========================================

async def create_order(order_data: dict) -> dict:
    """Create a new customer order"""
    db = get_database()
    order_data['created_at'] = datetime.utcnow()
    order_data['status'] = 'pending'
    result = await db[ORDERS].insert_one(order_data)
    order_data['_id'] = str(result.inserted_id)
    return order_data

async def get_orders_by_customer(customer_id: str) -> List[dict]:
    """Get all orders for a customer"""
    db = get_database()
    orders = []
    async for order in db[ORDERS].find({"customer_id": customer_id}).sort("created_at", -1):
        order['_id'] = str(order['_id'])
        orders.append(order)
    return orders

async def get_pending_orders() -> List[dict]:
    """Get all pending orders"""
    db = get_database()
    orders = []
    async for order in db[ORDERS].find({"status": "pending"}):
        order['_id'] = str(order['_id'])
        orders.append(order)
    return orders

async def update_order_status(order_id: str, status: str) -> bool:
    """Update order status"""
    db = get_database()
    from bson import ObjectId
    result = await db[ORDERS].update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {
            "status": status,
            "updated_at": datetime.utcnow()
        }}
    )
    return result.modified_count > 0

# ========================================
# BLOCKCHAIN CERTIFICATIONS
# ========================================

async def save_certification(cert_data: dict) -> dict:
    """Save blockchain certification"""
    db = get_database()
    result = await db[CERTIFICATIONS].insert_one(cert_data)
    cert_data['_id'] = str(result.inserted_id)
    return cert_data

async def get_all_certifications(limit: int = 50) -> List[dict]:
    """Get recent certifications"""
    db = get_database()
    certs = []
    async for cert in db[CERTIFICATIONS].find().sort("timestamp", -1).limit(limit):
        cert['_id'] = str(cert['_id'])
        certs.append(cert)
    return certs

# ========================================
# INITIALIZATION
# ========================================

async def initialize_indexes():
    """Create database indexes for better performance"""
    db = get_database()
    
    # User indexes
    await db[USERS].create_index("email", unique=True)
    await db[USERS].create_index("role")
    
    # Plant indexes
    await db[PLANTS].create_index("plant_id", unique=True)
    await db[PLANTS].create_index("location")
    
    # Production history indexes
    await db[PRODUCTION_HISTORY].create_index([("plant_id", 1), ("timestamp", -1)])
    
    # Fleet indexes
    await db[FLEET].create_index("vehicle_id", unique=True)
    await db[FLEET].create_index("status")
    
    # Storage indexes
    await db[STORAGE].create_index("container_id", unique=True)
    
    # Order indexes
    await db[ORDERS].create_index([("customer_id", 1), ("created_at", -1)])
    await db[ORDERS].create_index("status")
    
    # Certification indexes
    await db[CERTIFICATIONS].create_index([("timestamp", -1)])
    
    print("✓ Database indexes created successfully")

# For testing without asyncio event loop
def init_db():
    """Initialize database (for scripts)"""
    loop = asyncio.get_event_loop()
    loop.run_until_complete(initialize_indexes())
