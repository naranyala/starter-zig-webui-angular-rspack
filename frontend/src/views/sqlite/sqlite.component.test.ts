// frontend/src/views/sqlite/sqlite.component.test.ts
import { describe, expect, it, beforeEach } from 'bun:test';
import { SqliteCrudComponent } from './sqlite.component';
import type { User, UserStats } from './sqlite.component';

describe('SqliteCrudComponent', () => {
  let component: SqliteCrudComponent;

  beforeEach(() => {
    component = new SqliteCrudComponent();
  });

  it('should create component', () => {
    expect(component).toBeDefined();
  });

  describe('initial state', () => {
    it('should start in list tab', () => {
      expect(component.activeTab()).toBe('list');
    });

    it('should have empty users initially', () => {
      expect(component.users().length).toBe(0);
    });

    it('should have default stats', () => {
      const stats = component.stats();
      expect(stats.total_users).toBe(0);
      expect(stats.today_count).toBe(0);
      expect(stats.unique_domains).toBe(0);
    });

    it('should have empty new user form', () => {
      const newUser = component.newUser();
      expect(newUser.name).toBe('');
      expect(newUser.email).toBe('');
      expect(newUser.age).toBe(25);
    });
  });

  describe('tab switching', () => {
    it('should switch to create tab', () => {
      component.setActiveTab('create');
      expect(component.activeTab()).toBe('create');
    });

    it('should switch to list tab', () => {
      component.setActiveTab('create');
      component.setActiveTab('list');
      expect(component.activeTab()).toBe('list');
    });
  });

  describe('user filtering', () => {
    it('should filter users by name', () => {
      component.users.set([
        { id: 1, name: 'John Doe', email: 'john@example.com', age: 30, created_at: '2024-01-01' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25, created_at: '2024-01-02' },
      ]);
      
      component.searchQuery = 'john';
      component.filterUsers();
      
      expect(component.filteredUsers().length).toBe(1);
      expect(component.filteredUsers()[0].name).toContain('John');
    });

    it('should filter users by email', () => {
      component.users.set([
        { id: 1, name: 'John Doe', email: 'john@example.com', age: 30, created_at: '2024-01-01' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25, created_at: '2024-01-02' },
      ]);
      
      component.searchQuery = 'jane@example';
      component.filterUsers();
      
      expect(component.filteredUsers().length).toBe(1);
      expect(component.filteredUsers()[0].email).toContain('jane@example');
    });

    it('should be case insensitive', () => {
      component.users.set([
        { id: 1, name: 'John Doe', email: 'john@example.com', age: 30, created_at: '2024-01-01' },
      ]);
      
      component.searchQuery = 'JOHN';
      component.filterUsers();
      
      expect(component.filteredUsers().length).toBe(1);
    });

    it('should show all users when search is empty', () => {
      component.users.set([
        { id: 1, name: 'John', email: 'john@example.com', age: 30, created_at: '2024-01-01' },
        { id: 2, name: 'Jane', email: 'jane@example.com', age: 25, created_at: '2024-01-02' },
      ]);
      
      component.searchQuery = '';
      component.filterUsers();
      
      expect(component.filteredUsers().length).toBe(2);
    });
  });

  describe('date formatting', () => {
    it('should format date string', () => {
      const dateStr = '2024-03-14T10:30:00.000Z';
      const formatted = component.formatDate(dateStr);
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });
  });

  describe('create user', () => {
    it('should validate empty fields', async () => {
      component.newUser.set({ name: '', email: '', age: 25 });
      
      await component.createUser();
      
      expect(component.isLoading()).toBe(false);
    });

    it('should set loading state', async () => {
      component.newUser.set({ name: 'Test', email: 'test@example.com', age: 25 });
      
      const createPromise = component.createUser();
      expect(component.isLoading()).toBe(true);
      
      await createPromise.catch(() => {});
      expect(component.isLoading()).toBe(false);
    });

    it('should reset form after creation', async () => {
      component.newUser.set({ name: 'Test', email: 'test@example.com', age: 25 });
      
      await component.createUser().catch(() => {});
      
      const newUser = component.newUser();
      expect(newUser.name).toBe('');
      expect(newUser.email).toBe('');
      expect(newUser.age).toBe(25);
    });
  });

  describe('delete user', () => {
    it('should set loading state', async () => {
      const user: User = { id: 1, name: 'Test', email: 'test@example.com', age: 25, created_at: '2024-01-01' };
      
      const deletePromise = component.deleteUser(user);
      expect(component.isLoading()).toBe(true);
      
      await deletePromise.catch(() => {});
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('edit user', () => {
    it('should populate form with user data', () => {
      const user: User = { id: 1, name: 'Test User', email: 'test@example.com', age: 30, created_at: '2024-01-01' };
      
      component.editUser(user);
      
      const newUser = component.newUser();
      expect(newUser.name).toBe('Test User');
      expect(newUser.email).toBe('test@example.com');
      expect(newUser.age).toBe(30);
    });

    it('should switch to create tab', () => {
      const user: User = { id: 1, name: 'Test', email: 'test@example.com', age: 25, created_at: '2024-01-01' };
      
      component.editUser(user);
      
      expect(component.activeTab()).toBe('create');
    });
  });

  describe('stats signal', () => {
    it('should update stats reactively', () => {
      const newStats: UserStats = { total_users: 10, today_count: 2, unique_domains: 5 };
      component.stats.set(newStats);
      
      expect(component.stats().total_users).toBe(10);
      expect(component.stats().today_count).toBe(2);
      expect(component.stats().unique_domains).toBe(5);
    });
  });

  describe('users signal', () => {
    it('should update users reactively', () => {
      const newUsers: User[] = [
        { id: 1, name: 'User 1', email: 'user1@example.com', age: 25, created_at: '2024-01-01' },
        { id: 2, name: 'User 2', email: 'user2@example.com', age: 30, created_at: '2024-01-02' },
      ];
      component.users.set(newUsers);
      
      expect(component.users().length).toBe(2);
      expect(component.users()[0].name).toBe('User 1');
    });
  });
});
