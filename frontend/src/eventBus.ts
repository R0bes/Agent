export type FrontendEvent = {
  type: string;
  payload: any;
};

type Handler = (event: FrontendEvent) => void;

const listeners = new Set<Handler>();

export function subscribe(handler: Handler): () => void {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

export function emit(event: FrontendEvent) {
  for (const handler of listeners) {
    handler(event);
  }
}

