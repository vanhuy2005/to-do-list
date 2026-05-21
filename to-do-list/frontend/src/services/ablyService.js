import Ably from "ably";
import authService from "./authService";

let realtime = null;
const channels = new Map();

export const ablyService = {
  /**
   * Initializes the Ably client using the secure backend authentication token endpoint.
   */
  init() {
    if (realtime) return realtime;

    const token = authService.getToken();
    if (!token) {
      console.warn("Cannot initialize Ably: User is not authenticated.");
      return null;
    }

    const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5001/api/v1";

    realtime = new Ably.Realtime({
      authUrl: `${apiBaseUrl}/projects/token/auth`,
      authHeaders: {
        Authorization: `Bearer ${token}`,
      },
      // Automatically retry connections and check status
      autoConnect: true,
    });

    realtime.connection.on("connected", () => {
      console.log("Ably connected successfully.");
    });

    realtime.connection.on("failed", (err) => {
      console.error("Ably connection failed:", err);
    });

    realtime.connection.on("disconnected", () => {
      console.warn("Ably disconnected. Retrying...");
    });

    return realtime;
  },

  /**
   * Returns the singleton Ably client instance, initializing it if necessary.
   */
  getClient() {
    if (!realtime) {
      return this.init();
    }
    return realtime;
  },

  /**
   * Subscribes to a project channel for task updates and presence events.
   * @param {string} projectId The project ID.
   * @param {object} callbacks Callback handlers for different events.
   * @returns {object} The subscribed channel.
   */
  subscribeToProject(projectId, { onTaskCreated, onTaskUpdated, onTaskDeleted, onPresenceUpdate }) {
    const client = this.getClient();
    if (!client) return null;

    const channelName = `project:${projectId}`;
    
    // If we're already subscribed, unsubscribe first to avoid duplicate handlers
    if (channels.has(channelName)) {
      this.unsubscribeFromProject(projectId);
    }

    const channel = client.channels.get(channelName);
    channels.set(channelName, channel);

    // Subscribe to task events
    if (onTaskCreated) {
      channel.subscribe("task_created", (message) => {
        console.log("Ably Event [task_created]:", message);
        onTaskCreated(message.data);
      });
    }

    if (onTaskUpdated) {
      channel.subscribe("task_updated", (message) => {
        console.log("Ably Event [task_updated]:", message);
        onTaskUpdated(message.data);
      });
    }

    if (onTaskDeleted) {
      channel.subscribe("task_deleted", (message) => {
        console.log("Ably Event [task_deleted]:", message);
        onTaskDeleted(message.data);
      });
    }

    // Handle Presence updates
    if (onPresenceUpdate) {
      // Helper function to fetch and format active members
      const updatePresenceList = async () => {
        try {
          const members = await channel.presence.get();
          // Filter out duplicates based on client ID / user ID and format neatly
          const activeUsers = members.map((m) => ({
            clientId: m.clientId,
            connectionId: m.connectionId,
            ...m.data, // Contains displayName, email, avatarUrl, id
          }));
          onPresenceUpdate(activeUsers);
        } catch (err) {
          console.error("Failed to get presence list:", err);
        }
      };

      channel.presence.subscribe("enter", (member) => {
        console.log("Presence: Member entered", member);
        updatePresenceList();
      });

      channel.presence.subscribe("leave", (member) => {
        console.log("Presence: Member left", member);
        updatePresenceList();
      });

      channel.presence.subscribe("update", (member) => {
        console.log("Presence: Member updated", member);
        updatePresenceList();
      });

      // Initial presence fetch
      updatePresenceList();
    }

    // Enter presence for the current user
    const currentUser = authService.getUser();
    if (currentUser) {
      channel.presence.enter({
        id: currentUser._id || currentUser.id,
        displayName: currentUser.displayName || "Anonymous",
        email: currentUser.email || "",
        avatarUrl: currentUser.avatarUrl || null,
      }).then(() => {
        console.log("Successfully entered channel presence.");
      }).catch((err) => {
        console.error("Failed to enter presence:", err);
      });
    }

    return channel;
  },

  /**
   * Unsubscribes from a project channel and leaves presence.
   * @param {string} projectId The project ID.
   */
  unsubscribeFromProject(projectId) {
    const channelName = `project:${projectId}`;
    if (!channels.has(channelName)) return;

    const channel = channels.get(channelName);
    
    // Leave presence
    channel.presence.leave().catch((err) => {
      console.warn("Failed to leave presence gracefully:", err);
    });

    // Unsubscribe all listeners
    channel.unsubscribe();
    channel.presence.unsubscribe();
    
    channels.delete(channelName);
    console.log(`Unsubscribed from Ably channel: ${channelName}`);
  },

  /**
   * Closes the Ably connection and clears all channel subscriptions.
   */
  disconnect() {
    if (!realtime) return;

    for (const channelName of channels.keys()) {
      const channel = channels.get(channelName);
      channel.presence.leave().catch(() => {});
      channel.unsubscribe();
      channel.presence.unsubscribe();
    }
    channels.clear();

    realtime.close();
    realtime = null;
    console.log("Ably connection disconnected and cleared.");
  },
};

export default ablyService;
