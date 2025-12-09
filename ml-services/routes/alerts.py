"""
Admin Alerts API Routes
Endpoints for alert management
"""

from flask import Blueprint, jsonify, request
from services.alert_service import alert_service

alerts_bp = Blueprint('alerts', __name__, url_prefix='/api/alerts')


@alerts_bp.route('/', methods=['GET'])
def get_alerts():
    """Get all recent alerts"""
    try:
        plant_id = request.args.get('plant_id')
        limit = int(request.args.get('limit', 50))
        
        if request.args.get('active_only') == 'true':
            alerts = alert_service.get_active_alerts(plant_id)
        else:
            alerts = alert_service.get_all_alerts(limit)
        
        return jsonify({
            'success': True,
            'alerts': alerts,
            'count': len(alerts)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@alerts_bp.route('/active', methods=['GET'])
def get_active_alerts():
    """Get active alerts only"""
    try:
        plant_id = request.args.get('plant_id')
        alerts = alert_service.get_active_alerts(plant_id)
        
        return jsonify({
            'success': True,
            'alerts': alerts,
            'count': len(alerts)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@alerts_bp.route('/acknowledge/<alert_id>', methods=['POST'])
def acknowledge_alert(alert_id):
    """Acknowledge an alert"""
    try:
        success = alert_service.acknowledge_alert(alert_id)
        return jsonify({
            'success': success,
            'message': 'Alert acknowledged' if success else 'Alert not found'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@alerts_bp.route('/resolve/<alert_id>', methods=['POST'])
def resolve_alert(alert_id):
    """Resolve an alert"""
    try:
        success = alert_service.resolve_alert(alert_id)
        return jsonify({
            'success': success,
            'message': 'Alert resolved' if success else 'Alert not found'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@alerts_bp.route('/test', methods=['POST'])
def test_alert():
    """Send a test alert (for testing email configuration)"""
    try:
        data = request.get_json() or {}
        
        alert = alert_service.trigger_alert(
            alert_type='TEST_ALERT',
            severity=data.get('severity', 'INFO'),
            title='Test Alert',
            message='This is a test alert to verify the notification system is working.',
            plant_name='Test Plant'
        )
        
        return jsonify({
            'success': True,
            'alert': alert,
            'message': 'Test alert sent successfully'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@alerts_bp.route('/trigger', methods=['POST'])
def trigger_custom_alert():
    """Trigger a custom alert"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        required = ['alert_type', 'severity', 'title', 'message']
        for field in required:
            if field not in data:
                return jsonify({'success': False, 'error': f'Missing {field}'}), 400
        
        alert = alert_service.trigger_alert(
            alert_type=data['alert_type'],
            severity=data['severity'],
            title=data['title'],
            message=data['message'],
            plant_id=data.get('plant_id'),
            plant_name=data.get('plant_name'),
            value=data.get('value'),
            threshold=data.get('threshold'),
            context=data.get('context')
        )
        
        return jsonify({
            'success': True,
            'alert': alert
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@alerts_bp.route('/stats', methods=['GET'])
def get_alert_stats():
    """Get alert statistics"""
    try:
        alerts = alert_service.get_all_alerts(100)
        
        stats = {
            'total': len(alerts),
            'active': len([a for a in alerts if a.get('status') == 'ACTIVE']),
            'acknowledged': len([a for a in alerts if a.get('acknowledged')]),
            'resolved': len([a for a in alerts if a.get('status') == 'RESOLVED']),
            'by_severity': {
                'CRITICAL': len([a for a in alerts if a.get('severity') == 'CRITICAL']),
                'HIGH': len([a for a in alerts if a.get('severity') == 'HIGH']),
                'WARNING': len([a for a in alerts if a.get('severity') == 'WARNING']),
                'INFO': len([a for a in alerts if a.get('severity') == 'INFO'])
            }
        }
        
        return jsonify({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
