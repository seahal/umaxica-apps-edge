import { renderToStaticMarkup } from 'react-dom/server';
import Authentication from '../../src/routes/authentication/_index';

describe('Authentication route', () => {
  it('renders the authentication page', () => {
    const markup = renderToStaticMarkup(Authentication({} as never));

    expect(markup).toContain('認証');
    expect(markup).toContain('auth.umaxica.app');
  });
});
