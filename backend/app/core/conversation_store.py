from copy import deepcopy
from typing import Any


class ConversationStore:
    """Validated state and multi-turn message history is retained server-side for the process lifetime."""

    def __init__(self) -> None:
        self._contexts: dict[str, dict[str, Any]] = {}
        self._histories: dict[str, list[dict[str, Any]]] = {}

    def get(self, conversation_id: str | None) -> dict[str, Any]:
        return deepcopy(self._contexts.get(conversation_id or "", {}))

    def put(self, conversation_id: str | None, context: dict[str, Any]) -> None:
        if conversation_id:
            self._contexts[conversation_id] = deepcopy(context)

    def get_history(self, conversation_id: str | None, limit: int = 10) -> list[dict[str, Any]]:
        if not conversation_id or conversation_id not in self._histories:
            return []
        return deepcopy(self._histories[conversation_id][-limit:])

    def append_message(self, conversation_id: str | None, role: str, content: str, metadata: dict[str, Any] | None = None) -> None:
        if not conversation_id:
            return
        if conversation_id not in self._histories:
            self._histories[conversation_id] = []
        self._histories[conversation_id].append({
            "role": role,
            "content": content,
            "metadata": metadata or {},
        })
        if len(self._histories[conversation_id]) > 30:
            self._histories[conversation_id] = self._histories[conversation_id][-30:]

