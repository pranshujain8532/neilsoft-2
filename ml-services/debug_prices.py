from services.per_plant_ml_service import per_plant_ml_service
import os
from dotenv import load_dotenv

load_dotenv()

def check_prices():
    print("------- PRICE DEBUG -------")
    try:
        o2 = per_plant_ml_service.fetch_real_time_oxygen_price()
        print(f"Oxygen Price: {o2}")
    except Exception as e:
        print(f"O2 Error: {e}")

    try:
        h2 = per_plant_ml_service.fetch_real_time_hydrogen_price()
        print(f"Hydrogen Price: {h2}")
    except Exception as e:
        print(f"H2 Error: {e}")

if __name__ == "__main__":
    check_prices()
