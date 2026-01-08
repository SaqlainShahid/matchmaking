import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/firestore', () => ({
  getDocs: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getFirestore: vi.fn()
}));

// Prevent firebase/messaging from attempting to access browser-only APIs in test env
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(() => ({})),
  getToken: vi.fn(),
  onMessage: vi.fn()
}));

import { getMatchingProviders } from '../userService';
import { getDocs } from 'firebase/firestore';

describe('userService.getMatchingProviders', () => {
  beforeEach(() => {
    getDocs.mockReset();
  });

  test('includes providers with company/agency roles and filters by area', async () => {
    // First query (serviceType field) returns an agency
    getDocs.mockResolvedValueOnce({ docs: [ { id: 'u2', data: () => ({ role: 'agency', serviceType: 'plomberie_chauffage', serviceArea: 'paris' }) } ] });
    // Second query (services array) returns a company
    getDocs.mockResolvedValueOnce({ docs: [ { id: 'u1', data: () => ({ role: 'company', services: ['plomberie_chauffage'], serviceArea: 'paris' }) } ] });

    const res = await getMatchingProviders('plomberie_chauffage', 'Paris');
    // Should include both roles and match area filter (case-insensitive)
    const roles = res.map(r => r.role).sort();
    expect(roles).toEqual(['agency', 'company']);
    expect(res.every(r => r.serviceArea?.toLowerCase() === 'paris' || r.city?.toLowerCase() === 'paris')).toBeTruthy();
  });
});