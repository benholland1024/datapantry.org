// /tests/unit/api/table/[tableId].put.test.ts
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { 
  applyDatatypeChanges, 
  applyColumnAdditions, 
  applyConstraintChanges, 
  applyIsRequiredChanges 
} from '../../../../server/api/table/[tableId].put.ts'

describe('Data Transformation Logic', () => {
  
  describe('applyDatatypeChanges', () => {
    test('converts string to number correctly', () => {
      const data = { age: '25', invalid: 'abc', float: '30.5' }
      const changes = [{ 
        column: 'age', 
        oldType: 'string', 
        newType: 'number' 
      }]
      
      const result = applyDatatypeChanges(data, changes)
      
      // According to your rules: NaN should become 0, not null
      expect(result.age).toBe(25)
    })

    test('handles invalid string to number conversion', () => {
      const data = { value: 'not-a-number' }
      const changes = [{ 
        column: 'value', 
        oldType: 'string', 
        newType: 'number' 
      }]
      
      const result = applyDatatypeChanges(data, changes)
      
      // BUG: Your code returns null, but rules say it should be 0
      expect(result.value).toBe(0) // This will fail with current code
    })

    test('converts foreign key to string', () => {
      const data = { userId: 'some-foreign-key-id' }
      const changes = [{ 
        column: 'userId', 
        oldType: 'foreign key', 
        newType: 'string' 
      }]
      
      const result = applyDatatypeChanges(data, changes)
      
      // According to rules: should become blank string
      expect(result.userId).toBe('')
    })

    test('converts foreign key to number', () => {
      const data = { categoryId: 'some-id' }
      const changes = [{ 
        column: 'categoryId', 
        oldType: 'foreign key', 
        newType: 'number' 
      }]
      
      const result = applyDatatypeChanges(data, changes)
      
      // According to rules: should become 0
      expect(result.categoryId).toBe(0)
    })
  })

  describe('applyColumnAdditions', () => {
    test('adds string column with empty string', () => {
      const data = { name: 'John' }
      const additions = [{ 
        name: 'email', 
        datatype: 'string', 
        isRequired: false 
      }]
      
      const result = applyColumnAdditions(data, additions)
      
      expect(result.email).toBe('') // Your code gives null
    })

    test('adds number column with 0', () => {
      const data = { name: 'John' }
      const additions = [{ 
        name: 'age', 
        datatype: 'number', 
        isRequired: false 
      }]
      
      const result = applyColumnAdditions(data, additions)
      
      expect(result.age).toBe(0) // Your code gives null
    })

    test('adds foreign key column with null', () => {
      const data = { name: 'John' }
      const additions = [{ 
        name: 'userId', 
        datatype: 'foreign key', 
        isRequired: false 
      }]
      
      const result = applyColumnAdditions(data, additions)
      
      expect(result.userId).toBe(null)
    })
  })

  describe('applyConstraintChanges', () => {
    test('makes duplicate strings unique with numbering', () => {
      const rows = [
        { id: '1', data: { name: 'Lucy' } },
        { id: '2', data: { name: 'Lucy' } },
        { id: '3', data: { name: 'Lucy' } }
      ]
      const changes = [{ column: 'name', constraint: 'unique' }]
      
      const result = applyConstraintChanges(rows, changes)
      
      // According to rules: should be Lucy_1, Lucy_2, Lucy_3
      expect(result[0].data.name).toBe('Lucy_1')
      expect(result[1].data.name).toBe('Lucy_2')
      expect(result[2].data.name).toBe('Lucy_3')
      // Your code just nullifies duplicates
    })

    test('makes duplicate numbers unique with ascending values', () => {
      const rows = [
        { id: '1', data: { count: 5 } },
        { id: '2', data: { count: 5 } },
        { id: '3', data: { count: 10 } }
      ]
      const changes = [{ column: 'count', constraint: 'unique' }]
      
      const result = applyConstraintChanges(rows, changes)
      
      // According to rules: should be 1, 2, 3
      expect(result[0].data.count).toBe(1)
      expect(result[1].data.count).toBe(2)
      expect(result[2].data.count).toBe(3)
    })

    test('sets duplicate foreign keys to null', () => {
      const rows = [
        { id: '1', data: { userId: 'user123' } },
        { id: '2', data: { userId: 'user123' } }
      ]
      const changes = [{ column: 'userId', constraint: 'unique' }]
      
      const result = applyConstraintChanges(rows, changes)
      
      // First should stay, second should be null
      expect(result[0].data.userId).toBe('user123')
      expect(result[1].data.userId).toBe(null)
    })
  })

  describe('applyIsRequiredChanges', () => {
    test('sets default values for required string fields', () => {
      const data = { name: null, age: 25 }
      const changes = [{ column: 'name', isRequired: true }]
      
      const result = applyIsRequiredChanges(data, changes)
      
      // According to rules: should be "default"
      expect(result.name).toBe('default')
      // Your code sets empty string
    })

    test('handles unique required string fields', () => {
      // This would need to be tested with multiple rows
      // to check default_1, default_2 behavior
    })
  })
})

// Integration test for the full API endpoint
describe('PUT /api/table/:tableId Integration', () => {
  let mockDb: any

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      update: vi.fn(),
      insert: vi.fn(),
      delete: vi.fn()
    }
    vi.mock('~/server/api/postgresDB', () => ({ db: mockDb }))
  })

  test('full workflow: preserveData=true with mixed changes', async () => {
    // Mock existing data
    mockDb.select.mockResolvedValueOnce([
      { userId: 'user123' } // Session validation
    ]).mockResolvedValueOnce([
      { id: 'col1' }, { id: 'col2' } // Existing columns
    ]).mockResolvedValueOnce([
      { id: 'row1', data: { name: 'John', age: '25' } },
      { id: 'row2', data: { name: 'Jane', age: 'invalid' } }
    ])

    const mockEvent = {
      context: { params: { tableId: 'table123' } },
      body: {
        columns: [
          { id: 'col1', name: 'fullName', datatype: 'string' }, // renamed
          { id: 'col3', name: 'age', datatype: 'number' } // new, type changed
        ],
        columnChanges: [
          { type: 'rename', oldName: 'name', newName: 'fullName' },
          { type: 'datatype', name: 'age', oldType: 'string', newType: 'number' }
        ],
        preserveData: true
      }
    }

    // This test would verify the full transformation pipeline
    // You'd need to import and call your actual handler function
  })
})