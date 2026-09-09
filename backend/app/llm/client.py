"""Safe optional OpenAI-compatible structured planning boundary."""
from __future__ import annotations
import json, os
from typing import Any, Protocol
from urllib import request
from app.schemas.ai import QueryPlan

class LLMClient(Protocol):
    async def plan(self, query: str, fallback: QueryPlan, persona: str) -> QueryPlan | None: ...

class OpenAICompatibleLLM:
    def __init__(self) -> None:
        self.api_key=os.getenv("ORCA_LLM_API_KEY"); self.base_url=os.getenv("ORCA_LLM_BASE_URL", "https://api.openai.com/v1"); self.model=os.getenv("ORCA_LLM_MODEL", "gpt-4o-mini")
    async def plan(self, query: str, fallback: QueryPlan, persona: str) -> QueryPlan | None:
        if not self.api_key: return None
        prompt=("Return JSON only: intent, requested_domains (ocean/weather/gis/pfz), location_required, time_expression, subtasks [{id,domain,purpose,evidence_required}], response_focus. Do not claim facts, invoke tools, or write code. Query: "+query+" Persona: "+persona)
        try:
            body=json.dumps({"model":self.model,"messages":[{"role":"system","content":"You are ORCA. Never invent marine data."},{"role":"user","content":prompt}],"temperature":0}).encode()
            req=request.Request(self.base_url.rstrip("/")+"/chat/completions", data=body, headers={"Authorization":"Bearer "+self.api_key,"Content-Type":"application/json"})
            with request.urlopen(req, timeout=15) as response: data: dict[str, Any]=json.loads(response.read()) # nosec - deployment-controlled URL
            return QueryPlan.model_validate(json.loads(data["choices"][0]["message"]["content"]))
        except Exception: return None
