/* eslint-disable import/no-relative-parent-imports */
// @ts-ignore
import '../../test-setup.ts';

import { render, screen } from '@testing-library/react';
import Notifications from '../../src/routes/notifications/_index';

describe('Notifications route', () => {
  it('renders notifications page', () => {
    render(<Notifications loaderData={{ message: '' }} params={{}} matches={[]} />);

    expect(screen.getByText('Notification')).toBeInTheDocument();
    expect(screen.getByText('underconstrution...')).toBeInTheDocument();
  });

  it('accepts loader data', () => {
    render(<Notifications loaderData={{ message: 'test' }} params={{}} matches={[]} />);

    expect(screen.getByText('Notification')).toBeInTheDocument();
  });
});
