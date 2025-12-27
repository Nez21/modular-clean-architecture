export class UserError extends Error {
  type = 'UserError'
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }

  static invalid(): UserError {
    return new UserError('Invalid', 'Invalid user')
  }

  static notFound(): UserError {
    return new UserError('UserNotFound', 'User not found')
  }

  static alreadyExists(): UserError {
    return new UserError('UserAlreadyExists', 'User already exists')
  }

  static invalidCredentials(): UserError {
    return new UserError('InvalidCredentials', 'Invalid email or password')
  }

  static emailAlreadyExists(): UserError {
    return new UserError('EmailAlreadyExists', 'Email already exists')
  }

  toJSON(): Record<string, unknown> {
    return {
      type: this.type,
      code: this.code,
      message: this.message
    }
  }
}
