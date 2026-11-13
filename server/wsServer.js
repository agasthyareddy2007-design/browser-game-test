import { WebSocketServer, WebSocket } from 'ws';

const PORT = 5174;
const wss = new WebSocketServer({ port: PORT, host: '0.0.0.0' });

const rooms = new Map();

wss.on('connection', (ws) => {
  let currentRoom = null;
  let playerId = null;
  let username = 'Player';
  let playerColor = 0xff3b30;

  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      return;
    }

    switch (data.type) {
      case 'join': {
        currentRoom = (data.room || 'VICE').trim().toUpperCase();
        username = (data.username || 'Player').trim().slice(0, 16);
        playerId = 'p_' + Math.random().toString(36).substring(2, 9);
        playerColor = data.color || getRandomColor();

        if (!rooms.has(currentRoom)) {
          rooms.set(currentRoom, new Map());
        }
        const roomMap = rooms.get(currentRoom);

        const existingPlayers = [];
        for (const [id, clientWs] of roomMap.entries()) {
          if (clientWs.playerData) {
            existingPlayers.push(clientWs.playerData);
          }
        }

        ws.playerId = playerId;
        ws.playerData = {
          id: playerId,
          username,
          color: playerColor,
          pos: data.pos || [8, 0, 18],
          rot: data.rot || [0, 0],
          anim: 'idle',
          aim: false,
          weapon: 'pistol',
          vehicle: null,
          health: 100,
          armor: 100
        };

        roomMap.set(playerId, ws);

        ws.send(JSON.stringify({
          type: 'welcome',
          playerId,
          room: currentRoom,
          username,
          color: playerColor,
          players: existingPlayers
        }));

        broadcastToRoom(currentRoom, {
          type: 'player_joined',
          player: ws.playerData
        }, ws);

        console.log(`[WS] ${username} joined ${currentRoom}. Total: ${roomMap.size}`);
        break;
      }

      case 'sync': {
        if (!currentRoom || !playerId || !ws.playerData) return;
        ws.playerData.pos = data.pos;
        ws.playerData.rot = data.rot;
        ws.playerData.vel = data.vel;
        ws.playerData.anim = data.anim;
        ws.playerData.aim = data.aim;
        ws.playerData.weapon = data.weapon;
        ws.playerData.vehicle = data.vehicle;
        ws.playerData.health = data.health;
        ws.playerData.armor = data.armor;

        broadcastToRoom(currentRoom, {
          type: 'sync',
          id: playerId,
          pos: data.pos,
          rot: data.rot,
          vel: data.vel,
          anim: data.anim,
          aim: data.aim,
          weapon: data.weapon,
          vehicle: data.vehicle,
          health: data.health,
          armor: data.armor
        }, ws);
        break;
      }

      case 'shoot': {
        if (!currentRoom || !playerId) return;
        broadcastToRoom(currentRoom, {
          type: 'shoot',
          id: playerId,
          weaponId: data.weaponId,
          origin: data.origin,
          dir: data.dir
        }, ws);
        break;
      }

      case 'hit': {
        if (!currentRoom) return;
        const roomMap = rooms.get(currentRoom);
        if (roomMap && roomMap.has(data.targetId)) {
          const targetWs = roomMap.get(data.targetId);
          targetWs.send(JSON.stringify({
            type: 'damaged',
            attackerId: playerId,
            attackerName: username,
            damage: data.damage,
            weaponId: data.weaponId
          }));
        }
        break;
      }

      case 'kill': {
        if (!currentRoom) return;
        broadcastToRoom(currentRoom, {
          type: 'kill_feed',
          killerName: data.killerName || username,
          victimName: data.victimName,
          weaponId: data.weaponId
        });
        break;
      }

      case 'chat': {
        if (!currentRoom || !playerId) return;
        const text = (data.text || '').trim().slice(0, 120);
        if (text) {
          broadcastToRoom(currentRoom, {
            type: 'chat',
            id: playerId,
            username,
            color: playerColor,
            text
          });
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    if (currentRoom && playerId && rooms.has(currentRoom)) {
      const roomMap = rooms.get(currentRoom);
      roomMap.delete(playerId);
      broadcastToRoom(currentRoom, {
        type: 'player_left',
        id: playerId,
        username
      });
      if (roomMap.size === 0) {
        rooms.delete(currentRoom);
      }
    }
  });
});

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 15000);

function broadcastToRoom(roomCode, msg, excludeWs = null) {
  const roomMap = rooms.get(roomCode);
  if (!roomMap) return;
  const str = JSON.stringify(msg);
  for (const clientWs of roomMap.values()) {
    if (clientWs !== excludeWs && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(str);
    }
  }
}

function getRandomColor() {
  const colors = [
    0xff3b30, 0x007aff, 0x34c759, 0xff9500, 0xaf52de,
    0x5856d6, 0x00c7be, 0xff2d55, 0x5ac8fa, 0xffcc00
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

console.log(`[WS Server] Listening on 0.0.0.0:${PORT}`);
