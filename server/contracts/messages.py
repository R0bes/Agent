"""
Message contracts for the agent system.
Defines the structure for UserMessage and QueenMessage types.
"""

import uuid
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
from typing import Optional, Any, Dict


def uid() -> str:
    """Generate a unique identifier."""
    return str(uuid.uuid4())


def iso() -> str:
    """Get current timestamp in ISO format."""
    return datetime.now(timezone.utc).isoformat()


@dataclass
class UserMessage:
    """Message sent by a user to the system."""

    id: str
    session_id: str
    ts: str
    type: str
    payload: Any

    @classmethod
    def new(
        cls, session_id: str, payload: Any, type_: str = "user.input"
    ) -> "UserMessage":
        """Create a new UserMessage with auto-generated id and timestamp."""
        return cls(
            id=uid(), session_id=session_id, ts=iso(), type=type_, payload=payload
        )


@dataclass
class QueenMessage:
    """Message sent by the Queen/agent system."""

    id: str
    correlation_id: str
    session_id: str
    ts: str
    type: str
    payload: Any
    progress_pct: Optional[float] = None
    stage: Optional[str] = None

    @classmethod
    def make(
        cls,
        correlation_id: str,
        session_id: str,
        payload: Any,
        type_: str,
        progress_pct: Optional[float] = None,
        stage: Optional[str] = None,
    ) -> "QueenMessage":
        """Create a new QueenMessage with auto-generated id and timestamp."""
        return cls(
            id=uid(),
            correlation_id=correlation_id,
            session_id=session_id,
            ts=iso(),
            type=type_,
            payload=payload,
            progress_pct=progress_pct,
            stage=stage,
        )


def to_json(obj: Any) -> Dict[str, Any]:
    """Convert an object to a JSON-serializable dictionary using asdict."""
    return asdict(obj)
