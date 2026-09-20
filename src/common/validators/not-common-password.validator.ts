import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { isCommonPassword } from './common-passwords';

@ValidatorConstraint({ name: 'notCommonPassword', async: false })
class NotCommonPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && !isCommonPassword(value);
  }

  defaultMessage(): string {
    return 'This password is too common — pick something less guessable';
  }
}

/** Rejects passwords found in a small denylist of the most common passwords
 * worldwide. Not a full strength check (no entropy scoring) — just stops the
 * laziest signups (see RED_TEAM_REPORT.md P3: password strength). */
export function NotCommonPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: NotCommonPasswordConstraint,
    });
  };
}
