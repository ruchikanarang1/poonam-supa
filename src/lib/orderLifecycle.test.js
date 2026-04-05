import { describe, test, expect } from 'vitest';
import { validateStatusTransition, ORDER_STATUSES } from './orderLifecycle.js';

describe('orderLifecycle', () => {
  describe('validateStatusTransition', () => {
    test('allows received → sent transition', () => {
      expect(validateStatusTransition('received', 'sent')).toBe(true);
    });

    test('allows sent → payment_received transition', () => {
      expect(validateStatusTransition('sent', 'payment_received')).toBe(true);
    });

    test('prevents received → payment_received (skipping stage)', () => {
      expect(validateStatusTransition('received', 'payment_received')).toBe(false);
    });

    test('prevents sent → received (backward transition)', () => {
      expect(validateStatusTransition('sent', 'received')).toBe(false);
    });

    test('prevents payment_received → sent (backward transition)', () => {
      expect(validateStatusTransition('payment_received', 'sent')).toBe(false);
    });

    test('prevents payment_received → received (backward transition)', () => {
      expect(validateStatusTransition('payment_received', 'received')).toBe(false);
    });

    test('prevents transitions from payment_received (final state)', () => {
      expect(validateStatusTransition('payment_received', 'sent')).toBe(false);
      expect(validateStatusTransition('payment_received', 'received')).toBe(false);
      expect(validateStatusTransition('payment_received', 'payment_received')).toBe(false);
    });

    test('returns false for invalid current status', () => {
      expect(validateStatusTransition('invalid_status', 'sent')).toBe(false);
    });

    test('returns false for invalid new status', () => {
      expect(validateStatusTransition('received', 'invalid_status')).toBe(false);
    });

    test('ORDER_STATUSES constants are defined', () => {
      expect(ORDER_STATUSES.RECEIVED).toBe('received');
      expect(ORDER_STATUSES.SENT).toBe('sent');
      expect(ORDER_STATUSES.PAYMENT_RECEIVED).toBe('payment_received');
    });
  });
});
