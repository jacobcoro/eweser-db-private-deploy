import type { Registry } from '../../types';
import type { Database } from '../..';
import { wait } from '@eweser/shared';

/** in order not to overwhelm the requests for remote server collect, loading the server connections will be staggered with a default 1 second gap
 * By default will not load remotes
 */
export const loadRooms =
  (db: Database) =>
  async (rooms: Registry, loadRemotes = false, staggerMs = 1000) => {
    const loadedRooms = [];
    db.debug('loading rooms', rooms);
    for (const room of rooms) {
      const loadedRoom = await db.loadRoom(room, { loadRemote: false });
      loadedRooms.push(loadedRoom);
    }
    db.debug('loaded rooms', loadedRooms);
    db.emit('roomsLoaded', loadedRooms);
    if (!loadRemotes) {
      return;
    }
    const remoteLoadedRooms = [];
    let isFirstRoom = true;
    for (const room of rooms) {
      if (!isFirstRoom) {
        await wait(staggerMs);
      } else {
        isFirstRoom = false;
      }
      const remoteLoadedRoom = await db.loadRoom(room, {
        loadRemote: true,
        awaitLoadRemote: true,
      });
      if (
        remoteLoadedRoom.ySweetProvider &&
        remoteLoadedRoom.ySweetProvider?.status !== 'error' &&
        remoteLoadedRoom.ySweetProvider?.status !== 'offline'
      ) {
        remoteLoadedRooms.push(remoteLoadedRoom);
      }
    }
    db.debug('loaded remotes for rooms', remoteLoadedRooms);
    db.emit('roomsRemotesLoaded', remoteLoadedRooms);
  };
