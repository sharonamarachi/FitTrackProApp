// This service handles the interaction with the Ollama API to extract workout details from text input.
// It sends a prompt to the local Ollama server, which runs a LLaMA model to parse the workout information.

export const ollamaService = {
  async extractWorkout(text: string) {
    const prompt = `Extract workout details into JSON: { "title": string, "exercises": [{ "name": string, "sets": number, "reps": number }] }. Text: ${text}`;

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        model: "llama3.2",
        prompt: prompt,
        stream: false,
        format: "json"
      })
    });

    const data = await response.json();
    return JSON.parse(data.response);
  }
};