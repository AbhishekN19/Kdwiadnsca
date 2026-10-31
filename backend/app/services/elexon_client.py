import httpx
from typing import List, Dict, Any, Optional
from ..config import settings

class ElexonClient:
    """HTTP Client for interacting with Elexon BMRS Insights stream API."""

    def __init__(self, base_url: Optional[str] = None, timeout: float = 25.0):
        self.base_url = (base_url or settings.elexon_base_url).rstrip("/")
        self.timeout = timeout
        self.headers = {
            "User-Agent": "Antigravity-UK-Wind-Monitor/1.0",
            "Accept": "application/json",
        }

    async def fetch_fuelhh_actuals(
        self,
        settlement_date_from: str,
        settlement_date_to: str,
        fuel_type: str = "WIND",
    ) -> List[Dict[str, Any]]:
        """
        Fetch half-hourly actual outturn generation by fuel type.
        Endpoint: /datasets/FUELHH/stream
        """
        url = f"{self.base_url}/datasets/FUELHH/stream"
        params = {
            "settlementDateFrom": settlement_date_from,
            "settlementDateTo": settlement_date_to,
            "fuelType": fuel_type,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(url, params=params, headers=self.headers)
            resp.raise_for_status()
            data = resp.json()
            # Ensure fuelType == WIND
            return [d for d in data if d.get("fuelType") == fuel_type]

    async def fetch_windfor_forecasts(
        self,
        publish_datetime_from: str,
        publish_datetime_to: str,
    ) -> List[Dict[str, Any]]:
        """
        Fetch wind generation forecasts stream.
        Endpoint: /datasets/WINDFOR/stream
        """
        url = f"{self.base_url}/datasets/WINDFOR/stream"
        params = {
            "publishDateTimeFrom": publish_datetime_from,
            "publishDateTimeTo": publish_datetime_to,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(url, params=params, headers=self.headers)
            resp.raise_for_status()
            return resp.json()
