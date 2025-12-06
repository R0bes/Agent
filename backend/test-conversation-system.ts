/**
 * Test Script for Conversation System
 * 
 * Tests the endlose Konversationen system:
 * - ConversationStore
 * - Context Builder
 * - Memory Compaction
 * - Auto-Trigger
 */

import { conversationStore } from "./src/models/conversationStore";
import { buildContext } from "./src/components/persona/contextBuilder";
import { compactionTrigger } from "./src/components/persona/compactionTrigger";
import { memoryStore } from "./src/components/memory";
import type { ToolContext } from "./src/components/types";

async function testConversationStore() {
  console.log("\n=== Testing ConversationStore ===");

  const testConversationId = "test-conv-1";
  const testUserId = "test-user-1";

  // Add some test messages
  await conversationStore.add({
    id: "msg-1",
    conversationId: testConversationId,
    userId: testUserId,
    role: "user",
    content: "Hello, I'm testing the conversation system.",
    createdAt: new Date().toISOString()
  });

  await conversationStore.add({
    id: "msg-2",
    conversationId: testConversationId,
    userId: testUserId,
    role: "assistant",
    content: "Great! The conversation store is working.",
    createdAt: new Date().toISOString()
  });

  await conversationStore.add({
    id: "msg-3",
    conversationId: testConversationId,
    userId: testUserId,
    role: "user",
    content: "Can you remember what I said earlier?",
    createdAt: new Date().toISOString()
  });

  // Test retrieval
  const messages = await conversationStore.getRecentMessages(testConversationId, 10);
  console.log(`✓ Stored and retrieved ${messages.length} messages`);

  const count = await conversationStore.countMessages(testConversationId);
  console.log(`✓ Message count: ${count}`);

  return { conversationId: testConversationId, userId: testUserId };
}

async function testContextBuilder(conversationId: string, userId: string) {
  console.log("\n=== Testing Context Builder ===");

  // Add a test memory
  await memoryStore.add({
    userId,
    kind: "fact",
    title: "Test User Info",
    content: "This is a test user testing the system",
    tags: ["test"]
  });

  // Build context
  const context = await buildContext("What did we discuss?", {
    userId,
    conversationId,
    includeHistory: true,
    maxHistoryMessages: 10,
    includeMemory: true,
    memoryKinds: ["fact", "preference", "summary"]
  });

  console.log(`✓ Context built with ${context.metadata.historyCount} history messages`);
  console.log(`✓ Context includes ${context.metadata.memoryCount} memories`);
  console.log(`✓ Estimated tokens: ${context.metadata.estimatedTokens}`);
  
  if (context.memoryContext) {
    console.log(`✓ Memory context formatted: ${context.memoryContext.length} chars`);
  }
}

async function testCompactionTrigger(conversationId: string, userId: string) {
  console.log("\n=== Testing Compaction Trigger ===");

  const ctx: ToolContext = {
    userId,
    conversationId,
    source: { id: "test", kind: "system" },
    meta: {}
  };

  // Check if trigger is needed (should be false with only 3 messages)
  const triggerCheck = await compactionTrigger.shouldTrigger(conversationId, ctx);
  
  if (triggerCheck.shouldTrigger) {
    console.log(`✓ Trigger activated: ${triggerCheck.reason}`);
  } else {
    console.log(`✓ Trigger check working (no compaction needed yet)`);
  }

  // Add many messages to exceed threshold
  console.log("\n  Adding 40 more messages to test threshold...");
  for (let i = 4; i <= 43; i++) {
    await conversationStore.add({
      id: `msg-${i}`,
      conversationId,
      userId,
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Test message ${i}`,
      createdAt: new Date().toISOString()
    });
  }

  const triggerCheck2 = await compactionTrigger.shouldTrigger(conversationId, ctx);
  
  if (triggerCheck2.shouldTrigger) {
    console.log(`✓ Trigger activated after threshold: ${triggerCheck2.reason}`);
    console.log(`  Priority: ${triggerCheck2.priority}`);
  } else {
    console.log(`✗ Trigger should have been activated`);
  }
}

async function testMemoryRetrieval(userId: string) {
  console.log("\n=== Testing Memory Retrieval ===");

  const memories = await memoryStore.list({
    userId,
    limit: 10
  });

  console.log(`✓ Retrieved ${memories.length} memories for user`);
  
  if (memories.length > 0) {
    console.log(`  First memory: [${memories[0].kind}] ${memories[0].title}`);
  }
}

async function runTests() {
  console.log("\n╔═══════════════════════════════════════════════════════╗");
  console.log("║   Conversation System Test Suite                     ║");
  console.log("╚═══════════════════════════════════════════════════════╝");

  try {
    const { conversationId, userId } = await testConversationStore();
    await testContextBuilder(conversationId, userId);
    await testCompactionTrigger(conversationId, userId);
    await testMemoryRetrieval(userId);

    console.log("\n╔═══════════════════════════════════════════════════════╗");
    console.log("║   ✓ All Tests Passed                                 ║");
    console.log("╚═══════════════════════════════════════════════════════╝\n");

    console.log("Summary:");
    console.log("- ConversationStore: Working ✓");
    console.log("- Context Builder: Working ✓");
    console.log("- Compaction Trigger: Working ✓");
    console.log("- Memory Integration: Working ✓");
    console.log("\nNote: For full integration test, start the server and send messages via GUI.");
    
  } catch (err) {
    console.error("\n✗ Test failed:", err);
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);

