// @vitest-environment jsdom
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mocks for services used by the component
vi.mock('../../services/ordergiverservices/orderGiverService', () => ({
  createRequest: vi.fn().mockResolvedValue({ id: 'new-req' }),
  updateRequest: vi.fn().mockResolvedValue({ id: 'updated-req' }),
  getRequestById: vi.fn()
}));

vi.mock('../../services/notificationService', () => ({
  sendNotification: vi.fn().mockResolvedValue(true)
}));

vi.mock('../../services/userService', () => ({
  getMatchingProviders: vi.fn().mockResolvedValue([])
}));

vi.mock('../../services/cloudinaryService', () => ({
  uploadToCloudinary: vi.fn().mockResolvedValue('https://example.com/file.jpg')
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'user123', email: 'test@example.com' } })
}));

// Import the component after mocks
import EnterpriseRequestForm from '../RequestForm';
import { createRequest, updateRequest } from '../../services/ordergiverservices/orderGiverService';
import { sendNotification } from '../../services/notificationService';
import { getMatchingProviders } from '../../services/userService';

describe('EnterpriseRequestForm — phone validation & edit flow', () => {
  test('shows a single phone validation error for invalid phone format', async () => {
    const { container } = render(<MemoryRouter><EnterpriseRequestForm /></MemoryRouter>);

    // Fill step 1 required fields
    const titleInput = screen.getByLabelText(/Service Title/i);
    const serviceSelect = screen.getByLabelText(/Service Type/i);
    const descriptionInput = screen.getByLabelText(/Service Description/i);

    await userEvent.type(titleInput, 'Test project');
    await userEvent.selectOptions(serviceSelect, ['plomberie_chauffage']);
    await userEvent.type(descriptionInput, 'This is a sufficiently long description that exceeds 30 characters.');

    // Click the primary action inside the form to advance to step 2
    const submitBtn = within(container).getByRole('button', { name: /Continue|Submit Request|Submit|Update Request|Update/i });
    await userEvent.click(submitBtn);

    // On step 2, fill contact person and an invalid phone
    const contactPerson = screen.getByLabelText(/Contact Person/i);
    const contactPhone = screen.getByLabelText(/Contact Phone/i);

    await userEvent.type(contactPerson, 'Alice');
    await userEvent.type(contactPhone, '0612'); // too short / invalid

    // Attempt to proceed (click submit again - will validate step 2)
    await userEvent.click(submitBtn);

    // Expect a single validation message about invalid format
    await waitFor(() => {
      const matches = screen.getAllByText(/Invalid phone number format/i);
      expect(matches).toHaveLength(1);
    });
  });

  test('updateRequest is called when editing and submitting changes to phone', async () => {
    // Prepare initial data with an existing phone
    const initialData = {
      id: 'req-1',
      title: 'Existing request',
      description: 'This is an existing request with long description to satisfy validation rules.',
      serviceType: 'plomberie_chauffage',
      location: 'Some address',
      costCenter: 'CC-1',
      contact: { person: 'Bob', phone: '+33 6 12 34 56 78' },
      files: []
    };

    const { container } = render(<MemoryRouter><EnterpriseRequestForm initialData={initialData} requestId={initialData.id} /></MemoryRouter>);

    // Ensure the form pre-fills contact phone
    const contactPhone = await within(container).findByLabelText(/Contact Phone/i);
    // Use .value to avoid relying on jest-dom matcher availability
    expect(contactPhone.value).toBe('+33 6 12 34 56 78');

    // Change phone to a new number
    await userEvent.clear(contactPhone);
    await userEvent.type(contactPhone, '0612345679'); // local format - should normalize to +33 612345679

    // Submit through steps: step 1 -> step 2 -> step 3
    const submitBtn = within(container).getByRole('button', { name: /Update Request|Submit Request|Update|Continue|Submit/i });
    // Click enough times to trigger final submit
    await userEvent.click(submitBtn); // to step 2
    await userEvent.click(submitBtn); // to step 3
    await userEvent.click(submitBtn); // final submit

    // Expect updateRequest to have been called
    await waitFor(() => {
      expect(updateRequest).toHaveBeenCalled();
      const args = updateRequest.mock.calls[0];
      const payload = args[1] || {};
      expect(payload.contact).toBeDefined();
      // Expect normalized phone to start with +33 and include the digits
      expect(payload.contact.phone.replace(/\s+/g, '')).toMatch(/^\+33\d{6,}$/);
    });
  });

  test('broadcasts to company/agency providers', async () => {
    // Arrange: make the provider query return a company-like provider
    getMatchingProviders.mockResolvedValue([{ id: 'comp1', role: 'company' }]);

    const { container } = render(<MemoryRouter><EnterpriseRequestForm /></MemoryRouter>);

    // Fill step 1 required fields
    await userEvent.type(screen.getByLabelText(/Service Title/i), 'Broadcast Test');
    await userEvent.selectOptions(screen.getByLabelText(/Service Type/i), ['plomberie_chauffage']);
    await userEvent.type(screen.getByLabelText(/Service Description/i), 'This is a sufficiently long description that exceeds 30 characters.');

    // Advance to step 2
    const submitBtn = within(container).getByRole('button', { name: /Continue|Submit Request|Submit|Update Request|Update/i });
    await userEvent.click(submitBtn);

    // Fill contact and valid phone
    await userEvent.type(within(container).getByLabelText(/Contact Person/i), 'Charlie');
    await userEvent.type(within(container).getByLabelText(/Contact Phone/i), '0612345678');

    // Advance and submit (to trigger broadcast)
    await userEvent.click(submitBtn);
    await userEvent.click(submitBtn);
    await userEvent.click(submitBtn);

    // Assert that sendNotification was called for the company provider
    await waitFor(() => {
      const calls = sendNotification.mock.calls;
      const providerCall = calls.find(c => c[0] === 'comp1' && c[1] === 'NEW_REQUEST_AVAILABLE');
      expect(providerCall).toBeTruthy();
    });
  });
});
