import System from './system';
import Player from './player';
import Chat from './chat';

/**
 * @module Events
 * @description
 * A stateless module which handles all socket connections and
 * interface points for other modules to interact with the sockets.
 *
 * This module should not include any mutable state.
 */
let Events = {};

Events.socket = __setup__(io());

Events.updateFn = function() {};

Events.onUpdate = function(fn) {
  Events.updateFn = fn;
};

Events.emit = {};

Events.emit.sendTarget = function(target) {
  Events.socket.emit('player_send_target', target);
};

Events.emit.ping = function() {
  System.status.lastPing = Date.now();
  Events.socket.emit('ping');
};

Events.emit.chat = function(message) {
  Events.socket.emit('player_chat', { message, player: Player });
};

function __setup__(socket) {

  socket.on('pong', function() {
    console.log('Socket: pong');
    let latency = Date.now() - System.status.lastPing;
    Chat.addSystemLine(`Ping: ${latency} ms`);
  });

  socket.on('connect', function() {
    console.log('Socket: connected');
    System.status.connected = true;
  });

  socket.on('connect_failed', function() {
    console.log('Socket: failed');
    socket.close();
    System.status.connected = false;
  });

  socket.on('disconnect', function() {
    console.log('Socket: disconnect');
    socket.close();
    System.status.connected = false;
  });

  socket.on('welcome', function(settings) {
    console.log('Socket: welcome');
    System.status.started = true;

    Player.name = settings.name;
    Player.id = settings.id;
    Player.hue = settings.hue;
  });

  socket.on('player_disconnect', function(event) {
    console.log('Socket: player_disconnect');
    Events.updateFn({ enemies: event.enemies });
    // render player count
    //document.getElementById('status').innerHTML = 'Players: ' + enemies.length;
    Chat.addSystemLine(`Player ${event.disconnectName} disconnected!`);
  });

  socket.on('player_join', function(event) {
    console.log('Socket: player_join');
    Events.updateFn({ enemies: event.enemies });
    // render player count
    //document.getElementById('status').innerHTML = 'Players: ' + enemies.length;
    Chat.addSystemLine(`Player ${event.connectedName} connected!`);
  });

  socket.on('player_rip', function() {
    console.log('Socket: player_rip');
    System.status.started = false;
    socket.close();
  });

  socket.on('server_send_player_chat', function(event) {
    Chat.addChatLine(event.sender, event.message);
  });

  socket.on('server_tell_player_move', function(update, food) {
    Events.updateFn({ food });

    Player.offset.x += (Player.x - update.x);
    Player.offset.y += (Player.y - update.y);
    Player.x = update.x;
    Player.y = update.y;
    Player.mass = update.mass;
    //Player.update(update);
  });

  socket.on('server_tell_update_all', function(enemies, food) {
    Events.updateFn({ enemies, food });
  });

  return socket;
}

export default Events;
