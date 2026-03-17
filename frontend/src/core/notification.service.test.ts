// frontend/src/core/notification.service.test.ts
import { describe, expect, it, beforeEach } from 'bun:test';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = new NotificationService();
  });

  it('should create service', () => {
    expect(notificationService).toBeDefined();
  });

  describe('show', () => {
    it('should add notification', () => {
      notificationService.show('Test message');
      expect(notificationService.items().length).toBe(1);
      expect(notificationService.items()[0].message).toBe('Test message');
    });

    it('should assign unique IDs', () => {
      notificationService.show('Message 1');
      notificationService.show('Message 2');
      notificationService.show('Message 3');
      
      const ids = notificationService.items().map(n => n.id);
      expect(new Set(ids).size).toBe(3);
    });

    it('should auto-dismiss after duration', (done) => {
      notificationService.show('Auto dismiss', 'info', 50);
      expect(notificationService.items().length).toBe(1);
      
      setTimeout(() => {
        expect(notificationService.items().length).toBe(0);
        done();
      }, 100);
    });
  });

  describe('success', () => {
    it('should show success notification', () => {
      notificationService.success('Success message');
      const notification = notificationService.items()[0];
      expect(notification.type).toBe('success');
      expect(notification.message).toBe('Success message');
    });
  });

  describe('error', () => {
    it('should show error notification', () => {
      notificationService.error('Error message');
      const notification = notificationService.items()[0];
      expect(notification.type).toBe('error');
      expect(notification.message).toBe('Error message');
    });

    it('should have longer default duration', () => {
      notificationService.error('Error');
      notificationService.success('Success');
      
      const errorNotif = notificationService.items().find(n => n.type === 'error');
      const successNotif = notificationService.items().find(n => n.type === 'success');
      
      expect(errorNotif!.duration).toBe(5000);
      expect(successNotif!.duration).toBe(3000);
    });
  });

  describe('info', () => {
    it('should show info notification', () => {
      notificationService.info('Info message');
      const notification = notificationService.items()[0];
      expect(notification.type).toBe('info');
      expect(notification.message).toBe('Info message');
    });
  });

  describe('warning', () => {
    it('should show warning notification', () => {
      notificationService.warning('Warning message');
      const notification = notificationService.items()[0];
      expect(notification.type).toBe('warning');
      expect(notification.message).toBe('Warning message');
    });
  });

  describe('dismiss', () => {
    it('should remove notification', () => {
      notificationService.show('Message 1');
      notificationService.show('Message 2');
      notificationService.show('Message 3');
      
      const id = notificationService.items()[1].id;
      notificationService.dismiss(id);
      
      expect(notificationService.items().length).toBe(2);
      expect(notificationService.items().find(n => n.id === id)).toBeUndefined();
    });

    it('should not throw for non-existent ID', () => {
      expect(() => notificationService.dismiss('nonExistent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all notifications', () => {
      notificationService.success('Success 1');
      notificationService.error('Error 1');
      notificationService.info('Info 1');
      
      expect(notificationService.items().length).toBe(3);
      
      notificationService.clear();
      
      expect(notificationService.items().length).toBe(0);
    });
  });

  describe('signal updates', () => {
    it('should update signal reactively', () => {
      const initialLength = notificationService.items().length;
      
      notificationService.show('Message');
      expect(notificationService.items().length).toBe(initialLength + 1);
      
      notificationService.show('Another');
      expect(notificationService.items().length).toBe(initialLength + 2);
    });
  });
});
