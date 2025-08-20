import { describe, expect, test } from '@jest/globals';

// Core message template parser logic
function parseMessageTemplate(formLanguage: string, fields: string): any {
  return {
    "SYSTEM_PROMPT": {
      role: "system",
      content: `Task:
    Guide the user in filling out a multi-field form incrementally.
    
    Instructions:
      1.	Incremental Field Prompting:
      •	Present one form field at a time to the user.
      •	Wait for the user's response to the current field before proceeding.
      2.	Field Response Handling:
      •	Once the user provides input for a field, update the form with their response.
      •	Then, move on to the next field in the sequence.
      3.	Output Format:
      •	After every user response, return the complete form as a JSON object.
      •	Include all previously answered fields along with the current field's value.
      4.	Completion Indicator:
      •	When all fields have been filled, include a property "complete": true in the JSON output.
    
      Example JSON Structure:
      
      {
        "name": <name of form>,
        "fields": [{
                  "name": <name of field>,
                  "type": <type of field>,
                  "value": <user's response>
                  },
                {
                    "name": <name of field>,
                  "type": <type of field>,
                  "value": null
              }],
          "complete": false
        }
    
      Once every field is completed, the final output should resemble:
    
      {
        "name": <name of form>,
        "fields": [{
              "name": <name of field>,
              "type": <type of field>,
              "value": <user's response>
              },
            {
                "name": <name of field>,
              "type": <type of field>,
              "value": null
          }],
        "complete": true
      }
    
      Keep outputs in the form's original language.
      
    
      ---
    
      Collect the following fields from the user: ${fields}.
    
      The form's language is: ${formLanguage || "English"}  # Fallback to English if no language is provided
    `
    },
    "SPEAK_NEXT": {
      role: "system",
      content: `Now, begin by asking the user about the first item in the form and input that item for them if given an appropriate answer based off the description of the item`
    }
  }
}

