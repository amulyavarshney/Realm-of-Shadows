"""
Realm of Shadows — online multiplayer backend
"""
from __future__ import annotations

import asyncio
import json
import os
import random
import re
import time
import uuid
from typing import Any, Dict, List, Optional

from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from game_engine import (
    COUNT_CONFIG,
    GameState,
    advance_after_mission_reveal,
    advance_after_vote_reveal,
    assassinate,
    build_player_view,
    cast_vote,
    new_game_state,
    play_mission_card,
    propose_team,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    task = asyncio.create_task(purge_stale_rooms())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="Realm of Shadows API", docs_url=None, redoc_url=None, lifespan=lifespan)
# MVP: permissive CORS for dev/staging. Restrict allow_origins to your production domain before launch.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOM_TTL_SEC = 60 * 60  # 1 hour idle
CLEAN_INTERVAL_SEC = 120


class CreateRoomBody(BaseModel):
    host_name: str = Field(min_length=2, max_length=16)
    advanced_roles: bool = True


class Player:
    __slots__ = ("id", "name", "is_host", "connected", "ws", "role", "knowledge")

    def __init__(self, name: str, is_host: bool = False, player_id: Optional[str] = None):
        self.id = player_id or str(uuid.uuid4())
        self.name = name
        self.is_host = is_host
        self.connected = True
        self.ws: Optional[WebSocket] = None
        self.role: Optional[str] = None
        self.knowledge: Dict[str, Any] = {"sees": [], "hint": ""}


class Room:
    __slots__ = ("code", "advanced_roles", "players", "host_id", "started", "lock", "touched", "game")

    def __init__(self, code: str, advanced_roles: bool):
        self.code = code
        self.advanced_roles = advanced_roles
        self.players: Dict[str, Player] = {}
        self.host_id: Optional[str] = None
        self.started = False
        self.lock = asyncio.Lock()
        self.touched = time.time()
        self.game: Optional[GameState] = None

    def touch(self) -> None:
        self.touched = time.time()

    def player_names(self) -> Dict[str, str]:
        return {pid: p.name for pid, p in self.players.items()}


ROOM_CODE_RE = re.compile(r"^\d{4}$")


def validate_room_code(code: str) -> None:
    """Reject malformed room codes before touching in-memory store."""
    if not ROOM_CODE_RE.match(code):
        raise HTTPException(400, "Invalid room code format")


rooms: Dict[str, Room] = {}


def gen_code() -> str:
    for _ in range(50):
        code = f"{random.randint(0, 9999):04d}"
        if code not in rooms:
            return code
    raise RuntimeError("Could not allocate room code")


def assign_roles(players: List[Player], advanced: bool) -> None:
    n = len(players)
    cfg = COUNT_CONFIG[n]
    good_special = ["seer"]
    evil_special = ["assassin"]
    if advanced:
        if cfg["good"] >= 4:
            good_special.append("guardian")
        if cfg["evil"] >= 2:
            evil_special.append("sorceress")
        if cfg["evil"] >= 3:
            evil_special.append("shadow_lord")
        if cfg["evil"] >= 4:
            evil_special.append("rogue")
    roles: List[str] = []
    roles.extend(good_special[: cfg["good"]])
    roles.extend(["knight"] * (cfg["good"] - min(len(good_special), cfg["good"])))
    roles.extend(evil_special[: cfg["evil"]])
    roles.extend(["cultist"] * (cfg["evil"] - min(len(evil_special), cfg["evil"])))
    random.shuffle(roles)
    for p, role in zip(players, roles):
        p.role = role

    for p in players:
        others = [x for x in players if x.id != p.id]
        if p.role == "seer":
            p.knowledge = {
                "sees": [x.name for x in others if x.role in ("cultist", "assassin", "sorceress", "rogue")],
                "hint": "You see the taint of evil upon these souls.",
            }
        elif p.role == "guardian":
            names = [x.name for x in others if x.role in ("seer", "sorceress")]
            random.shuffle(names)
            p.knowledge = {
                "sees": names,
                "hint": "One among these is the Seer, another the Sorceress.",
            }
        elif p.role in ("cultist", "assassin", "sorceress"):
            p.knowledge = {
                "sees": [
                    x.name
                    for x in others
                    if x.role in ("cultist", "assassin", "sorceress", "shadow_lord")
                ],
                "hint": "These walk in shadow with you.",
            }
        elif p.role == "shadow_lord":
            p.knowledge = {
                "sees": [x.name for x in others if x.role in ("cultist", "assassin", "sorceress")],
                "hint": "Your allies — yet the Seer cannot perceive you.",
            }
        elif p.role == "rogue":
            p.knowledge = {"sees": [], "hint": "You walk alone in shadow."}
        else:
            p.knowledge = {"sees": [], "hint": "You are a loyal Knight. Trust wisely."}


