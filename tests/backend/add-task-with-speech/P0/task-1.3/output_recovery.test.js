import { recoverAndValidate, ParseError } from '../../../../../to-do-list/backend/src/services/outputRecovery.js';

describe('Output Recovery & Validation Layer', () => {

  describe('recoverAndValidate() - JSON Sanitization', () => {
    it('should strip markdown fences', () => {
      const input = '```json\n{"title": "Clean Task", "confidence": 0.9}\n```';
      const result = recoverAndValidate(input);
      expect(result.title).toBe('Clean Task');
    });

    it('should strip <think> blocks', () => {
      const input = '<think>I should extract the task</think>{"title": "Think Task"}';
      const result = recoverAndValidate(input);
      expect(result.title).toBe('Think Task');
    });

    it('should extract JSON from surrounding text', () => {
      const input = 'Sure, here is your JSON: {"title": "Surrounded Task"} Enjoy!';
      const result = recoverAndValidate(input);
      expect(result.title).toBe('Surrounded Task');
    });

    it('should repair broken JSON (trailing commas)', () => {
      const input = '{"title": "Broken Task", "tags": ["work"],}';
      const result = recoverAndValidate(input);
      expect(result.title).toBe('Broken Task');
      expect(result.tags).toContain('work');
    });

    it('should repair truncated JSON (missing closing brace)', () => {
      const input = '{"title": "Truncated Task"';
      const result = recoverAndValidate(input);
      expect(result.title).toBe('Truncated Task');
    });
  });

  describe('recoverAndValidate() - Schema Validation', () => {
    it('should trim the title', () => {
      const input = '{"title": "  Untrimmed Task  "}';
      const result = recoverAndValidate(input);
      expect(result.title).toBe('Untrimmed Task');
    });

    it('should use default values for missing optional fields', () => {
      const input = '{"title": "Minimal Task"}';
      const result = recoverAndValidate(input);
      expect(result.datePhrase).toBeNull();
      expect(result.tags).toEqual([]);
      expect(result.confidence).toBe(0.8);
    });

    it('should throw ParseError for empty title', () => {
      const input = '{"title": "", "confidence": 0.5}';
      expect(() => recoverAndValidate(input)).toThrow(ParseError);
      try {
        recoverAndValidate(input);
      } catch (err) {
        expect(err.message).toContain('Title cannot be empty');
      }
    });

    it('should throw ParseError for invalid confidence range', () => {
      const input = '{"title": "Test", "confidence": 1.5}';
      expect(() => recoverAndValidate(input)).toThrow(ParseError);
    });

    it('should reject extra fields due to .strict()', () => {
      // In TaskDraftSchema.strict(), extra fields should cause a validation failure.
      const input = '{"title": "Extra", "extra_field": "value"}';
      expect(() => recoverAndValidate(input)).toThrow(ParseError);
    });
  });

  describe('Error Handling', () => {
    it('should include rawOutput in ParseError', () => {
      const input = 'invalid garbage';
      try {
        recoverAndValidate(input);
      } catch (err) {
        expect(err instanceof ParseError).toBe(true);
        expect(err.rawOutput).toBe(input);
      }
    });
  });
});
