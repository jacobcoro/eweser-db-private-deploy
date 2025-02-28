import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { COLLECTION_KEYS } from '../../shared/constants';
import { PUBLIC_ACCESS_TYPES } from '@eweser/shared';

export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().notNull(),

  name: text('name').notNull(), // user facing name of the room ('folder')

  collectionKey: text('collection_key', {
    enum: COLLECTION_KEYS,
  }).notNull(),

  tokenExpiry: timestamp('token_expiry', {
    withTimezone: true,
    mode: 'string',
  }), // when the token expires
  ySweetUrl: text('y_sweet_url'), // y-sweet url to sync the document
  ySweetBaseUrl: text('y_sweet_base_url'), // y-sweet url to sync the document

  publicAccess: text('public_access', { enum: PUBLIC_ACCESS_TYPES })
    .default('private')
    .notNull(), // if not 'private', will ignore the user lists below for read and write and, anyone can access the room. Will invite all aggregators.

  readAccess: text('read_access').array().notNull(), // requester_id array, could be user ids or app domains
  writeAccess: text('write_access').array().notNull(), // requester_id array, could be user ids or app domains
  adminAccess: text('admin_access').array().notNull(), // requester_id array, could be user ids or app domains. Can change access and invite others.

  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),

  _deleted: boolean('_deleted').default(false),
  _ttl: timestamp('_ttl', { withTimezone: true, mode: 'string' }),
});

export type Room = typeof rooms.$inferSelect;
