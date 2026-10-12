import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { FOCUSABLE_SELECTOR, resolveTabTrapIndex } from './dialog-focus.utils.ts';

describe('FOCUSABLE_SELECTOR', () => {
  it('bao gồm control native nhưng bỏ qua tabindex="-1"', () => {
    assert.ok(FOCUSABLE_SELECTOR.includes('button:not([disabled])'));
    assert.ok(FOCUSABLE_SELECTOR.includes('input:not([disabled])'));
    assert.ok(FOCUSABLE_SELECTOR.includes('[tabindex]:not([tabindex="-1"])'));
  });
});

describe('resolveTabTrapIndex', () => {
  it('Tab ở control cuối quay về control đầu tiên trong dialog', () => {
    assert.equal(
      resolveTabTrapIndex({ focusableCount: 4, activeIndex: 3, shiftKey: false }),
      0,
    );
  });

  it('Shift+Tab ở control đầu quay về control cuối', () => {
    assert.equal(
      resolveTabTrapIndex({ focusableCount: 4, activeIndex: 0, shiftKey: true }),
      3,
    );
  });

  it('đi tuần tự trong dialog khi Tab/Shift+Tab giữa các control', () => {
    assert.equal(
      resolveTabTrapIndex({ focusableCount: 3, activeIndex: 1, shiftKey: false }),
      2,
    );
    assert.equal(
      resolveTabTrapIndex({ focusableCount: 3, activeIndex: 1, shiftKey: true }),
      0,
    );
  });

  it('focus ngoài dialog (activeIndex -1) được kéo về control đầu/cuối', () => {
    assert.equal(
      resolveTabTrapIndex({ focusableCount: 2, activeIndex: -1, shiftKey: false }),
      0,
    );
    assert.equal(
      resolveTabTrapIndex({ focusableCount: 2, activeIndex: -1, shiftKey: true }),
      1,
    );
  });

  it('dialog chỉ có một control thì giữ nguyên control đó', () => {
    assert.equal(
      resolveTabTrapIndex({ focusableCount: 1, activeIndex: 0, shiftKey: false }),
      0,
    );
    assert.equal(
      resolveTabTrapIndex({ focusableCount: 1, activeIndex: 0, shiftKey: true }),
      0,
    );
  });

  it('dialog không có control nào thì không trap', () => {
    assert.equal(
      resolveTabTrapIndex({ focusableCount: 0, activeIndex: -1, shiftKey: false }),
      null,
    );
  });
});
