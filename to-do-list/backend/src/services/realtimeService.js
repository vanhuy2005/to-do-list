import Ably from "ably";

let ablyClient = null;

if (process.env.ABLY_API_KEY) {
  try {
    ablyClient = new Ably.Rest(process.env.ABLY_API_KEY);
    console.log("Ably REST client initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Ably REST client:", error.message);
  }
} else {
  console.warn("ABLY_API_KEY is not defined in environment variables. Realtime updates are disabled.");
}

export const realtimeService = {
  /**
   * Create a signed token request for frontend client authentication.
   * Prevents exposing the backend ABLY_API_KEY in the browser.
   * 
   * @param {string} clientId The authenticated user's ID
   */
  async createTokenRequest(clientId) {
    if (!ablyClient) {
      throw new Error("Ably client not initialized");
    }
    return await ablyClient.auth.createTokenRequest({ clientId });
  },

  /**
   * Publish an event to a specific project collaboration channel.
   * Channel format: "project:{projectId}"
   * 
   * @param {string} projectId The project's ObjectId
   * @param {string} event The name of the event (e.g. "task_created", "presence_changed")
   * @param {object} data The event payload
   */
  async publishProjectEvent(projectId, event, data) {
    if (!ablyClient) {
      return;
    }

    try {
      const channelName = `project:${projectId}`;
      const channel = ablyClient.channels.get(channelName);
      
      // Publish event asynchronously without blocking backend execution
      channel.publish(event, data, (err) => {
        if (err) {
          console.warn(`Ably publication callback error on channel ${channelName}:`, err.message);
        }
      });
    } catch (error) {
      console.warn(`Failed to publish realtime event to Ably on project ${projectId}:`, error.message);
    }
  }
};

export default realtimeService;
