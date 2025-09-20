from fastapi import FastAPI
from fastapi.responses import ORJSONResponse
import fastf1
from fastf1.core import Laps
import pandas as pd
import os

app = FastAPI(default_response_class=ORJSONResponse)

# Cache setup for speed
cache_dir = os.environ.get("FASTF1_CACHE", "/tmp/fastf1-cache")
os.makedirs(cache_dir, exist_ok=True)
fastf1.Cache.enable_cache(cache_dir)

def to_ms(seconds):
    if seconds is None or pd.isna(seconds):
        return None
    return int(float(seconds) * 1000)

@app.get("/session")
def get_session_info(year: int | None = None, gp: int | None = None, session: str | None = None):
    # Defaults: latest race weekend if not provided
    year = year or int(os.environ.get("FASTF1_YEAR", 2024))
    gp = gp or int(os.environ.get("FASTF1_GP", 1))
    session = session or os.environ.get("FASTF1_SESSION", "R")
    try:
        ses = fastf1.get_session(year, gp, session)
        ses.load(laps=True, telemetry=False, messages=False)
        circ = {
            "name": ses.event.EventName,
            "country": ses.event.Country
        }
        return {"circuit": circ, "provider": "fastf1"}
    except Exception:
        return {"circuit": None, "provider": "fastf1"}

@app.get("/snapshot")
def get_snapshot(year: int | None = None, gp: int | None = None, session: str | None = None):
    year = year or int(os.environ.get("FASTF1_YEAR", 2024))
    gp = gp or int(os.environ.get("FASTF1_GP", 1))
    session = session or os.environ.get("FASTF1_SESSION", "R")
    try:
        ses = fastf1.get_session(year, gp, session)
        ses.load(laps=True, telemetry=False)
        laps: Laps = ses.laps
        latest_per_driver = laps.sort_values("LapNumber", ascending=False).groupby("Driver").head(1)
        data = []
        for _, row in latest_per_driver.iterrows():
            driver_code = row.get("Driver") or row.get("DriverNumber") or "DR"
            s1 = to_ms(row.get("Sector1Time"))
            s2 = to_ms(row.get("Sector2Time"))
            s3 = to_ms(row.get("Sector3Time"))
            lap_time = to_ms(row.get("LapTime"))
            item = {
                "driverId": driver_code,
                "driverCode": driver_code,
                "team": str(row.get("Team", "Unknown")),
                "lap": int(row.get("LapNumber", 0) or 0),
                "lapTimeMs": lap_time,
                "sectors": [
                    {"sectorId": "S1", "timeMs": s1, "miniSectors": [], "status": "yellow"},
                    {"sectorId": "S2", "timeMs": s2, "miniSectors": [], "status": "yellow"},
                    {"sectorId": "S3", "timeMs": s3, "miniSectors": [], "status": "yellow"}
                ],
                "positionOnTrackPct": 0,
                "speedKph": 0,
                "isOnHotLap": False,
                "timestamp": int(pd.Timestamp.utcnow().timestamp() * 1000)
            }
            data.append(item)
        return {"telemetry": data}
    except Exception:
        return {"telemetry": []}

