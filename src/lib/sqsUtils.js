import { SQSClient, SendMessageBatchCommand } from "@aws-sdk/client-sqs";

// Initialize SQS Client
const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const QUEUE_URL = process.env.SQS_CAMPAIGN_QUEUE_URL;

/**
 * Pushes messages to SQS in batches of 10 (AWS Limit)
 */
export async function pushToSQS(messages) {
  if (!QUEUE_URL) {
    console.error("SQS_CAMPAIGN_QUEUE_URL is missing in environment variables.");
    throw new Error("SQS Queue URL not configured");
  }

  const batchSize = 10;
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };

  for (let i = 0; i < messages.length; i += batchSize) {
    const chunk = messages.slice(i, i + batchSize);
    
    const entries = chunk.map((msg, index) => ({
      Id: `msg_${Date.now()}_${i + index}`,
      MessageBody: JSON.stringify(msg)
    }));

    try {
      const command = new SendMessageBatchCommand({
        QueueUrl: QUEUE_URL,
        Entries: entries
      });

      const response = await sqsClient.send(command);
      
      results.successful += (response.Successful?.length || 0);
      results.failed += (response.Failed?.length || 0);
      
      if (response.Failed?.length > 0) {
        results.errors.push(...response.Failed);
      }
    } catch (error) {
      console.error("Failed to push batch to SQS:", error);
      results.failed += chunk.length;
      results.errors.push(error.message);
    }
  }

  return results;
}
