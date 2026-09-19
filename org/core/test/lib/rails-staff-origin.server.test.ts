import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getEdgeEnv } = vi.hoisted(() => ({
  getEdgeEnv: vi.fn(),
}));

vi.mock('../../src/lib/cloudflare-env', () => ({ getEdgeEnv }));

import { getRailsStaffOrigin } from '../../src/lib/rails-staff-origin.server';

describe('getRailsStaffOrigin', () => {
  beforeEach(() => {
    getEdgeEnv.mockReset();
  });

  it('parses a configured string binding', () => {
    getEdgeEnv.mockReturnValue({ RAILS_STAFF_BASE_ORIGIN: 'https://www.umaxica.org' });
    expect(getRailsStaffOrigin()).toBe('https://www.umaxica.org');
  });

  it('treats a non-string binding as missing', () => {
    getEdgeEnv.mockReturnValue({ RAILS_STAFF_BASE_ORIGIN: 123 });
    expect(() => getRailsStaffOrigin()).toThrow(/not configured/u);
  });
});
