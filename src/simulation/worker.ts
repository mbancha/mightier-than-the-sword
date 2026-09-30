import { runSimulation, type SimulationConfig } from './runner';
let cancel = false;
self.onmessage = async (
  e: MessageEvent<{ type: 'start' | 'cancel'; config: SimulationConfig }>,
) => {
  if (e.data.type === 'cancel') {
    cancel = true;
    return;
  }
  cancel = false;
  try {
    const report = await runSimulation(
      e.data.config,
      (attempted, total) => self.postMessage({ type: 'progress', attempted, total }),
      () => cancel,
    );
    self.postMessage({ type: 'done', report });
  } catch (error) {
    self.postMessage({ type: 'error', error: String(error) });
  }
};
