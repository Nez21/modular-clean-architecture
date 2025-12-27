export enum UserErrorCode {
  Invalid = 'Invalid',
  NotFound = 'NotFound',
  AlreadyExists = 'AlreadyExists',
  InvalidCredentials = 'InvalidCredentials',
  EmailAlreadyExists = 'EmailAlreadyExists'
}

export class UserError extends Error {
  type = 'UserError'
  code: UserErrorCode

  constructor(code: UserErrorCode, message: string) {
    super(message)
    this.code = code
  }

  static invalid(): UserError {
    return new UserError(UserErrorCode.Invalid, 'Invalid user')
  }

  static notFound(): UserError {
    return new UserError(UserErrorCode.NotFound, 'User not found')
  }

  static alreadyExists(): UserError {
    return new UserError(UserErrorCode.AlreadyExists, 'User already exists')
  }

  static invalidCredentials(): UserError {
    return new UserError(UserErrorCode.InvalidCredentials, 'Invalid email or password')
  }

  static emailAlreadyExists(): UserError {
    return new UserError(UserErrorCode.EmailAlreadyExists, 'Email already exists')
  }

  toJSON(): Record<string, unknown> {
    return {
      type: this.type,
      code: this.code,
      message: this.message
    }
  }
}
