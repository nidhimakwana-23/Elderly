import { getLlama, LlamaChatSession } from 'node-llama-cpp';

(async () => {
  const modelPath = "./models/qwen2.5/qwen2.5-0.5b-instruct-q4_k_m.gguf";
  if (!modelPath) {
    throw new Error('QWEN_MODEL_PATH env var not set');
  }
  const llama = await getLlama();
  const model = await llama.loadModel({ modelPath });
  const context = await model.createContext();
  const session = new LlamaChatSession({ contextSequence: context.getSequence() });
  const prompt = 'Hello world';
  const stream = await session.prompt(prompt);
  for await (const chunk of stream) {
    const txt = typeof chunk === 'string' ? chunk : chunk ?? '';
    process.stdout.write(txt);
  }
})();