async def send(ws: WebSocket, event: str, payload: Any) -> None:
    await ws.send_text(json.dumps({"event": event, "payload": payload}, separators=(",", ":")))


def lobby_payload(room: Room) -> Dict[str, Any]:
    return {
        "players": [
            {
                "id": p.id,
                "name": p.name,
                "is_host": p.is_host,
                "connected": p.connected,
            }
            for p in room.players.values()
        ],
        "host_id": room.host_id,
    }


async def broadcast_lobby(room: Room) -> None:
    if room.started:
        return
    payload = lobby_payload(room)
    await asyncio.gather(
        *[
            send(p.ws, "lobby", payload)
            for p in room.players.values()
            if p.ws is not None and p.connected
        ],
        return_exceptions=True,
    )


async def broadcast_game_state(room: Room) -> None:
    if not room.game:
        return
    names = room.player_names()
    await asyncio.gather(
        *[
            _send_player_state(room, p)
            for p in room.players.values()
            if p.ws is not None and p.connected
        ],
        return_exceptions=True,
    )


async def _send_player_state(room: Room, p: Player) -> None:
    assert room.game and p.ws and p.role
    view = build_player_view(room.game, p.id, room.player_names())
    await send(p.ws, "game_state", view)


async def _notify_start(p: Player) -> None:
    assert p.ws and p.role
    await send(p.ws, "role_assigned", {"role": p.role, "knowledge": p.knowledge})
    await send(p.ws, "game_started", {})


async def _start_game(room: Room) -> None:
    plist = list(room.players.values())
    assign_roles(plist, room.advanced_roles)
    player_ids = [p.id for p in plist]
    roles = {p.id: p.role for p in plist if p.role}
    room.game = new_game_state(player_ids, roles)
    room.started = True
    await asyncio.gather(
        *[_notify_start(p) for p in plist if p.ws is not None and p.connected and p.role],
        return_exceptions=True,
    )
    await broadcast_game_state(room)


async def purge_stale_rooms() -> None:
    while True:
        await asyncio.sleep(CLEAN_INTERVAL_SEC)
        now = time.time()
        stale = [code for code, room in rooms.items() if now - room.touched > ROOM_TTL_SEC]
        for code in stale:
            rooms.pop(code, None)


@app.get("/api/health")
async def health():
    return {"ok": True, "app": "realm-of-shadows", "rooms": len(rooms)}


@app.post("/api/rooms")
async def create_room(body: CreateRoomBody):
    name = body.host_name.strip()
    if len(name) < 2:
        raise HTTPException(400, "Name too short")
    code = gen_code()
    room = Room(code, body.advanced_roles)
    host = Player(name, is_host=True)
    room.players[host.id] = host
    room.host_id = host.id
    rooms[code] = room
    return {"code": code, "host_id": host.id}


@app.get("/api/rooms/{code}")
async def get_room(code: str):
    validate_room_code(code)
    room = rooms.get(code)
    if not room:
        raise HTTPException(404, "Room not found")
    room.touch()
    return {"code": code, "player_count": len(room.players), "started": room.started}


async def _handle_join(room: Room, websocket: WebSocket, msg: dict) -> Optional[Player]:
    pid = msg.get("player_id")
    name = (msg.get("name") or "Guest").strip()[:16]
    is_host = bool(msg.get("is_host"))

    if room.started:
        if pid and pid in room.players:
            player = room.players[pid]
            player.connected = True
            player.ws = websocket
            if name:
                player.name = name
            await send(websocket, "joined", {"player_id": player.id})
            if player.role:
                await send(
                    websocket,
                    "role_assigned",
                    {"role": player.role, "knowledge": player.knowledge},
                )
                await send(websocket, "game_started", {})
                await _send_player_state(room, player)
            return player
        await send(websocket, "error", {"message": "Game already started"})
        return None

    if pid and pid in room.players:
        player = room.players[pid]
        player.connected = True
        player.ws = websocket
        player.name = name or player.name
    elif is_host and room.host_id and room.host_id in room.players:
        player = room.players[room.host_id]
        player.connected = True
        player.ws = websocket
        player.name = name or player.name
    else:
        if len(room.players) >= 10:
            await send(websocket, "error", {"message": "Room is full"})
            return None
        existing = {p.name.lower() for p in room.players.values()}
        if name.lower() in existing:
            await send(websocket, "error", {"message": "Name already taken"})
            return None
        player = Player(name, is_host=False)
        if is_host and not room.host_id:
            player.is_host = True
            room.host_id = player.id
        room.players[player.id] = player
        player.ws = websocket

    await send(websocket, "joined", {"player_id": player.id})
    await broadcast_lobby(room)
    return player


