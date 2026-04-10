import { createFintechRuntime, QueueDispatcher } from '../../../packages/runtime/src/index.js';

const dispatcher = new QueueDispatcher();

export const fintechRuntime = createFintechRuntime(dispatcher);
