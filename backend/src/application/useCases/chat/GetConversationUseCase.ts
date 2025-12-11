/**
 * Get Conversation Use Case
 * 
 * Retrieves conversation history
 */

import type { IMessageRepository } from "../../../ports/output/repositories/IMessageRepository";
import { Message } from "../../../domain/entities/Message";

export class GetConversationUseCase {
  constructor(
    private readonly messageRepository: IMessageRepository
  ) {}

  async execute(
    conversationId: string,
    options?: {
      limit?: number;
      offset?: number;
      since?: string;
    }
  ): Promise<Message[]> {
    const messages = await this.messageRepository.findByConversation({
      conversationId,
      limit: options?.limit,
      offset: options?.offset,
      since: options?.since
    });

    return messages.map(msg => new Message(
      msg.id,
      msg.conversationId,
      msg.userId,
      msg.role,
      msg.content,
      msg.createdAt,
      msg.metadata
    ));
  }
}

