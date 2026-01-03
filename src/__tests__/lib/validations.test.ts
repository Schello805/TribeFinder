import { describe, it, expect } from 'vitest';
import { groupSchema } from '@/lib/validations/group';
import { eventSchema } from '@/lib/validations/event';

describe('Validation Schemas', () => {
  describe('groupSchema', () => {
    it('should validate a valid group', () => {
      const validGroup = {
        name: 'Test Tanzgruppe',
        description: 'Eine tolle Tanzgruppe für alle Tänzerinnen.',
        size: 'SMALL',
        location: {
          lat: 52.52,
          lng: 13.405,
          address: 'Berlin, Germany',
        },
      };

      const result = groupSchema.safeParse(validGroup);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidGroup = {
        name: '',
        description: 'Eine ausreichend lange Beschreibung',
        size: 'SMALL',
      };

      const result = groupSchema.safeParse(invalidGroup);
      expect(result.success).toBe(false);
    });

    it('should reject empty description', () => {
      const invalidGroup = {
        name: 'Test Gruppe',
        description: '',
        size: 'SMALL',
      };

      const result = groupSchema.safeParse(invalidGroup);
      expect(result.success).toBe(false);
    });

    it('should validate optional fields', () => {
      const groupWithOptionals = {
        name: 'Test Gruppe',
        description: 'Eine ausreichend lange Beschreibung für die Gruppe',
        size: 'SMALL',
        website: 'https://example.com',
        contactEmail: 'test@example.com',
        tags: ['Tribal', 'Fusion'],
      };

      const result = groupSchema.safeParse(groupWithOptionals);
      expect(result.success).toBe(true);
    });
  });

  describe('eventSchema', () => {
    it('should validate a valid event', () => {
      const validEvent = {
        title: 'Workshop Tribal Fusion',
        description: 'Ein toller Workshop für alle Level.',
        eventType: 'WORKSHOP',
        startDate: new Date().toISOString(),
        lat: 52.52,
        lng: 13.405,
      };

      const result = eventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it('should reject empty title', () => {
      const invalidEvent = {
        title: '',
        description: 'Beschreibung',
        eventType: 'EVENT',
        startDate: new Date().toISOString(),
        lat: 52.52,
        lng: 13.405,
      };

      const result = eventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it('should validate event types', () => {
      const eventTypes = ['EVENT', 'WORKSHOP', 'SOCIAL', 'OPEN_TRAINING'];
      
      for (const eventType of eventTypes) {
        const event = {
          title: 'Test Event',
          description: 'Beschreibung',
          eventType,
          startDate: new Date().toISOString(),
          lat: 52.52,
          lng: 13.405,
        };

        const result = eventSchema.safeParse(event);
        expect(result.success).toBe(true);
      }
    });
  });
});
