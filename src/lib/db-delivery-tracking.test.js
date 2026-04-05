import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { 
    getTransportWithStations, 
    updateTransportStations, 
    getBillsWithTracking 
} from './db.js';
import { supabase } from './supabase.js';

describe('Delivery Tracking Database Functions', () => {
    const mockCompanyId = 'test-company-123';
    const mockTransportId = 'test-transport-456';
    const mockTransportName = 'VRL Logistics';

    describe('getTransportWithStations', () => {
        it('should fetch transport with booking stations', async () => {
            const mockTransport = {
                id: mockTransportId,
                company_id: mockCompanyId,
                name: mockTransportName,
                booking_stations: [
                    { station_name: 'Mumbai', fare: 5000, avg_delivery_days: 3 },
                    { station_name: 'Delhi', fare: 8000, avg_delivery_days: 5 }
                ]
            };

            vi.spyOn(supabase, 'from').mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({ data: mockTransport, error: null })
                        })
                    })
                })
            });

            const result = await getTransportWithStations(mockCompanyId, mockTransportName);
            
            expect(result).toEqual(mockTransport);
            expect(result.booking_stations).toHaveLength(2);
            expect(result.booking_stations[0].station_name).toBe('Mumbai');
        });

        it('should throw error when transport not found', async () => {
            vi.spyOn(supabase, 'from').mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({ 
                                data: null, 
                                error: { message: 'Transport not found' } 
                            })
                        })
                    })
                })
            });

            await expect(getTransportWithStations(mockCompanyId, 'NonExistent')).rejects.toThrow();
        });
    });

    describe('updateTransportStations', () => {
        it('should update booking stations for a transport', async () => {
            const newStations = [
                { station_name: 'Bangalore', fare: 6000, avg_delivery_days: 4 }
            ];

            const updatedTransport = {
                id: mockTransportId,
                company_id: mockCompanyId,
                booking_stations: newStations
            };

            vi.spyOn(supabase, 'from').mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            select: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({ data: updatedTransport, error: null })
                            })
                        })
                    })
                })
            });

            const result = await updateTransportStations(mockCompanyId, mockTransportId, newStations);
            
            expect(result.booking_stations).toEqual(newStations);
            expect(result.booking_stations[0].station_name).toBe('Bangalore');
        });
    });

    describe('getBillsWithTracking', () => {
        it('should fetch bills with tracking fields', async () => {
            const mockBills = [
                {
                    id: 'bill-1',
                    company_id: mockCompanyId,
                    lr_number: 'LR001',
                    booking_date: '2024-01-01',
                    booking_station: 'Mumbai',
                    delivery_status: 'On Time',
                    days_elapsed: 3,
                    created_at: '2024-01-01T10:00:00Z'
                },
                {
                    id: 'bill-2',
                    company_id: mockCompanyId,
                    lr_number: 'LR002',
                    booking_date: '2024-01-05',
                    booking_station: 'Delhi',
                    delivery_status: 'Overdue',
                    days_elapsed: 7,
                    created_at: '2024-01-05T10:00:00Z'
                }
            ];

            vi.spyOn(supabase, 'from').mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        order: vi.fn().mockResolvedValue({ data: mockBills, error: null })
                    })
                })
            });

            const result = await getBillsWithTracking(mockCompanyId);
            
            expect(result).toHaveLength(2);
            expect(result[0].lr_number).toBe('LR001');
            expect(result[0].delivery_status).toBe('On Time');
            expect(result[1].delivery_status).toBe('Overdue');
            expect(result[0].createdAt).toBeDefined();
        });

        it('should return empty array when no bills exist', async () => {
            vi.spyOn(supabase, 'from').mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        order: vi.fn().mockResolvedValue({ data: [], error: null })
                    })
                })
            });

            const result = await getBillsWithTracking(mockCompanyId);
            
            expect(result).toEqual([]);
        });
    });
});
