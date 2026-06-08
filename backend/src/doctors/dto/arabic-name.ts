import { registerDecorator, ValidationOptions } from 'class-validator';

// Doctor name must have at least two whitespace-separated parts and at least
// one Arabic character (spec §1 — "doctor name (Arabic, minimum two parts)").
export function IsArabicMultiPart(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isArabicMultiPart',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          const parts = value.trim().split(/\s+/).filter(Boolean);
          if (parts.length < 2) return false;
          return /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/.test(value);
        },
        defaultMessage() {
          return 'name_ar must contain Arabic text with at least two parts';
        },
      },
    });
  };
}
