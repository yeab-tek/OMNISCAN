"""
app/routers/notifications_ws.py

WS /notifications/ws?token=<jwt>

Authenticated WebSocket endpoint for real-time notification delivery.
Token is passed as a query param because browsers can't set custom
headers on WebSocket handshakes.

Maintains an in-memory connection registry so create_notification()
(in app/routers/notifications.py) can push new notifications instantly
to the right user and/or everyone with a given role.

NOTE: this in-memory registry is per-process. If you run multiple
uvicorn/gunicorn workers, sockets connected to worker A won't receive
pushes triggered on worker B. Fine for local dev / single-worker deploys;
would need Redis pub/sub to scale to multiple workers.
"""
import uuid
from collections import defaultdict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from app.core.security import decode_access_token
from app.models.notification import Notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class ConnectionManager:
    def __init__(self):
        # user_id -> set of active websockets for that user (multiple tabs/devices)
        self.by_user: dict[uuid.UUID, set[WebSocket]] = defaultdict(set)
        # role -> set of active websockets for users with that role
        self.by_role: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, ws: WebSocket, user_id: uuid.UUID, role: str):
        await ws.accept()
        self.by_user[user_id].add(ws)
        self.by_role[role].add(ws)

    def disconnect(self, ws: WebSocket, user_id: uuid.UUID, role: str):
        self.by_user[user_id].discard(ws)
        if not self.by_user[user_id]:
            del self.by_user[user_id]
        self.by_role[role].discard(ws)
        if not self.by_role[role]:
            del self.by_role[role]

    async def send_to_user(self, user_id: uuid.UUID, payload: dict):
        dead = []
        for ws in self.by_user.get(user_id, ()):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.by_user[user_id].discard(ws)

    async def send_to_role(self, role: str, payload: dict):
        dead = []
        for ws in self.by_role.get(role, ()):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.by_role[role].discard(ws)


manager = ConnectionManager()


def _serialize(notif: Notification) -> dict:
    return {
        "id": str(notif.id),
        "user_id": str(notif.user_id) if notif.user_id else None,
        "target_role": notif.target_role,
        "title": notif.title,
        "message": notif.message,
        "type": notif.type,
        "category": notif.category,
        "read": notif.read,
        "created_at": notif.created_at.isoformat(),
    }


async def push_notification(notif: Notification):
    """Called by create_notification() right after a successful insert."""
    payload = {"event": "notification", "data": _serialize(notif)}
    if notif.user_id:
        await manager.send_to_user(notif.user_id, payload)
    elif notif.target_role:
        await manager.send_to_role(notif.target_role, payload)


@router.websocket("/ws")
async def notifications_ws(websocket: WebSocket, token: str):
    # decode_access_token returns None on failure (invalid/expired token),
    # rather than raising — handle that explicitly, don't rely on try/except.
    payload = decode_access_token(token)
    if payload is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        user_id = uuid.UUID(payload["sub"])
        role = payload["role"]
    except (KeyError, ValueError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket, user_id, role)
    try:
        while True:
            # We don't expect incoming messages, but need to await something
            # to detect disconnects. Ignore whatever the client sends.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket, user_id, role)