"""
Renewable Energy Service
Manages solar/wind/hydro production data, battery storage, and water recycling
Fetches real data from Supabase - no hardcoding
"""

import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from supabase import create_client

# Initialize Supabase
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
supabase = None

if supabase_url and supabase_key:
    try:
        supabase = create_client(supabase_url, supabase_key)
        print("[OK] Renewable Energy Service connected to Supabase")
    except Exception as e:
        print(f"[WARN] Renewable Energy Service - Failed to connect to Supabase: {e}")


class RenewableEnergyService:
    """Service for managing renewable energy data"""
    
    # Constants for water-hydrogen relationship
    # 1 kg H2 requires ~9 liters of water (stoichiometric + losses)
    WATER_PER_KG_H2 = 9.0
    # Recovery efficiency from electrolysis byproducts
    WATER_RECOVERY_RATE = 0.70  # 70% recovery
    
    def __init__(self):
        self.supabase = supabase
    
    # ==========================================
    # RENEWABLE ENERGY PRODUCTION
    # ==========================================
    
    def get_production_data(self, plant_id: str, hours: int = 24) -> Dict:
        """Get renewable energy production for last N hours"""
        if not self.supabase:
            return {'error': 'Database not connected'}
        
        try:
            cutoff_time = datetime.now() - timedelta(hours=hours)
            
            response = self.supabase.table('renewable_energy_production') \
                .select('*') \
                .eq('plant_id', plant_id) \
                .gte('recorded_at', cutoff_time.isoformat()) \
                .order('recorded_at', desc=False) \
                .execute()
            
            # Group by source type
            production_data = {
                'solar': [],
                'wind': [],
                'hydro': []
            }
            
            totals = {
                'solar_total_kwh': 0,
                'wind_total_kwh': 0,
                'hydro_total_kwh': 0,
                'total_generated_kwh': 0
            }
            
            for record in response.data or []:
                source = record.get('source_type', 'solar')
                energy = record.get('energy_generated_kwh', 0)
                
                production_data[source].append({
                    'id': record.get('id'),
                    'energy_kwh': energy,
                    'capacity_kwh': record.get('capacity_kwh', 0),
                    'efficiency': record.get('efficiency_percent', 85),
                    'time': record.get('recorded_at'),
                    'weather': record.get('weather_conditions')
                })
                
                totals[f'{source}_total_kwh'] += energy
                totals['total_generated_kwh'] += energy
            
            return {
                'plant_id': plant_id,
                'hours': hours,
                'production': production_data,
                'totals': totals,
                'record_count': len(response.data or [])
            }
            
        except Exception as e:
            print(f"[ERROR] Get production data failed: {e}")
            return {'error': str(e)}
    
    def get_daily_production_summary(self, plant_id: str) -> Dict:
        """Get aggregated daily production by source type"""
        if not self.supabase:
            return {'error': 'Database not connected'}
        
        try:
            # Get today's data
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            
            response = self.supabase.table('renewable_energy_production') \
                .select('source_type, energy_generated_kwh, capacity_kwh') \
                .eq('plant_id', plant_id) \
                .gte('recorded_at', today_start.isoformat()) \
                .execute()
            
            summary = {
                'solar': {'generated': 0, 'capacity': 0},
                'wind': {'generated': 0, 'capacity': 0},
                'hydro': {'generated': 0, 'capacity': 0}
            }
            
            for record in response.data or []:
                source = record.get('source_type')
                if source in summary:
                    summary[source]['generated'] += record.get('energy_generated_kwh', 0)
                    summary[source]['capacity'] = max(summary[source]['capacity'], 
                                                       record.get('capacity_kwh', 0))
            
            # Calculate total and check for excess
            total_generated = sum(s['generated'] for s in summary.values())
            total_capacity = sum(s['capacity'] for s in summary.values())
            
            excess_energy = max(0, total_generated - total_capacity)
            
            return {
                'plant_id': plant_id,
                'date': today_start.date().isoformat(),
                'by_source': summary,
                'total_generated_kwh': total_generated,
                'total_capacity_kwh': total_capacity,
                'excess_energy_kwh': excess_energy,
                'utilization_percent': (total_generated / total_capacity * 100) if total_capacity > 0 else 0
            }
            
        except Exception as e:
            print(f"[ERROR] Get daily summary failed: {e}")
            return {'error': str(e)}
    
    # ==========================================
    # BATTERY STORAGE
    # ==========================================
    
    def get_battery_status(self, plant_id: str) -> Dict:
        """Get current battery status for a plant"""
        if not self.supabase:
            return {'error': 'Database not connected'}
        
        try:
            response = self.supabase.table('battery_storage') \
                .select('*') \
                .eq('plant_id', plant_id) \
                .single() \
                .execute()
            
            battery = response.data
            
            if not battery:
                # Create default battery for plant (40% of capacity)
                return self._initialize_battery(plant_id)
            
            return {
                'plant_id': plant_id,
                'capacity_kwh': battery.get('battery_capacity_kwh', 0),
                'current_charge_kwh': battery.get('current_charge_kwh', 0),
                'charge_percent': battery.get('charge_percent', 0),
                'is_charging': battery.get('is_charging', False),
                'is_discharging': battery.get('is_discharging', False),
                'charging_from': battery.get('charging_from'),
                'health_percent': battery.get('health_percent', 100),
                'cycles_used': battery.get('cycles_used', 0),
                'last_full_charge': battery.get('last_full_charge')
            }
            
        except Exception as e:
            print(f"[ERROR] Get battery status failed: {e}")
            return {'error': str(e)}
    
    def _initialize_battery(self, plant_id: str) -> Dict:
        """Initialize battery storage for a plant (40% of plant capacity)"""
        try:
            # Get plant capacity
            plant_resp = self.supabase.table('plants') \
                .select('capacity_mw') \
                .eq('id', plant_id) \
                .single() \
                .execute()
            
            capacity_mw = plant_resp.data.get('capacity_mw', 50) if plant_resp.data else 50
            battery_capacity = capacity_mw * 1000 * 0.40  # 40% of plant capacity in kWh
            
            # Insert new battery record
            self.supabase.table('battery_storage').insert({
                'plant_id': plant_id,
                'battery_capacity_kwh': battery_capacity,
                'current_charge_kwh': 0,
                'charge_percent': 0,
                'health_percent': 100
            }).execute()
            
            return {
                'plant_id': plant_id,
                'capacity_kwh': battery_capacity,
                'current_charge_kwh': 0,
                'charge_percent': 0,
                'is_charging': False,
                'is_discharging': False,
                'health_percent': 100,
                'cycles_used': 0,
                'initialized': True
            }
            
        except Exception as e:
            print(f"[ERROR] Initialize battery failed: {e}")
            return {'error': str(e)}
    
    def charge_battery(self, plant_id: str, energy_kwh: float, source: str) -> Dict:
        """Charge battery with excess energy from solar/wind"""
        if not self.supabase:
            return {'error': 'Database not connected'}
        
        try:
            battery = self.get_battery_status(plant_id)
            if 'error' in battery:
                return battery
            
            capacity = battery['capacity_kwh']
            current = battery['current_charge_kwh']
            available_space = capacity - current
            
            # Calculate how much we can actually store
            energy_stored = min(energy_kwh, available_space)
            new_charge = current + energy_stored
            new_percent = (new_charge / capacity * 100) if capacity > 0 else 0
            
            # Update battery
            self.supabase.table('battery_storage') \
                .update({
                    'current_charge_kwh': new_charge,
                    'charge_percent': new_percent,
                    'charging_from': source,
                    'is_charging': True,
                    'updated_at': datetime.now().isoformat()
                }) \
                .eq('plant_id', plant_id) \
                .execute()
            
            # Log transaction
            self.supabase.table('energy_storage_transactions').insert({
                'plant_id': plant_id,
                'transaction_type': 'charge',
                'source': source,
                'energy_kwh': energy_stored,
                'battery_level_before': current,
                'battery_level_after': new_charge
            }).execute()
            
            return {
                'success': True,
                'energy_requested': energy_kwh,
                'energy_stored': energy_stored,
                'overflow': energy_kwh - energy_stored,
                'new_charge_kwh': new_charge,
                'new_percent': new_percent
            }
            
        except Exception as e:
            print(f"[ERROR] Charge battery failed: {e}")
            return {'error': str(e)}
    
    def discharge_battery(self, plant_id: str, energy_kwh: float) -> Dict:
        """Discharge battery to power plant operations"""
        if not self.supabase:
            return {'error': 'Database not connected'}
        
        try:
            battery = self.get_battery_status(plant_id)
            if 'error' in battery:
                return battery
            
            current = battery['current_charge_kwh']
            capacity = battery['capacity_kwh']
            
            # Calculate how much we can actually discharge
            energy_discharged = min(energy_kwh, current)
            new_charge = current - energy_discharged
            new_percent = (new_charge / capacity * 100) if capacity > 0 else 0
            
            # Update battery
            update_data = {
                'current_charge_kwh': new_charge,
                'charge_percent': new_percent,
                'is_discharging': True,
                'is_charging': False,
                'updated_at': datetime.now().isoformat()
            }
            
            # Increment cycle count if fully discharged
            if new_percent < 20:
                update_data['cycles_used'] = battery.get('cycles_used', 0) + 1
            
            self.supabase.table('battery_storage') \
                .update(update_data) \
                .eq('plant_id', plant_id) \
                .execute()
            
            # Log transaction
            self.supabase.table('energy_storage_transactions').insert({
                'plant_id': plant_id,
                'transaction_type': 'discharge',
                'source': 'battery',
                'energy_kwh': energy_discharged,
                'battery_level_before': current,
                'battery_level_after': new_charge
            }).execute()
            
            return {
                'success': True,
                'energy_requested': energy_kwh,
                'energy_discharged': energy_discharged,
                'shortfall': energy_kwh - energy_discharged,
                'new_charge_kwh': new_charge,
                'new_percent': new_percent
            }
            
        except Exception as e:
            print(f"[ERROR] Discharge battery failed: {e}")
            return {'error': str(e)}
    
    def get_energy_transactions(self, plant_id: str, limit: int = 50) -> List[Dict]:
        """Get recent energy storage transactions"""
        if not self.supabase:
            return []
        
        try:
            response = self.supabase.table('energy_storage_transactions') \
                .select('*') \
                .eq('plant_id', plant_id) \
                .order('recorded_at', desc=True) \
                .limit(limit) \
                .execute()
            
            return response.data or []
            
        except Exception as e:
            print(f"[ERROR] Get transactions failed: {e}")
            return []
    
    # ==========================================
    # WATER RECYCLING
    # ==========================================
    
    def get_water_recycling_data(self, plant_id: str, hours: int = 24) -> Dict:
        """Get water recycling data for the plant"""
        if not self.supabase:
            return {'error': 'Database not connected'}
        
        try:
            cutoff_time = datetime.now() - timedelta(hours=hours)
            
            response = self.supabase.table('water_recycling') \
                .select('*') \
                .eq('plant_id', plant_id) \
                .gte('recorded_at', cutoff_time.isoformat()) \
                .order('recorded_at', desc=False) \
                .execute()
            
            history = []
            totals = {
                'hydrogen_produced_kg': 0,
                'water_consumed_liters': 0,
                'water_recovered_liters': 0,
                'water_available_for_hydro': 0
            }
            
            for record in response.data or []:
                history.append({
                    'id': record.get('id'),
                    'hydrogen_kg': record.get('hydrogen_produced_kg', 0),
                    'water_consumed': record.get('water_consumed_liters', 0),
                    'water_recovered': record.get('water_recovered_liters', 0),
                    'recovery_efficiency': record.get('recovery_efficiency_percent', 70),
                    'water_for_hydro': record.get('water_available_for_hydro_liters', 0),
                    'time': record.get('recorded_at')
                })
                
                totals['hydrogen_produced_kg'] += record.get('hydrogen_produced_kg', 0)
                totals['water_consumed_liters'] += record.get('water_consumed_liters', 0)
                totals['water_recovered_liters'] += record.get('water_recovered_liters', 0)
                totals['water_available_for_hydro'] += record.get('water_available_for_hydro_liters', 0)
            
            # Calculate overall recovery efficiency
            if totals['water_consumed_liters'] > 0:
                totals['overall_recovery_efficiency'] = (
                    totals['water_recovered_liters'] / totals['water_consumed_liters'] * 100
                )
            else:
                totals['overall_recovery_efficiency'] = 0
            
            return {
                'plant_id': plant_id,
                'hours': hours,
                'history': history,
                'totals': totals,
                'record_count': len(history)
            }
            
        except Exception as e:
            print(f"[ERROR] Get water recycling data failed: {e}")
            return {'error': str(e)}
    
    def calculate_water_recovery(self, hydrogen_produced_kg: float) -> Dict:
        """Calculate water recovery from hydrogen production"""
        water_consumed = hydrogen_produced_kg * self.WATER_PER_KG_H2
        water_recovered = water_consumed * self.WATER_RECOVERY_RATE
        water_for_hydro = water_recovered * 0.9  # 90% of recovered goes to hydro
        
        return {
            'hydrogen_produced_kg': hydrogen_produced_kg,
            'water_consumed_liters': water_consumed,
            'water_recovered_liters': water_recovered,
            'water_for_hydro_liters': water_for_hydro,
            'recovery_efficiency_percent': self.WATER_RECOVERY_RATE * 100,
            'net_water_used_liters': water_consumed - water_recovered
        }
    
    def record_water_recycling(self, plant_id: str, hydrogen_kg: float) -> Dict:
        """Record water recycling entry based on hydrogen production"""
        if not self.supabase:
            return {'error': 'Database not connected'}
        
        try:
            calculation = self.calculate_water_recovery(hydrogen_kg)
            
            self.supabase.table('water_recycling').insert({
                'plant_id': plant_id,
                'hydrogen_produced_kg': hydrogen_kg,
                'water_consumed_liters': calculation['water_consumed_liters'],
                'water_recovered_liters': calculation['water_recovered_liters'],
                'recovery_efficiency_percent': calculation['recovery_efficiency_percent'],
                'water_available_for_hydro_liters': calculation['water_for_hydro_liters']
            }).execute()
            
            return {
                'success': True,
                **calculation
            }
            
        except Exception as e:
            print(f"[ERROR] Record water recycling failed: {e}")
            return {'error': str(e)}
    
    # ==========================================
    # ENERGY BALANCE & OPTIMIZATION
    # ==========================================
    
    def calculate_energy_balance(self, plant_id: str) -> Dict:
        """Calculate overall energy balance with battery storage logic"""
        try:
            # Get production summary
            production = self.get_daily_production_summary(plant_id)
            if 'error' in production:
                return production
            
            # Get battery status
            battery = self.get_battery_status(plant_id)
            if 'error' in battery:
                return battery
            
            # Get water recycling summary
            water = self.get_water_recycling_data(plant_id, hours=24)
            if 'error' in water:
                return water
            
            # Calculate excess from solar (goes to battery)
            solar_generated = production['by_source']['solar']['generated']
            solar_capacity = production['by_source']['solar']['capacity']
            solar_excess = max(0, solar_generated - solar_capacity)
            
            # Calculate excess from wind (also goes to battery)
            wind_generated = production['by_source']['wind']['generated']
            wind_capacity = production['by_source']['wind']['capacity']
            wind_excess = max(0, wind_generated - wind_capacity)
            
            # Hydro potential from recycled water
            water_for_hydro = water['totals']['water_available_for_hydro']
            # Estimate hydro energy potential (simplified: 0.1 kWh per liter at height)
            hydro_potential_kwh = water_for_hydro * 0.1
            
            return {
                'plant_id': plant_id,
                'timestamp': datetime.now().isoformat(),
                'production': {
                    'solar_kwh': solar_generated,
                    'wind_kwh': wind_generated,
                    'hydro_kwh': production['by_source']['hydro']['generated'],
                    'total_kwh': production['total_generated_kwh']
                },
                'capacity': {
                    'solar_kwh': solar_capacity,
                    'wind_kwh': wind_capacity,
                    'hydro_kwh': production['by_source']['hydro']['capacity'],
                    'total_kwh': production['total_capacity_kwh']
                },
                'excess': {
                    'solar_kwh': solar_excess,
                    'wind_kwh': wind_excess,
                    'total_excess_kwh': solar_excess + wind_excess
                },
                'battery': {
                    'capacity_kwh': battery['capacity_kwh'],
                    'current_charge_kwh': battery['current_charge_kwh'],
                    'charge_percent': battery['charge_percent'],
                    'available_for_storage_kwh': battery['capacity_kwh'] - battery['current_charge_kwh'],
                    'health_percent': battery['health_percent']
                },
                'water_recycling': {
                    'hydrogen_produced_kg': water['totals']['hydrogen_produced_kg'],
                    'water_consumed_liters': water['totals']['water_consumed_liters'],
                    'water_recovered_liters': water['totals']['water_recovered_liters'],
                    'water_for_hydro_liters': water_for_hydro,
                    'hydro_potential_kwh': hydro_potential_kwh,
                    'recovery_efficiency_percent': water['totals']['overall_recovery_efficiency']
                },
                'recommendations': self._generate_energy_recommendations(
                    solar_excess, wind_excess, battery, water_for_hydro
                )
            }
            
        except Exception as e:
            print(f"[ERROR] Calculate energy balance failed: {e}")
            return {'error': str(e)}
    
    def _generate_energy_recommendations(self, solar_excess: float, wind_excess: float, 
                                          battery: Dict, water_for_hydro: float) -> List[Dict]:
        """Generate recommendations based on current energy state"""
        recommendations = []
        
        total_excess = solar_excess + wind_excess
        battery_space = battery['capacity_kwh'] - battery['current_charge_kwh']
        
        if total_excess > 0 and battery_space > 0:
            recommendations.append({
                'priority': 'high',
                'action': 'Store excess energy in battery',
                'details': f'Store {min(total_excess, battery_space):.1f} kWh from solar/wind',
                'source': 'solar' if solar_excess >= wind_excess else 'wind'
            })
        
        if total_excess > battery_space:
            recommendations.append({
                'priority': 'medium',
                'action': 'Export excess to grid',
                'details': f'{total_excess - battery_space:.1f} kWh cannot be stored, consider grid export'
            })
        
        if battery['charge_percent'] < 20:
            recommendations.append({
                'priority': 'critical',
                'action': 'Low battery warning',
                'details': f'Battery at {battery["charge_percent"]:.1f}%, prioritize charging'
            })
        
        if water_for_hydro > 1000:
            recommendations.append({
                'priority': 'medium',
                'action': 'Use recycled water for hydro',
                'details': f'{water_for_hydro:.0f} liters available for hydro generation'
            })
        
        return recommendations
    
    def process_excess_energy(self, plant_id: str) -> Dict:
        """Process excess energy - store in battery, log overflow"""
        try:
            balance = self.calculate_energy_balance(plant_id)
            if 'error' in balance:
                return balance
            
            solar_excess = balance['excess']['solar_kwh']
            wind_excess = balance['excess']['wind_kwh']
            
            results = {'actions': []}
            
            # Store solar excess in battery first (up to 40% capacity)
            if solar_excess > 0:
                solar_result = self.charge_battery(plant_id, solar_excess, 'solar')
                results['actions'].append({
                    'type': 'battery_charge',
                    'source': 'solar',
                    'result': solar_result
                })
            
            # Then store wind excess
            if wind_excess > 0:
                wind_result = self.charge_battery(plant_id, wind_excess, 'wind')
                results['actions'].append({
                    'type': 'battery_charge',
                    'source': 'wind',
                    'result': wind_result
                })
            
            # Get updated balance
            results['updated_balance'] = self.calculate_energy_balance(plant_id)
            
            return results
            
        except Exception as e:
            print(f"[ERROR] Process excess energy failed: {e}")
            return {'error': str(e)}


# Global service instance
renewable_energy_service = RenewableEnergyService()
