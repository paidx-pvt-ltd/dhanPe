import { describe, expect, it } from 'vitest';
import { isSelfTransfer } from './self-transfer.util.js';

describe('isSelfTransfer', () => {
  it('blocks exact normalized matches', () => {
    expect(isSelfTransfer('RAHUL KUMAR SHARMA', 'Rahul Kumar Sharma')).toBe(true);
  });

  it('blocks high token overlap', () => {
    expect(isSelfTransfer('Amit Kumar Singh', 'Amit K Singh')).toBe(true);
  });

  it('blocks close Levenshtein matches', () => {
    expect(isSelfTransfer('Jonathan Smith', 'Jonathan Smyth')).toBe(true);
  });

  it('allows clearly different names', () => {
    expect(isSelfTransfer('Rahul Kumar Sharma', 'Anita Desai')).toBe(false);
  });
});
