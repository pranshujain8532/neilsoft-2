from flask import Blueprint, request, jsonify
from supabase import create_client
import os
from datetime import datetime

maintenance_bp = Blueprint('maintenance', __name__)

# Initialize Supabase with SERVICE ROLE KEY to bypass RLS
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
supabase = create_client(supabase_url, supabase_key)

print(f"[OK] Maintenance routes using {'SERVICE_ROLE' if os.getenv('SUPABASE_SERVICE_ROLE_KEY') else 'ANON'} key")

@maintenance_bp.route('/stats', methods=['GET'])
def get_dashboard_stats():
    """Calculate fleet health statistics"""
    try:
        logs_response = supabase.table('sensor_logs').select('*').order('timestamp', desc=True).limit(50).execute()
        logs = logs_response.data or []
        
        events_response = supabase.table('maintenance_events').select('*').neq('status', 'completed').execute()
        events = events_response.data or []

        total_vehicles = len(set(l['vehicle_id'] for l in logs)) if logs else 1
        
        critical_count = 0
        maintenance_due = len(events)
        
        seen_vehicles = set()
        for log in logs:
            vid = log['vehicle_id']
            if vid in seen_vehicles: continue
            seen_vehicles.add(vid)
            
            if log.get('wear_score', 0) > 0.8 or log.get('engine_temp', 0) > 100:
                critical_count += 1
        
        operational_percent = 100 - (critical_count / total_vehicles * 100) if total_vehicles > 0 else 100

        return jsonify({
            'operational_percent': int(operational_percent),
            'maintenance_due': maintenance_due,
            'critical_issues': critical_count
        })

    except Exception as e:
        print(f"Stats Error: {e}")
        return jsonify({'error': str(e)}), 500

@maintenance_bp.route('/alerts', methods=['GET'])
def get_recent_alerts():
    """Get combined alerts from logs and maintenance schedule"""
    try:
        alerts = []
        
        logs = supabase.table('sensor_logs').select('*').order('timestamp', desc=True).limit(20).execute().data or []
        
        for log in logs:
            vid = log['vehicle_id']
            time_ago = log.get('timestamp', '')
            
            if log.get('engine_temp', 0) > 100:
                alerts.append({
                    'id': vid, 
                    'msg': f'High Engine Temp ({log["engine_temp"]}°C)', 
                    'time': time_ago, 
                    'type': 'critical'
                })
            elif log.get('wear_score', 0) > 0.8:
                alerts.append({
                    'id': vid, 
                    'msg': 'Critical Wear Detected', 
                    'time': time_ago, 
                    'type': 'critical'
                })
            elif log.get('wear_score', 0) > 0.5:
                alerts.append({
                    'id': vid, 
                    'msg': 'Wear Warning', 
                    'time': time_ago, 
                    'type': 'warning'
                })

        events = supabase.table('maintenance_events').select('*').neq('status', 'completed').limit(5).execute().data or []
        for event in events:
            alerts.append({
                'id': event['vehicle_id'],
                'msg': f"Scheduled: {event['event_type']}",
                'time': event.get('due_date', ''),
                'type': 'info'
            })

        return jsonify(alerts[:5])

    except Exception as e:
        print(f"Alerts Error: {e}")
        return jsonify({'error': str(e)}), 500

@maintenance_bp.route('/vehicles', methods=['GET'])
def get_vehicles_list():
    """Get list of all vehicles from database for dropdown selection"""
    try:
        print("[INFO] Fetching vehicles from database...")
        vehicles = supabase.table('vehicles').select('id, registration, status').execute().data or []
        print(f"[OK] Found {len(vehicles)} vehicles: {vehicles}")
        return jsonify({'vehicles': vehicles})
    except Exception as e:
        print(f"Vehicles Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'vehicles': []}), 500

@maintenance_bp.route('/schedule', methods=['POST'])
def schedule_service():
    """Schedule a new maintenance event"""
    try:
        data = request.json
        vehicle_id = data.get('vehicle_id')
        date = data.get('date')
        
        if not vehicle_id:
            return jsonify({'success': False, 'error': 'Please select a vehicle'}), 400
        if not date:
            return jsonify({'success': False, 'error': 'Please select a date'}), 400
        
        new_event = {
            'vehicle_id': vehicle_id,
            'event_type': 'manual_schedule',
            'description': f'Scheduled service for {vehicle_id}',
            'due_date': date,
            'status': 'scheduled'
        }
        
        supabase.table('maintenance_events').insert(new_event).execute()
        return jsonify({'success': True, 'message': f'Service scheduled for {vehicle_id}'})
        
    except Exception as e:
        print(f"Schedule Error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@maintenance_bp.route('/calendar', methods=['GET'])
def get_calendar_events():
    """Get all maintenance events for calendar display"""
    try:
        print("[INFO] Fetching calendar events...")
        events = supabase.table('maintenance_events').select('*').order('due_date').execute().data or []
        print(f"[OK] Found {len(events)} calendar events")
        
        schedule = []
        for event in events:
            schedule.append({
                'vehicleId': event.get('vehicle_id', 'Unknown'),
                'dueDate': event.get('due_date', ''),
                'description': event.get('description', event.get('event_type', 'Maintenance')),
                'status': event.get('status', 'pending')
            })
        
        return jsonify({'schedule': schedule})
    except Exception as e:
        print(f"Calendar Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'schedule': []}), 500
