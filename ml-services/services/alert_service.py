"""
Admin Alert Service - Lightweight Implementation
Sends email alerts for critical plant events
Supports: Resend API (recommended) or SMTP
"""

import os
import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

# Configuration from environment
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@h2optiplant.com')
ALERTS_ENABLED = os.environ.get('ALERTS_ENABLED', 'true').lower() == 'true'

# Resend API (easiest option)
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')

# SMTP Config (alternative)
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASS = os.environ.get('SMTP_PASS', '')


class AlertService:
    """
    Lightweight alert service for H2-OptiPlant
    Sends email notifications for critical events
    """
    
    # Alert severity levels
    CRITICAL = 'CRITICAL'  # Immediate action required
    HIGH = 'HIGH'          # Action required within minutes
    WARNING = 'WARNING'    # Monitor closely
    INFO = 'INFO'          # Informational
    
    # In-memory alert log (also stored in DB)
    _recent_alerts: List[Dict] = []
    _max_recent = 100
    
    def __init__(self):
        self.supabase = None
        self._init_supabase()
        logger.info("[OK] Alert Service initialized")
    
    def _init_supabase(self):
        """Initialize Supabase connection"""
        try:
            from supabase import create_client
            url = os.environ.get('SUPABASE_URL')
            key = os.environ.get('SUPABASE_SERVICE_KEY')
            if url and key:
                self.supabase = create_client(url, key)
        except Exception as e:
            logger.warning(f"Supabase not available for alerts: {e}")
    
    def trigger_alert(
        self,
        alert_type: str,
        severity: str,
        title: str,
        message: str,
        plant_id: str = None,
        plant_name: str = None,
        value: float = None,
        threshold: float = None,
        context: Dict = None
    ) -> Dict:
        """
        Trigger an alert and send notification
        
        Args:
            alert_type: Type code (e.g., 'H2_LEAK', 'TEMP_CRITICAL')
            severity: CRITICAL, HIGH, WARNING, INFO
            title: Short alert title
            message: Detailed message
            plant_id: UUID of affected plant
            plant_name: Name of plant for display
            value: Actual value that triggered alert
            threshold: Threshold that was exceeded
            context: Additional context data
            
        Returns:
            Alert record dict
        """
        alert = {
            'id': datetime.now().strftime('%Y%m%d%H%M%S%f'),
            'type': alert_type,
            'severity': severity,
            'title': title,
            'message': message,
            'plant_id': plant_id,
            'plant_name': plant_name or 'Unknown Plant',
            'value': value,
            'threshold': threshold,
            'context': context or {},
            'triggered_at': datetime.now().isoformat(),
            'status': 'ACTIVE',
            'acknowledged': False
        }
        
        # Store in memory
        self._recent_alerts.insert(0, alert)
        if len(self._recent_alerts) > self._max_recent:
            self._recent_alerts.pop()
        
        # Store in database
        self._save_to_db(alert)
        
        # Send email for CRITICAL and HIGH
        if severity in [self.CRITICAL, self.HIGH] and ALERTS_ENABLED:
            self._send_email_alert(alert)
        
        # Log
        log_fn = logger.critical if severity == self.CRITICAL else \
                 logger.warning if severity in [self.HIGH, self.WARNING] else \
                 logger.info
        log_fn(f"[ALERT] {severity} - {title}: {message}")
        
        return alert
    
    def _save_to_db(self, alert: Dict):
        """Save alert to Supabase"""
        if not self.supabase:
            return
        
        try:
            self.supabase.table('admin_alerts').insert({
                'alert_type': alert['type'],
                'severity': alert['severity'],
                'title': alert['title'],
                'message': alert['message'],
                'plant_id': alert['plant_id'],
                'trigger_value': alert['value'],
                'threshold_value': alert['threshold'],
                'context': alert['context'],
                'status': 'ACTIVE'
            }).execute()
        except Exception as e:
            logger.error(f"Failed to save alert to DB: {e}")
    
    def _send_email_alert(self, alert: Dict):
        """Send email notification via Resend API or SMTP"""
        # Try Resend first (easier setup)
        if RESEND_API_KEY:
            self._send_via_resend(alert)
        # Fallback to SMTP
        elif SMTP_USER and SMTP_PASS:
            self._send_via_smtp(alert)
        else:
            logger.warning("No email service configured (set RESEND_API_KEY or SMTP credentials)")
    
    def _send_via_resend(self, alert: Dict):
        """Send email via Resend API (free, easy to set up)"""
        try:
            html = self._build_html_email(alert)
            
            response = requests.post(
                'https://api.resend.com/emails',
                headers={
                    'Authorization': f'Bearer {RESEND_API_KEY}',
                    'Content-Type': 'application/json'
                },
                json={
                    'from': 'H2-OptiPlant <onboarding@resend.dev>',
                    'to': [ADMIN_EMAIL],
                    'subject': f"[{alert['severity']}] {alert['title']} - H2-OptiPlant",
                    'html': html
                }
            )
            
            if response.status_code == 200:
                logger.info(f"✅ Alert email sent to {ADMIN_EMAIL} via Resend")
            else:
                logger.error(f"Resend API error: {response.text}")
                
        except Exception as e:
            logger.error(f"Failed to send via Resend: {e}")
    
    def _send_via_smtp(self, alert: Dict):
        """Send email via SMTP (Gmail, etc)"""
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"[{alert['severity']}] {alert['title']} - H2-OptiPlant"
            msg['From'] = SMTP_USER
            msg['To'] = ADMIN_EMAIL
            
            text = f"""
H2-OptiPlant Alert System

Severity: {alert['severity']}
Alert: {alert['title']}
Plant: {alert['plant_name']}
Time: {alert['triggered_at']}

Details: {alert['message']}
Value: {alert['value']} | Threshold: {alert['threshold']}

--
H2-OptiPlant Monitoring System
"""
            html = self._build_html_email(alert)
            
            msg.attach(MIMEText(text, 'plain'))
            msg.attach(MIMEText(html, 'html'))
            
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.send_message(msg)
            
            logger.info(f"✅ Alert email sent to {ADMIN_EMAIL} via SMTP")
            
        except Exception as e:
            logger.error(f"Failed to send via SMTP: {e}")
    
    def _build_html_email(self, alert: Dict) -> str:
        """Build HTML email template"""
        severity_color = {
            'CRITICAL': '#DC2626',
            'HIGH': '#F59E0B',
            'WARNING': '#3B82F6',
            'INFO': '#10B981'
        }.get(alert['severity'], '#6B7280')
        
        return f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; background: #1F2937; color: #F3F4F6; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: #374151; border-radius: 12px; padding: 24px; }}
        .severity {{ background: {severity_color}; color: white; padding: 6px 16px; border-radius: 20px; font-weight: bold; display: inline-block; }}
        .title {{ font-size: 24px; font-weight: bold; color: white; margin: 16px 0; }}
        .detail {{ background: #1F2937; border-radius: 8px; padding: 16px; margin: 12px 0; }}
        .label {{ color: #9CA3AF; font-size: 12px; text-transform: uppercase; }}
        .value {{ color: white; font-size: 18px; font-weight: 600; }}
        .message {{ background: #111827; border-left: 4px solid {severity_color}; padding: 16px; margin: 16px 0; color: #E5E7EB; }}
        .footer {{ color: #6B7280; font-size: 12px; margin-top: 20px; text-align: center; }}
    </style>
</head>
<body>
    <div class="container">
        <span class="severity">{alert['severity']}</span>
        <div class="title">{alert['title']}</div>
        
        <div class="detail">
            <div class="label">Plant</div>
            <div class="value">{alert['plant_name']}</div>
        </div>
        
        <div class="message">{alert['message']}</div>
        
        <div style="display: flex; gap: 16px;">
            <div class="detail" style="flex: 1;">
                <div class="label">Current Value</div>
                <div class="value">{alert['value'] or 'N/A'}</div>
            </div>
            <div class="detail" style="flex: 1;">
                <div class="label">Threshold</div>
                <div class="value">{alert['threshold'] or 'N/A'}</div>
            </div>
        </div>
        
        <div class="detail">
            <div class="label">Triggered At</div>
            <div class="value">{alert['triggered_at']}</div>
        </div>
        
        <div class="footer">
            H2-OptiPlant Monitoring System | Green Hydrogen Excellence
        </div>
    </div>
</body>
</html>
"""
    
    def get_active_alerts(self, plant_id: str = None) -> List[Dict]:
        """Get active alerts from memory"""
        alerts = self._recent_alerts
        if plant_id:
            alerts = [a for a in alerts if a.get('plant_id') == plant_id]
        return [a for a in alerts if a.get('status') == 'ACTIVE']
    
    def get_all_alerts(self, limit: int = 50) -> List[Dict]:
        """Get recent alerts"""
        return self._recent_alerts[:limit]
    
    def acknowledge_alert(self, alert_id: str) -> bool:
        """Acknowledge an alert"""
        for alert in self._recent_alerts:
            if alert.get('id') == alert_id:
                alert['acknowledged'] = True
                alert['acknowledged_at'] = datetime.now().isoformat()
                return True
        return False
    
    def resolve_alert(self, alert_id: str) -> bool:
        """Resolve an alert"""
        for alert in self._recent_alerts:
            if alert.get('id') == alert_id:
                alert['status'] = 'RESOLVED'
                alert['resolved_at'] = datetime.now().isoformat()
                return True
        return False
    
    # =========================================
    # Pre-defined Alert Triggers
    # =========================================
    
    def alert_h2_leak(self, plant_id: str, plant_name: str, concentration: float):
        """Hydrogen leak detected"""
        return self.trigger_alert(
            'H2_LEAK', self.CRITICAL,
            'Hydrogen Leak Detected',
            f'EMERGENCY: H₂ concentration at {concentration}% exceeds 4% LEL limit. Evacuate immediately!',
            plant_id, plant_name, concentration, 4.0
        )
    
    def alert_temp_critical(self, plant_id: str, plant_name: str, temp: float):
        """Stack temperature critical"""
        return self.trigger_alert(
            'TEMP_CRITICAL', self.CRITICAL,
            'Stack Temperature Critical',
            f'Stack temperature at {temp}°C exceeds 90°C safety limit. Activating emergency cooling.',
            plant_id, plant_name, temp, 90.0
        )
    
    def alert_pressure_high(self, plant_id: str, plant_name: str, pressure: float):
        """Pressure exceeds limit"""
        return self.trigger_alert(
            'PRESSURE_HIGH', self.CRITICAL,
            'Pressure Exceeds Limit',
            f'System pressure at {pressure} bar exceeds 35 bar limit. Venting recommended.',
            plant_id, plant_name, pressure, 35.0
        )
    
    def alert_equipment_cascade(self, plant_id: str, plant_name: str, offline_percent: float):
        """Equipment cascade failure"""
        return self.trigger_alert(
            'EQUIPMENT_CASCADE', self.CRITICAL,
            'Equipment Cascade Failure',
            f'{offline_percent:.0f}% of equipment is offline. Auto-shutdown triggered.',
            plant_id, plant_name, offline_percent, 80.0
        )
    
    def alert_failure_predicted(self, plant_id: str, plant_name: str, 
                                equipment_name: str, probability: float):
        """ML predicted failure"""
        return self.trigger_alert(
            'FAILURE_PREDICTED', self.HIGH,
            f'Failure Predicted: {equipment_name}',
            f'ML model predicts {probability:.1f}% failure probability for {equipment_name}. Schedule maintenance.',
            plant_id, plant_name, probability, 70.0,
            context={'equipment_name': equipment_name}
        )
    
    def alert_battery_low(self, plant_id: str, plant_name: str, soc: float):
        """Battery critically low"""
        return self.trigger_alert(
            'BATTERY_LOW', self.HIGH,
            'Battery Critical Low',
            f'Battery at {soc:.1f}% - below 10% threshold. Switch to grid or reduce load.',
            plant_id, plant_name, soc, 10.0
        )
    
    def alert_solar_zero(self, plant_id: str, plant_name: str):
        """Solar production zero during daylight"""
        return self.trigger_alert(
            'SOLAR_ZERO', self.HIGH,
            'Solar Production Zero',
            'Solar output is 0 kW during daylight hours. Check panels and inverter.',
            plant_id, plant_name, 0, None
        )
    
    def alert_recovery_stuck(self, plant_id: str, plant_name: str, minutes: int):
        """Recovery process stuck"""
        return self.trigger_alert(
            'RECOVERY_STUCK', self.HIGH,
            'Recovery Process Stuck',
            f'Plant stuck in RECOVERING state for {minutes} minutes. Manual intervention may be required.',
            plant_id, plant_name, minutes, 15
        )
    
    def alert_hot_standby_activated(self, plant_id: str, plant_name: str, 
                                     trigger_reason: str, failure_prob: float):
        """Hot standby mode activated"""
        return self.trigger_alert(
            'HOT_STANDBY', self.HIGH,
            'Hot Standby Activated',
            f'Plant entered Hot Standby mode. Trigger: {trigger_reason}. Failure probability: {failure_prob:.1f}%',
            plant_id, plant_name, failure_prob, 70.0,
            context={'trigger_reason': trigger_reason}
        )
    
    def alert_efficiency_drop(self, plant_id: str, plant_name: str, efficiency: float):
        """Efficiency drop detected"""
        return self.trigger_alert(
            'EFFICIENCY_DROP', self.WARNING,
            'Efficiency Drop Detected',
            f'Plant efficiency dropped to {efficiency:.1f}%. Below 60% threshold.',
            plant_id, plant_name, efficiency, 60.0
        )
    
    def alert_maintenance_due(self, plant_id: str, plant_name: str, 
                              equipment_name: str, days_overdue: int):
        """Maintenance overdue"""
        return self.trigger_alert(
            'MAINTENANCE_DUE', self.WARNING,
            f'Maintenance Overdue: {equipment_name}',
            f'Scheduled maintenance for {equipment_name} is {days_overdue} days overdue.',
            plant_id, plant_name, days_overdue, 0,
            context={'equipment_name': equipment_name}
        )


# Global instance
alert_service = AlertService()
