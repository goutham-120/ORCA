from copy import deepcopy
from typing import Any
class ConversationStore:
    """Validated state is retained server-side for the process lifetime."""
    def __init__(self) -> None: self._items: dict[str, dict[str, Any]] = {}
    def get(self, conversation_id: str | None) -> dict[str, Any]: return deepcopy(self._items.get(conversation_id or "", {}))
    def put(self, conversation_id: str | None, context: dict[str, Any]) -> None:
        if conversation_id: self._items[conversation_id]=deepcopy(context)
