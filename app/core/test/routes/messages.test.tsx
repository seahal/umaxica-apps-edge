// @ts-ignore
import '../../test-setup.ts';

import { render, screen } from '@testing-library/react';
import Messages from '../../src/routes/messages/_index';

describe('Messages route', () => {
  it('renders messages page', () => {
    render(<Messages loaderData={{ message: '' }} params={{}} matches={[]} />);

    expect(screen.getByText('Message')).toBeInTheDocument();
    expect(screen.getByText('underconstrution...')).toBeInTheDocument();
  });

  it('accepts loader data', () => {
    render(<Messages loaderData={{ message: 'test' }} params={{}} matches={[]} />);

    expect(screen.getByText('Message')).toBeInTheDocument();
  });
});
