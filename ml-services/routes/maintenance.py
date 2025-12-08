from flask import Blueprint, jsonify, request
import os
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

maintenance_bp = Blueprint('maintenance', __name__)

url: str = os.environ.get("SUPABASE_URL")
# Prefer Service Role Key for elevated access, fallback to Anon Key
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(url, key)

@maintenance_bp.route('/stats', methods=['GET'])
def get_stats():
    # Placeholder for stats to prevent frontend errors on load
    # You can expand this to query real tables later
    return jsonify({
        "operational_percent": 95,
        "maintenance_due": 2,
        "critical_issues": 1
    })

@maintenance_bp.route('/vehicles', methods=['GET'])
def get_vehicles():
    try:
        # Try fetching from 'vehicles' table first
        res = supabase.table('vehicles').select('*').execute()
        vehicles = []
        if res.data:
            for v in res.data:
                vehicles.append({
                    "id": v.get('id'),
                    "registration": v.get('registration_number', 'Unknown'),
                    "status": v.get('status', 'Unknown')
                })
        return jsonify({"vehicles": vehicles})
    except Exception as e:
        print(f"Vehicles Error: {e}")
        return jsonify({"vehicles": []})

@maintenance_bp.route('/calendar', methods=['GET'])
def get_calendar():
    try:
        # Query the existing 'maintenance_events' table as requested
        res = supabase.table('maintenance_events').select('*').execute()
        events = []
        if res.data:
            for item in res.data:
                # Map 'maintenance_events' columns to Frontend expected format
                # Schema: id, vehicle_id, event_type, description, due_date, status, created_at
                
                frontend_status = 'pending'
                db_status = item.get('status', '').lower()
                if 'complete' in db_status: frontend_status = 'completed'
                elif 'overdue' in db_status: frontend_status = 'overdue'
                
                events.append({
                    "vehicleId": item.get('vehicle_id', 'Unknown'),
                    "dueDate": item.get('due_date'),
                    "description": item.get('description', 'Scheduled Maintenance'),
                    "status": frontend_status
                })
        return jsonify({"schedule": events})
    except Exception as e:
        print(f"Calendar Error: {e}")
        return jsonify({"schedule": []})
