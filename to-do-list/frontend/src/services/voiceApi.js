import api from '@/lib/axios';

/**
 * Sends transcript to AI for intent extraction and enrichment.
 * 
 * @param {string} transcript 
 * @returns {Promise<Object>} Enriched draft
 */
export async function createVoiceDraft(transcript) {
  const response = await api.post('/voice-task', {
    text: transcript,
    timestamp: new Date().toISOString(),
  });

  // Backend should return the enriched object in data.data or data
  return response.data?.data || response.data;
}
