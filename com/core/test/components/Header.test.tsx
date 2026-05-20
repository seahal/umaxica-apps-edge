import '../../test-setup.ts';

import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { Header } from '../../src/components/Header';

function renderHeader(props = {}) {
  const Stub = createRoutesStub([
    {
      Component: () => <Header {...props} />,
      path: '*',
    },
  ]);
  return render(<Stub />);
}

describe('Header component (com)', () => {
  it('renders branding with code name', () => {
    renderHeader({ codeName: 'TEST_BRAND' });
    expect(screen.getAllByText('TEST_BRAND').length).toBeGreaterThan(0);
  });

  it('renders external links when provided', () => {
    renderHeader({
      docsServiceUrl: 'docs.example.com',
      helpServiceUrl: 'help.example.com',
      newsServiceUrl: 'news.example.com',
    });

    expect(screen.getByRole('link', { name: '📰' })).toHaveAttribute(
      'href',
      'https://news.example.com',
    );
    expect(screen.getByRole('link', { name: '📚' })).toHaveAttribute(
      'href',
      'https://docs.example.com',
    );
    expect(screen.getByRole('link', { name: '❓' })).toHaveAttribute(
      'href',
      'https://help.example.com',
    );
  });

  it('renders explore link', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: /Explore/ })).toBeInTheDocument();
  });
});
