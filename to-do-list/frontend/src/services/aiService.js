import api from "../lib/axios";

const aiService = {
  askAssistant: ({ message, tasks = [] }) => {
    return api.post("/ai", { message, tasks });
  },
};

export default aiService;
