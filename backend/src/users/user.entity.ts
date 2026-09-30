import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A registered player.
 *
 * Uniqueness of username and email is case-insensitive, enforced by unique
 * indexes on lower(...) in the migration — "Nam" and "nam" are one account.
 * The username keeps the casing it was registered with, for display.
 */
@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  username: string;

  /** Stored lowercased. */
  @Column({ type: 'varchar', length: 254 })
  email: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  passwordHash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

/** The shape that leaves the API — never the hash. */
export interface PublicUser {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    createdAt: u.createdAt.toISOString(),
  };
}
