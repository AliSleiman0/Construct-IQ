import { BadRequestException } from '@nestjs/common';
import { assertStatusTransition, TransitionMap } from './status-transition.util';

type S = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID';

const MACHINE: TransitionMap<S> = {
  DRAFT: ['ISSUED', 'VOID'],
  ISSUED: ['PAID', 'VOID'],
  PAID: [], // terminal
  // VOID intentionally omitted — also terminal
};

describe('assertStatusTransition', () => {
  it('allows a declared legal transition', () => {
    expect(() => assertStatusTransition('invoice', 'DRAFT', 'ISSUED', MACHINE)).not.toThrow();
    expect(() => assertStatusTransition('invoice', 'ISSUED', 'PAID', MACHINE)).not.toThrow();
  });

  it('throws BadRequestException on an illegal transition', () => {
    expect(() => assertStatusTransition('invoice', 'DRAFT', 'PAID', MACHINE)).toThrow(
      BadRequestException,
    );
  });

  it('includes entity + from→to in the error message', () => {
    expect(() => assertStatusTransition('invoice', 'DRAFT', 'PAID', MACHINE)).toThrow(
      'Invalid invoice status transition: DRAFT → PAID',
    );
  });

  it('treats same-state as an allowed no-op', () => {
    expect(() => assertStatusTransition('invoice', 'PAID', 'PAID', MACHINE)).not.toThrow();
  });

  it('throws from a terminal state (empty transition list)', () => {
    expect(() => assertStatusTransition('invoice', 'PAID', 'ISSUED', MACHINE)).toThrow(
      BadRequestException,
    );
  });

  it('throws from a state with no entry in the map (treated as terminal)', () => {
    expect(() => assertStatusTransition('invoice', 'VOID', 'ISSUED', MACHINE)).toThrow(
      BadRequestException,
    );
  });
});
