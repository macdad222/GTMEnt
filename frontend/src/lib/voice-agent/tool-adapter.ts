/**
 * Tool Adapter - Converts tool declarations between provider-specific formats
 */

import { ToolDeclaration, ToolParameterProperty, VoiceProvider } from './base-types';

/**
 * Convert internal tool declarations to Gemini format
 */
export function toGeminiTools(tools: ToolDeclaration[]): unknown[] {
  // Gemini uses Type enum, but we'll use the string format that the SDK accepts
  const typeMap: Record<string, string> = {
    'string': 'STRING',
    'number': 'NUMBER',
    'boolean': 'BOOLEAN',
    'array': 'ARRAY',
    'object': 'OBJECT',
  };

  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: typeMap['object'],
      properties: Object.fromEntries(
        Object.entries(tool.parameters.properties).map(([key, prop]) => [
          key,
          {
            type: typeMap[prop.type] || 'STRING',
            description: prop.description,
            ...(prop.enum ? { enum: prop.enum } : {}),
          },
        ])
      ),
      required: tool.parameters.required,
    },
  }));
}

/**
 * Convert internal tool declarations to Grok format
 * Grok uses a similar format to OpenAI
 */
export function toGrokTools(tools: ToolDeclaration[]): unknown[] {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          Object.entries(tool.parameters.properties).map(([key, prop]) => [
            key,
            {
              type: prop.type,
              description: prop.description,
              ...(prop.enum ? { enum: prop.enum } : {}),
            },
          ])
        ),
        required: tool.parameters.required,
      },
    },
  }));
}

/**
 * Convert internal tool declarations to OpenAI Realtime format
 */
export function toOpenAITools(tools: ToolDeclaration[]): unknown[] {
  return tools.map(tool => ({
    type: 'function',
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(tool.parameters.properties).map(([key, prop]) => [
          key,
          {
            type: prop.type,
            description: prop.description,
            ...(prop.enum ? { enum: prop.enum } : {}),
          },
        ])
      ),
      required: tool.parameters.required,
    },
  }));
}

/**
 * Convert tools to provider-specific format
 */
export function convertToolsForProvider(tools: ToolDeclaration[], provider: VoiceProvider): unknown[] {
  switch (provider) {
    case 'gemini':
      return toGeminiTools(tools);
    case 'grok':
      return toGrokTools(tools);
    case 'openai':
      return toOpenAITools(tools);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Convert the existing Gemini-format tools to our internal format
 * This is used to migrate the existing voiceAgentTools
 */
export function fromGeminiTools(geminiTools: unknown[]): ToolDeclaration[] {
  const typeMap: Record<string, ToolParameterProperty['type']> = {
    'STRING': 'string',
    'NUMBER': 'number',
    'BOOLEAN': 'boolean',
    'ARRAY': 'array',
    'OBJECT': 'object',
  };

  return (geminiTools as Array<{
    name: string;
    description: string;
    parameters?: {
      properties?: Record<string, { type: string; description?: string; enum?: string[] }>;
      required?: string[];
    };
  }>).map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'object' as const,
      properties: Object.fromEntries(
        Object.entries(tool.parameters?.properties || {}).map(([key, prop]) => [
          key,
          {
            type: typeMap[prop.type] || 'string',
            description: prop.description,
            ...(prop.enum ? { enum: prop.enum } : {}),
          },
        ])
      ),
      required: tool.parameters?.required || [],
    },
  }));
}

