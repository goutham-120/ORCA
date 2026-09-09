"""Safe optional OpenAI-compatible structured planning boundary."""
from __future__ import annotations
import json
import logging
from typing import Any, Protocol
from urllib import request
import requests
from app.config import get_settings
from app.schemas.ai import QueryPlan

logger = logging.getLogger(__name__)

class LLMClient(Protocol):
    async def plan(self, query: str, fallback: QueryPlan, persona: str) -> QueryPlan | None: ...
    async def chat(self, query: str, language: str) -> str | None: ...
    async def synthesize(self, payload: dict[str, Any], language: str) -> str | None: ...

class OpenAICompatibleLLM:
    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = settings.llm_api_key
        self.base_url = settings.llm_base_url
        self.model = settings.llm_model
        self.last_error: str | None = None

    def _response_text(self, prompt: str, instructions: str) -> str | None:
        if not self.api_key:
            self.last_error = "No API key is configured."
            return None
        is_openai_responses = "api.openai.com" in self.base_url.lower()
        if is_openai_responses:
            endpoint = "/responses"
            payload = {"model": self.model, "instructions": instructions, "input": prompt}
        else:
            endpoint = "/chat/completions"
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": instructions},
                    {"role": "user", "content": prompt},
                ],
            }
        url = self.base_url.rstrip("/") + endpoint
        headers = {"Authorization": "Bearer " + self.api_key, "Content-Type": "application/json"}
        try:
            if is_openai_responses:
                req = request.Request(url, data=json.dumps(payload).encode(), headers=headers)
                with request.urlopen(req, timeout=15) as response:
                    data: dict[str, Any] = json.loads(response.read())  # nosec - deployment-controlled URL
            else:
                response = requests.post(url, json=payload, headers=headers, timeout=15)
                response.raise_for_status()
                data = response.json()
            if isinstance(data.get("output_text"), str):
                return data["output_text"]
            choices = data.get("choices")
            if isinstance(choices, list) and choices:
                content = choices[0].get("message", {}).get("content")
                if isinstance(content, str):
                    return content
            for item in data.get("output", []):
                for content in item.get("content", []):
                    if content.get("type") == "output_text" and isinstance(content.get("text"), str):
                        return content["text"]
            self.last_error = "The provider returned no text output."
        except Exception as exc:
            self.last_error = str(exc)
            logger.warning("LLM provider request failed: %s", exc)
        return None

    async def plan(self, query: str, fallback: QueryPlan, persona: str) -> QueryPlan | None:
        if not self.api_key: return None
        prompt=("Return JSON only: intent, requested_domains (ocean/weather/gis/pfz), location_required, time_expression, subtasks [{id,domain,purpose,evidence_required}], response_focus. Do not claim facts, invoke tools, or write code. Query: "+query+" Persona: "+persona)
        try:
            response = self._response_text(prompt, "You are ORCA. Never invent marine data.")
            return QueryPlan.model_validate(json.loads(response)) if response else None
        except Exception as exc:
            self.last_error = str(exc)
            return None
    async def chat(self, query: str, language: str) -> str | None:
        if not self.api_key: return None
        return self._response_text(query, f"You are ORCA, a helpful general conversational assistant. Respond in {language}. Do not claim to have live marine data.")

    async def synthesize(self, payload: dict[str, Any], language: str) -> str | None:
        if not self.api_key:
            return None
        prompt = json.dumps(payload, ensure_ascii=False, default=str)
        instructions = (
            f"You are ORCA, an evidence-grounded marine assistant. Respond naturally in {language}. "
            "Use only the supplied evidence and deterministic decision. Never invent measurements, locations, forecasts, risks, sources, or PFZ data. "
            "If evidence is missing or partial, explain that plainly and do not give a safety clearance. "
            "Do not mention internal agents, nodes, pending capabilities, APIs, or implementation details. "
            "Return only the user-facing answer, with no report headings."
        )
        return self._response_text(prompt, instructions)
