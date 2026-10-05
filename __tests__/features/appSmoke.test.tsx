import { render, screen } from '@testing-library/react-native';

import App from '../../App';

describe('Kashero app shell', () => {
  it('shows the Kashero entry screen', async () => {
    await render(<App />);

    expect(screen.getByText('Kashero')).toBeTruthy();
    expect(screen.getByText('Your counter, ready when you are.')).toBeTruthy();
  });
});
