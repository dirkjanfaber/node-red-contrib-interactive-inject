declare module 'node-red-node-test-helper' {
  import { NodeAPI } from '@node-red/registry';

  interface TestNode {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, listener: (msg: any) => void): void;
    receive(msg: Record<string, unknown>): void;
    send(msg: Record<string, unknown> | Array<Record<string, unknown> | null>): void;
    [key: string]: unknown;
  }

  interface SuperTestAgent {
    post(url: string): SuperTestRequest;
  }

  interface SuperTestRequest {
    send(body: Record<string, unknown>): SuperTestRequest;
    expect(status: number): Promise<void>;
    then(resolve: (res: { body: unknown }) => void): Promise<void>;
  }

  interface Helper {
    init(requirePath: string): void;
    startServer(done: () => void): void;
    stopServer(done: () => void): void;
    load(
      node: (RED: NodeAPI) => void,
      flow: Record<string, unknown>[],
      credentials?: Record<string, unknown>
    ): Promise<void>;
    unload(): Promise<void>;
    getNode(id: string): TestNode;
    request(): SuperTestAgent;
  }

  const helper: Helper;
  export = helper;
}
