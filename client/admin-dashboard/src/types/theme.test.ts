import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { toggleResolvedTheme } from './theme.ts';

describe('toggleResolvedTheme', () => {
  it('switches from light to dark', () => {
    assert.equal(toggleResolvedTheme('light'), 'dark');
  });

  it('switches from dark to light', () => {
    assert.equal(toggleResolvedTheme('dark'), 'light');
  });
});
