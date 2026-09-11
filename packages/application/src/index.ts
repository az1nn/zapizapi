import type { InboundMessage, IntakeRequest } from '@zapizapi/domain';

export interface MessageRepository {
  saveIfAbsent(message: InboundMessage): Promise<boolean>;
}

export interface IntakeRequestRepository {
  appendToOpenRequest(
    message: InboundMessage,
    aggregationWindowMs: number,
  ): Promise<string>;

  getById(id: string): Promise<IntakeRequest | null>;
}

export interface IntakeProjection {
  project(requestId: string): Promise<void>;
}

export interface IngestResult {
  readonly accepted: number;
  readonly duplicates: number;
  readonly requestIds: readonly string[];
}

export class IntakeService {
  constructor(
    private readonly messages: MessageRepository,
    private readonly requests: IntakeRequestRepository,
    private readonly aggregationWindowMs = 45_000,
  ) {}

  async ingest(input: readonly InboundMessage[]): Promise<IngestResult> {
    let accepted = 0;
    let duplicates = 0;
    const requestIds = new Set<string>();

    for (const message of input) {
      const inserted = await this.messages.saveIfAbsent(message);
      if (!inserted) {
        duplicates += 1;
        continue;
      }

      accepted += 1;
      requestIds.add(
        await this.requests.appendToOpenRequest(message, this.aggregationWindowMs),
      );
    }

    return { accepted, duplicates, requestIds: [...requestIds] };
  }
}
