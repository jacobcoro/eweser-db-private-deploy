import type { Room } from '../../model/rooms/schema';
import { generateTTLDate } from '../../model/rooms/helpers';
import jwt from 'jsonwebtoken';
import { SERVER_SECRET } from '../../shared/server-constants';
import type { AccessGrantJWT } from '../../modules/account/access-grant/create-token-from-grant';
import type { AccessGrant } from '../../model/access_grants';
import {
  getAccessGrantById,
  parseAccessGrantId,
  updateAccessGrant,
} from '../../model/access_grants';
import {
  getRoomById,
  getRoomsFromAccessGrant,
  insertRooms,
  updateRoom,
} from '../../model/rooms/calls';
import { db } from '../../services/database';
import { getOrCreateToken } from '../../services/y-sweet/get-or-create-token';
import type { RoomInsert } from '../../model/rooms/validation';
import { AUTH_SERVER_DOMAIN } from '../../shared/constants';
import { refreshTokenIfNeededAndSaveToRoom } from './refresh-token-save-to-room';
import { wait } from '@eweser/shared';
/**
 * Make sure all requested rooms ySweet tokens are up to date
 * 
 * add client created rooms to server `rooms` table. Make a ySweet token for each
 * Add those to the app's access grant.
 * 
 * use all rooms for access grant to re-generate the token.
 * send back all rooms to the client.

 * Also check if any rooms have been marked deleted client-side but aren't marked as such in the database.
 * 
 * TODO: delete (for real) any rooms who's ttl (time to live) has expired. default ttl is 1 month.
 */
export async function syncRoomsWithClient(token: string, clientRooms: Room[]) {
  const { access_grant_id } = jwt.verify(
    token,
    SERVER_SECRET
  ) as AccessGrantJWT; // we don't rely on the rooms list from the token cause it might not be up to date. Fetch rooms based on the grant rules instead.

  const { ownerId: userId } = parseAccessGrantId(access_grant_id);
  if (!userId) {
    throw new Error('Invalid access grant, could not parse user');
  }

  const grant = await getAccessGrantById(access_grant_id);
  if (!grant?.isValid) {
    throw new Error('Invalid access grant');
  }

  const syncResult: { grant: AccessGrant; rooms: Room[] | null } =
    await db().transaction(async (dbInstance) => {
      const serverRooms = await getRoomsFromAccessGrant(grant);
      for (let i: number = 0; i < serverRooms.length; i++) {
        const room = serverRooms[i];
        if (i !== 0) {
          await wait(334); //ysweet will complain if we make too many requests at once
        }
        // TODO: If this slows down the sync a lot, consider removing this and relying on the client calling refresh token for each room instead.
        await refreshTokenIfNeededAndSaveToRoom(room, dbInstance);
      }

      const serverRoomIds = serverRooms.map((r) => r.id);
      const clientRoomIds = clientRooms.map((r) => r.id);

      const finalRoomIds: string[] = [];
      new Set([...serverRoomIds, ...clientRoomIds]).forEach((id) =>
        finalRoomIds.push(id)
      );

      // on the client, but not on the server
      const newClientRoomIds = finalRoomIds.filter(
        (id) => !serverRoomIds.includes(id)
      );
      const newClientRooms = clientRooms.filter((r) =>
        newClientRoomIds.includes(r.id)
      );
      const clientDeletedRooms = clientRooms.filter((r) => r._deleted);

      if (clientDeletedRooms.length > 0) {
        // if any of the client deleted rooms haven't been marked as _deleted on the server, update them. if they don't exist just ignore them.
        for (const room of clientDeletedRooms) {
          if (serverRoomIds.includes(room.id)) {
            const existingRoom = serverRooms.find((r) => r.id === room.id);
            if (existingRoom?._deleted) {
              continue;
            }
            const _ttl = room._ttl || generateTTLDate();
            await updateRoom({ id: room.id, _deleted: true, _ttl }, dbInstance);
          }
        }
      }

      if (newClientRoomIds.length === 0) {
        // if no new client rooms, return the rooms so we don't need to fetch them again
        return { grant, rooms: serverRooms, userId };
      }
      const newClientRoomInserts: RoomInsert[] = [];
      for (const aRoom of newClientRooms) {
        let room: Room = aRoom;
        const existingRoom = await getRoomById(room.id);
        if (existingRoom) {
          room = {
            ...existingRoom,
            ...room,
          };
        }
        // clean up the default accesses if they don't exist
        if (!room.readAccess.includes(AUTH_SERVER_DOMAIN)) {
          room.readAccess.push(AUTH_SERVER_DOMAIN);
        }
        if (!room.writeAccess.includes(AUTH_SERVER_DOMAIN)) {
          room.writeAccess.push(AUTH_SERVER_DOMAIN);
        }
        if (!room.adminAccess.includes(userId)) {
          room.adminAccess.push(userId);
        }
        if (!room.readAccess.includes(userId)) {
          room.readAccess.push(userId);
        }
        if (!room.writeAccess.includes(userId)) {
          room.writeAccess.push(userId);
        }

        if (existingRoom) {
          await updateRoom(room, dbInstance);
          await refreshTokenIfNeededAndSaveToRoom(existingRoom, dbInstance);
        } else {
          // generate ySweet tokens for new client rooms to save to server
          const ySweetToken = await getOrCreateToken(room.id);
          if (!ySweetToken.url) {
            throw new Error(`Could not get token for room ${room.id}`);
          }
          newClientRoomInserts.push({
            ...room,
            ySweetUrl: ySweetToken.url,
            ySweetBaseUrl: ySweetToken.baseUrl,
            tokenExpiry: ySweetToken.expiry,
          });
        }
      }
      // double check tokens made it in inserts
      if (newClientRoomInserts.some((r) => !r.ySweetUrl)) {
        throw new Error('Failed to get ySweet tokens');
      }
      // add new client rooms to server
      await insertRooms(newClientRoomInserts, userId, dbInstance);

      const newGrant = await updateAccessGrant(
        { ...grant, roomIds: finalRoomIds },
        dbInstance
      );
      return { grant: newGrant, rooms: null, userId };
    });

  // if new grant, refetch the room. new client side rooms should have been added by now, and deleted rooms updated
  const rooms =
    syncResult.rooms ?? (await getRoomsFromAccessGrant(syncResult.grant));

  if (!rooms || rooms.length === 0) {
    throw new Error('No rooms found for access grant');
  }

  const accessGrantJwt: AccessGrantJWT = {
    access_grant_id: syncResult.grant.id,
    roomIds: rooms.map(({ id }) => id),
  };

  // resign the JWT to refresh it
  const newToken = jwt.sign(accessGrantJwt, SERVER_SECRET, {
    expiresIn: `${syncResult.grant.keepAliveDays}d`,
  });
  return { rooms, token: newToken, userId };
}