@app.websocket("/api/ws/{code}")
async def ws_room(websocket: WebSocket, code: str):
    if not ROOM_CODE_RE.match(code):
        await websocket.accept()
        await send(websocket, "error", {"message": "Invalid room code format"})
        await websocket.close()
        return
    room = rooms.get(code)
    if not room:
        await websocket.accept()
        await send(websocket, "error", {"message": "Room not found"})
        await websocket.close()
        return

    await websocket.accept()
    player: Optional[Player] = None
    room.touch()

    try:
        while True:
            raw = await websocket.receive_text()
            room.touch()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            mtype = msg.get("type")

            if mtype == "join":
                async with room.lock:
                    player = await _handle_join(room, websocket, msg)
                continue

            if not player or player.id not in room.players:
                await send(websocket, "error", {"message": "Join the room first"})
                continue

            if mtype == "start_game":
                async with room.lock:
                    if player.id != room.host_id:
                        await send(websocket, "error", {"message": "Only the host may begin"})
                        continue
                    if room.started:
                        await send(websocket, "error", {"message": "Game already started"})
                        continue
                    n = len(room.players)
                    if n < 5 or n > 10:
                        await send(websocket, "error", {"message": "Need 5 to 10 players to begin."})
                        continue
                    await _start_game(room)

            elif mtype == "propose_team":
                async with room.lock:
                    if not room.game:
                        await send(websocket, "error", {"message": "Game not started"})
                        continue
                    team = msg.get("team") or []
                    if not isinstance(team, list):
                        await send(websocket, "error", {"message": "Invalid team"})
                        continue
                    room.game, err = propose_team(room.game, player.id, team)
                    if err:
                        await send(websocket, "error", {"message": err})
                    else:
                        await broadcast_game_state(room)

            elif mtype == "cast_vote":
                async with room.lock:
                    if not room.game:
                        await send(websocket, "error", {"message": "Game not started"})
                        continue
                    vote = msg.get("vote")
                    if vote not in ("approve", "reject"):
                        await send(websocket, "error", {"message": "Invalid vote"})
                        continue
                    room.game, err = cast_vote(room.game, player.id, vote)
                    if err:
                        await send(websocket, "error", {"message": err})
                    else:
                        await broadcast_game_state(room)

            elif mtype == "advance_phase":
                async with room.lock:
                    if not room.game:
                        await send(websocket, "error", {"message": "Game not started"})
                        continue
                    phase = room.game.phase
                    if phase == "vote_reveal":
                        room.game, err = advance_after_vote_reveal(room.game)
                    elif phase == "mission_reveal":
                        room.game, err = advance_after_mission_reveal(room.game)
                    else:
                        await send(websocket, "error", {"message": "Cannot advance from this phase"})
                        continue
                    if err:
                        await send(websocket, "error", {"message": err})
                    else:
                        await broadcast_game_state(room)

            elif mtype == "play_mission_card":
                async with room.lock:
                    if not room.game:
                        await send(websocket, "error", {"message": "Game not started"})
                        continue
                    card = msg.get("card")
                    if card not in ("success", "fail"):
                        await send(websocket, "error", {"message": "Invalid card"})
                        continue
                    room.game, err = play_mission_card(room.game, player.id, card)
                    if err:
                        await send(websocket, "error", {"message": err})
                    else:
                        await broadcast_game_state(room)

            elif mtype == "assassinate":
                async with room.lock:
                    if not room.game:
                        await send(websocket, "error", {"message": "Game not started"})
                        continue
                    target_id = msg.get("target_id")
                    if not target_id or not isinstance(target_id, str):
                        await send(websocket, "error", {"message": "Invalid target"})
                        continue
                    room.game, err = assassinate(room.game, player.id, target_id)
                    if err:
                        await send(websocket, "error", {"message": err})
                    else:
                        target = room.players.get(target_id)
                        if target and room.game:
                            if room.game.winner == "evil":
                                room.game.win_reason = (
                                    f"The Assassin struck true — {target.name} was the Seer."
                                )
                            else:
                                room.game.win_reason = (
                                    f"The Assassin's blade missed — {target.name} was not the Seer."
                                )
                        await broadcast_game_state(room)

            elif mtype == "ping":
                if player.ws:
                    await send(player.ws, "pong", {})

    except WebSocketDisconnect:
        pass
    finally:
        if player and room:
            async with room.lock:
                player.connected = False
                player.ws = None
                if not room.started:
                    await broadcast_lobby(room)
                else:
                    await broadcast_game_state(room)


if __name__ == "__main__":
    import uvicorn

    reload = os.environ.get("RELOAD", "0") == "1"
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8000")),
        reload=reload,
        log_level="info",
    )
