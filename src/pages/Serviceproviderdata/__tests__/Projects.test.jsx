// @vitest-environment jsdom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../contexts/ProviderContext', () => ({
  useProvider: () => ({
    projects: [{ id: 'p1', title: 'Fix sink', budget: 120, status: 'active', progress: 0 }],
    createInvoice: vi.fn().mockResolvedValue({ id: 'inv1' }),
    updateProgress: vi.fn(),
    uploadPhoto: vi.fn(),
    addComment: vi.fn()
  })
}));

vi.mock('../../components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() })
}));

import Projects from '../Projects';
import { useProvider } from '../../contexts/ProviderContext';
import { useToast } from '../../components/ui/use-toast';

describe('Projects — Invoice modal and creation flow', () => {
  test('opens invoice modal and calls createInvoice with overrides', async () => {
    render(<Projects />);

    // Click the first 'Generate Invoice' button (project action)
    const genButtons = await screen.findAllByRole('button', { name: /Generate Invoice/i });
    expect(genButtons.length).toBeGreaterThan(0);
    await userEvent.click(genButtons[0]);

    // Modal should appear
    expect(screen.getByText(/Generate Invoice/i)).toBeInTheDocument();

    const amountInput = screen.getByLabelText(/Amount/i);
    const noteInput = screen.getByLabelText(/Notes \(optional\)/i);

    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '200');
    await userEvent.type(noteInput, 'Work completed');

    // Confirm action in modal (there's also a button with same text in the page header; this will target the modal confirm)
    const confirmButtons = screen.getAllByRole('button', { name: /Generate Invoice/i });
    // choose the second one which is modal confirm (heuristic: modal confirm is rendered after)
    await userEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      const prov = useProvider();
      expect(prov.createInvoice).toHaveBeenCalledWith('p1', { amount: '200', note: 'Work completed' });
    });

    // And toast should have been shown to the provider
    await waitFor(() => {
      const toastMock = useToast().toast;
      expect(toastMock).toHaveBeenCalled();
    });
  });
});