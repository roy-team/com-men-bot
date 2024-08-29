/**
 * Поддержка запросов к OpenAI.
 * Переменные окружения:
 *  OPENAI_API_KEY - API ключ для работы с OpenAI.
 *  OPENAI_MODEL - Используемая модель, по умолчанию 'gpt-3.5-turbo'.
 */

import OpenAI from 'openai'
import type { APIError } from 'openai/error'

export default async function (content: string): Promise<string | null> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  try {
    const chatCompletion = await client.chat.completions.create({
      messages: [{
        role: 'user',
        content
      }],
      model: process.env.OPENAI_MODEL ?? 'gpt-3.5-turbo',
    })

    return chatCompletion.choices[0].message.content ?? null
  } catch (error: unknown) {
    if (isAPIError(error)) {
      return `OpenAI Error: ${error.message}`
    }

    return 'OpenAI Unknown Error'
  }
}

function isAPIError(candidate: unknown): candidate is APIError {
  return !!(candidate && typeof candidate === 'object' && 'request_id' in candidate)
}