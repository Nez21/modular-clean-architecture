import { Injectable } from '@nestjs/common'

import { IUserRepository } from '#/domain/repositories'

@Injectable()
export class UserRepository implements IUserRepository {}