describe('Message Template Parser', () => {
  describe('SYSTEM_PROMPT generation', () => {
    test('should generate system prompt with default English language', () => {
      const fields = 'firstName, lastName, email';
      const result = parseMessageTemplate('', fields);

      expect(result.SYSTEM_PROMPT).toBeDefined();
      expect(result.SYSTEM_PROMPT.role).toBe('system');
      expect(result.SYSTEM_PROMPT.content).toContain('Guide the user in filling out a multi-field form incrementally');
      expect(result.SYSTEM_PROMPT.content).toContain('firstName, lastName, email');
      expect(result.SYSTEM_PROMPT.content).toContain('English');
    });

    test('should generate system prompt with specified language', () => {
      const fields = 'nombre, apellido, correo';
      const formLanguage = 'Spanish';
      const result = parseMessageTemplate(formLanguage, fields);

      expect(result.SYSTEM_PROMPT.content).toContain('Spanish');
      expect(result.SYSTEM_PROMPT.content).toContain('nombre, apellido, correo');
    });

    test('should include incremental field prompting instructions', () => {
      const result = parseMessageTemplate('English', 'name, email');

      expect(result.SYSTEM_PROMPT.content).toContain('Present one form field at a time to the user');
      expect(result.SYSTEM_PROMPT.content).toContain('Wait for the user\'s response to the current field before proceeding');
    });

    test('should include field response handling instructions', () => {
      const result = parseMessageTemplate('English', 'name, email');

      expect(result.SYSTEM_PROMPT.content).toContain('Once the user provides input for a field, update the form with their response');
      expect(result.SYSTEM_PROMPT.content).toContain('Then, move on to the next field in the sequence');
    });

    test('should include JSON output format instructions', () => {
      const result = parseMessageTemplate('English', 'name, email');

      expect(result.SYSTEM_PROMPT.content).toContain('return the complete form as a JSON object');
      expect(result.SYSTEM_PROMPT.content).toContain('Include all previously answered fields along with the current field\'s value');
    });

    test('should include completion indicator instructions', () => {
      const result = parseMessageTemplate('English', 'name, email');

      expect(result.SYSTEM_PROMPT.content).toContain('When all fields have been filled, include a property "complete": true');
    });

    test('should include example JSON structures', () => {
      const result = parseMessageTemplate('English', 'name, email');

      expect(result.SYSTEM_PROMPT.content).toContain('"name": <name of form>');
      expect(result.SYSTEM_PROMPT.content).toContain('"fields": [');
      expect(result.SYSTEM_PROMPT.content).toContain('"complete": false');
      expect(result.SYSTEM_PROMPT.content).toContain('"complete": true');
    });

    test('should include language preservation instruction', () => {
      const result = parseMessageTemplate('French', 'nom, email');

      expect(result.SYSTEM_PROMPT.content).toContain('Keep outputs in the form\'s original language');
    });
  });

  describe('SPEAK_NEXT generation', () => {
    test('should generate SPEAK_NEXT prompt', () => {
      const result = parseMessageTemplate('English', 'name, email');

      expect(result.SPEAK_NEXT).toBeDefined();
      expect(result.SPEAK_NEXT.role).toBe('system');
      expect(result.SPEAK_NEXT.content).toContain('begin by asking the user about the first item in the form');
      expect(result.SPEAK_NEXT.content).toContain('input that item for them if given an appropriate answer');
    });

    test('should be consistent regardless of language', () => {
      const englishResult = parseMessageTemplate('English', 'name, email');
      const spanishResult = parseMessageTemplate('Spanish', 'nombre, correo');

      expect(englishResult.SPEAK_NEXT.content).toBe(spanishResult.SPEAK_NEXT.content);
    });

    test('should be consistent regardless of fields', () => {
      const shortFieldsResult = parseMessageTemplate('English', 'name');
      const longFieldsResult = parseMessageTemplate('English', 'firstName, lastName, email, phone, address');

      expect(shortFieldsResult.SPEAK_NEXT.content).toBe(longFieldsResult.SPEAK_NEXT.content);
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle empty fields string', () => {
      const result = parseMessageTemplate('English', '');

      expect(result.SYSTEM_PROMPT.content).toContain('Collect the following fields from the user: .');
      expect(result.SYSTEM_PROMPT.content).toContain('English');
    });

    test('should handle null/undefined formLanguage', () => {
      const result1 = parseMessageTemplate(null as any, 'name, email');
      const result2 = parseMessageTemplate(undefined as any, 'name, email');

      expect(result1.SYSTEM_PROMPT.content).toContain('English');
      expect(result2.SYSTEM_PROMPT.content).toContain('English');
    });

    test('should handle special characters in fields', () => {
      const fields = 'name, email@domain.com, phone# (with special chars)';
      const result = parseMessageTemplate('English', fields);

      expect(result.SYSTEM_PROMPT.content).toContain(fields);
    });

    test('should handle very long field lists', () => {
      const longFields = Array.from({ length: 20 }, (_, i) => `field${i + 1}`).join(', ');
      const result = parseMessageTemplate('English', longFields);

      expect(result.SYSTEM_PROMPT.content).toContain(longFields);
      expect(result.SYSTEM_PROMPT.content.length).toBeGreaterThan(1000);
    });
  });

  describe('Template structure validation', () => {
    test('should return object with expected structure', () => {
      const result = parseMessageTemplate('English', 'name, email');

      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('SYSTEM_PROMPT');
      expect(result).toHaveProperty('SPEAK_NEXT');
      expect(Object.keys(result)).toHaveLength(2);
    });

    test('should have proper message role structure', () => {
      const result = parseMessageTemplate('English', 'name, email');

      expect(result.SYSTEM_PROMPT).toHaveProperty('role', 'system');
      expect(result.SYSTEM_PROMPT).toHaveProperty('content');
      expect(typeof result.SYSTEM_PROMPT.content).toBe('string');

      expect(result.SPEAK_NEXT).toHaveProperty('role', 'system');
      expect(result.SPEAK_NEXT).toHaveProperty('content');
      expect(typeof result.SPEAK_NEXT.content).toBe('string');
    });

    test('should have non-empty content', () => {
      const result = parseMessageTemplate('English', 'name, email');

      expect(result.SYSTEM_PROMPT.content.length).toBeGreaterThan(0);
      expect(result.SPEAK_NEXT.content.length).toBeGreaterThan(0);
    });
  });

  describe('Content validation for different languages', () => {
    const testLanguages = ['English', 'Spanish', 'French', 'German', 'Chinese'];
    const testFields = 'name, email, phone';

    testLanguages.forEach(language => {
      test(`should properly handle ${language} language`, () => {
        const result = parseMessageTemplate(language, testFields);

        expect(result.SYSTEM_PROMPT.content).toContain(language);
        expect(result.SYSTEM_PROMPT.content).toContain(testFields);
      });
    });
  });

  describe('Instructions completeness', () => {
    test('should include all required instruction sections', () => {
      const result = parseMessageTemplate('English', 'name, email');
      const content = result.SYSTEM_PROMPT.content;

      // Check for main instruction sections
      expect(content).toContain('Incremental Field Prompting');
      expect(content).toContain('Field Response Handling');
      expect(content).toContain('Output Format');
      expect(content).toContain('Completion Indicator');
      expect(content).toContain('Example JSON Structure');
    });

    test('should include proper JSON structure examples', () => {
      const result = parseMessageTemplate('English', 'name, email');
      const content = result.SYSTEM_PROMPT.content;

      // Check for JSON structure elements
      expect(content).toMatch(/"name":\s*<name of form>/);
      expect(content).toMatch(/"fields":\s*\[/);
      expect(content).toMatch(/"value":\s*<user's response>/);
      expect(content).toMatch(/"value":\s*null/);
      expect(content).toMatch(/"complete":\s*false/);
      expect(content).toMatch(/"complete":\s*true/);
    });
  });
});