import { SetTypedMetadata } from '@internal/common'

import { MetadataKeys } from './mediator.const'

const Result = Symbol()

export abstract class BaseCommand<TResult = unknown> {
  [Result]?: TResult
}

export type CommandResultOf<TRequest extends BaseCommand> = NonNullable<TRequest[typeof Result]>

export interface ICommandHandler<TCommand extends BaseCommand = BaseCommand> {
  handle(request: TCommand): CommandResultOf<TCommand> | Promise<CommandResultOf<TCommand>>
}

export const CommandHandler = <TCommandType extends AnyClass<BaseCommand>>(target: TCommandType) => {
  type TCommand = TCommandType['prototype']

  @SetTypedMetadata(MetadataKeys.Command, target)
  abstract class CommandHandler implements ICommandHandler<TCommand> {
    abstract handle(request: TCommand): CommandResultOf<TCommand> | Promise<CommandResultOf<TCommand>>
  }

  return CommandHandler
}
