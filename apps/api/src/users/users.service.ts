import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from './user.entity.js';

export type CreateUserResult = { user: User } | { taken: 'username' | 'email' };

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  /**
   * For sign-in: by email when the identifier contains '@', else by username.
   * Both case-insensitive. Includes the password hash, which is otherwise
   * never selected.
   */
  findForLogin(identifier: string): Promise<User | null> {
    const column = identifier.includes('@') ? 'email' : 'username';
    return this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where(`lower(u.${column}) = lower(:identifier)`, { identifier })
      .getOne();
  }

  async create(
    username: string,
    email: string,
    passwordHash: string,
  ): Promise<CreateUserResult> {
    const clash = await this.users
      .createQueryBuilder('u')
      .where('lower(u.username) = lower(:username)', { username })
      .orWhere('lower(u.email) = lower(:email)', { email })
      .getOne();
    if (clash) {
      return {
        taken:
          clash.username.toLowerCase() === username.toLowerCase()
            ? 'username'
            : 'email',
      };
    }
    try {
      const user = await this.users.save(
        this.users.create({ username, email, passwordHash }),
      );
      return { user };
    } catch (err) {
      // Lost a race with a concurrent registration: the unique index decides.
      const constraint = (err as { driverError?: { constraint?: string } })
        .driverError?.constraint;
      if (
        err instanceof QueryFailedError &&
        constraint === 'users_username_lower_key'
      )
        return { taken: 'username' };
      if (
        err instanceof QueryFailedError &&
        constraint === 'users_email_lower_key'
      )
        return { taken: 'email' };
      throw err;
    }
  }
}
