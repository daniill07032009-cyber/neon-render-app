from collections import defaultdict
from fastapi import WebSocket


class ChatManager:
    def __init__(self):
        self.chats: dict[str, list[WebSocket]] = defaultdict(list)
        self.users: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect_chat(self, chat_id: str, ws: WebSocket):
        await ws.accept()
        self.chats[chat_id].append(ws)

    def disconnect_chat(self, chat_id: str, ws: WebSocket):
        if ws in self.chats[chat_id]:
            self.chats[chat_id].remove(ws)

    async def broadcast_chat(self, chat_id: str, message: dict):
        for ws in list(self.chats[chat_id]):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect_chat(chat_id, ws)

    async def connect_user(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.users[user_id].append(ws)

    def disconnect_user(self, user_id: str, ws: WebSocket):
        if ws in self.users[user_id]:
            self.users[user_id].remove(ws)

    async def send_to_user(self, user_id: str, payload: dict):
        for ws in list(self.users[user_id]):
            try:
                await ws.send_json(payload)
            except Exception:
                self.disconnect_user(user_id, ws)


chat_manager = ChatManager()