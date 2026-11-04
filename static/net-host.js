// Host side of the network: owns the Room, accepts phone connections, pushes views.

let ROOM_OBJ = null;
const CONNS = new Map();  // pid -> DataConnection

function randomCode() {
  return Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ"[rand(24)]).join("");
}

function hostUpdate() {
  ROOM_OBJ.broadcast();
  try { sessionStorage.setItem("kc_host_room", ROOM_OBJ.dump()); } catch (e) {}
}

function hostAct(a, p) {
  if (ROOM_OBJ.hostAction(a, p)) hostUpdate();
}

function onPhoneData(conn, msg) {
  const room = ROOM_OBJ;
  if (msg.t === "join") {
    let pid = null;
    if (msg.cid) {
      if (!room.players[msg.cid]) { conn.send({ t: "error", error: "room_gone" }); return; }
      pid = msg.cid;
    } else {
      const r = room.join(msg.name);
      if (r.error) { conn.send({ t: "error", error: r.error }); return; }
      pid = r.cid;
    }
    const old = CONNS.get(pid);
    if (old && old !== conn) { old.pid = null; old.close(); }
    conn.pid = pid;
    CONNS.set(pid, conn);
    room.players[pid].connected = true;
    conn.send({ t: "joined", cid: pid, room: room.code, name: room.players[pid].name });
    hostUpdate();
  } else if (msg.t === "act" && conn.pid) {
    if (room.playerAction(conn.pid, msg.a, msg.p)) hostUpdate();
  }
}

function startHosting(room, onView, onCode) {
  ROOM_OBJ = room;
  room.send = (cid, view) => {
    if (cid === "host") return onView(view);
    const c = CONNS.get(cid);
    if (c && c.open) c.send({ t: "state", s: view });
    if (view.kicked && c) setTimeout(() => c.close(), 300);
  };
  setInterval(() => { if (room.tick(now())) hostUpdate(); }, 200);

  let tries = 0;
  const open = () => {
    const peer = new Peer(peerId(room.code), { debug: 1 });
    peer.on("open", () => { showConn(false); onCode(room.code); hostUpdate(); });
    peer.on("connection", (conn) => {
      conn.on("data", (msg) => onPhoneData(conn, msg));
      conn.on("close", () => {
        if (conn.pid && CONNS.get(conn.pid) === conn) {
          CONNS.delete(conn.pid);
          if (room.players[conn.pid]) room.players[conn.pid].connected = false;
          hostUpdate();
        }
      });
    });
    peer.on("disconnected", () => { showConn(true); setTimeout(() => !peer.destroyed && peer.reconnect(), 1500); });
    peer.on("error", (e) => {
      if (e.type === "unavailable-id") {
        // After a refresh the old id can linger for a few seconds; after that, take a fresh code.
        peer.destroy();
        tries++;
        if (tries > 5) room.code = randomCode();
        setTimeout(open, 2000);
      } else if (["network", "server-error", "socket-error", "socket-closed"].includes(e.type)) {
        showConn(true);
      }
    });
  };
  open();
}
