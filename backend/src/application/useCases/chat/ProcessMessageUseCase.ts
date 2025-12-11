/**
 * Process Message Use Case
 * 
 * Handles processing of incoming chat messages
 */

import type { IChatPort } from "../../../ports/input/IChatPort";
import type { IMessageRepository } from "../../../ports/output/repositories/IMessageRepository";
import type { IEventPublisher } from "../../../ports/output/publishers/IEventPublisher";
import { Message } from "../../../domain/entities/Message";
import { SourceMessage } from "../../../domain/valueObjects/SourceMessage";

export class ProcessMessageUseCase {
  constructor(
    private readonly chatPort: IChatPort,
    private readonly messageRepository: IMessageRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(sourceMessage: SourceMessage): Promise<Message> {
    // Save user message
    const userMessage = Message.create(
      sourceMessage.conversationId,
      sourceMessage.userId,
      "user",
      sourceMessage.content,
      {
        sourceKind: sourceMessage.source.kind,
        sourceId: sourceMessage.source.id
      }
    );

    const savedUserMessage = await this.messageRepository.save({
      id: userMessage.id,
      conversationId: userMessage.conversationId,
      userId: userMessage.userId,
      role: userMessage.role,
      content: userMessage.content,
      createdAt: userMessage.createdAt,
      metadata: userMessage.metadata
    });

    // Publish message_created event
    await this.eventPublisher.publish({
      type: "message_created",
      payload: {
        id: savedUserMessage.id,
        conversationId: savedUserMessage.conversationId,
        userId: savedUserMessage.userId,
        role: savedUserMessage.role,
        content: savedUserMessage.content,
        createdAt: savedUserMessage.createdAt
      }
    });

    // Process message through chat port (persona service)
    const response = await this.chatPort.processMessage({
      conversationId: sourceMessage.conversationId,
      userId: sourceMessage.userId,
      text: sourceMessage.content,
      source: sourceMessage.source
    });

    // Save assistant response
    const assistantMessage = Message.create(
      response.conversationId,
      response.userId,
      "assistant",
      response.content
    );

    const savedAssistantMessage = await this.messageRepository.save({
      id: assistantMessage.id,
      conversationId: assistantMessage.conversationId,
      userId: assistantMessage.userId,
      role: assistantMessage.role,
      content: assistantMessage.content,
      createdAt: assistantMessage.createdAt,
      metadata: assistantMessage.metadata
    });

    // Publish message_created event for assistant response
    await this.eventPublisher.publish({
      type: "message_created",
      payload: {
        id: savedAssistantMessage.id,
        conversationId: savedAssistantMessage.conversationId,
        userId: savedAssistantMessage.userId,
        role: savedAssistantMessage.role,
        content: savedAssistantMessage.content,
        createdAt: savedAssistantMessage.createdAt
      }
    });

    return savedAssistantMessage;
  }
}

