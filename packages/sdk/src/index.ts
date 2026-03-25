import { HttpClient } from "./client";
import type {
  CredBureauConfig,
  CreditScore,
  CreditReport,
  AttestationResult,
  VerificationResult,
  ScoreHistoryEntry,
  WebhookConfig,
  GetScoreParams,
  GetDetailedScoreParams,
  CreateAttestationParams,
  VerifyAttestationParams,
  RegisterWebhookParams,
} from "./types";

export class CredBureau {
  private client: HttpClient;

  public score: ScoreNamespace;
  public attestation: AttestationNamespace;
  public report: ReportNamespace;
  public webhook: WebhookNamespace;

  constructor(config: CredBureauConfig) {
    this.client = new HttpClient(config);
    this.score = new ScoreNamespace(this.client);
    this.attestation = new AttestationNamespace(this.client);
    this.report = new ReportNamespace(this.client);
    this.webhook = new WebhookNamespace(this.client);
  }
}

class ScoreNamespace {
  constructor(private client: HttpClient) {}

  async get(params: GetScoreParams): Promise<CreditScore> {
    return this.client.get<CreditScore>("/api/v1/score", {
      address: params.address,
      chains: params.chains?.join(",") || "",
    });
  }

  async getDetailed(params: GetDetailedScoreParams): Promise<CreditScore> {
    return this.client.post<CreditScore>("/api/v1/score/detailed", params);
  }

  async getHistory(params: { address: string }): Promise<{ address: string; history: ScoreHistoryEntry[] }> {
    return this.client.get("/api/v1/history", { address: params.address });
  }
}

class AttestationNamespace {
  constructor(private client: HttpClient) {}

  async create(params: CreateAttestationParams): Promise<AttestationResult> {
    return this.client.post<AttestationResult>("/api/v1/attest", params);
  }

  async verify(params: VerifyAttestationParams): Promise<VerificationResult> {
    return this.client.get<VerificationResult>("/api/v1/verify", {
      attestationUID: params.attestationUID,
      chain: params.chain || "base",
    });
  }
}

class ReportNamespace {
  constructor(private client: HttpClient) {}

  async get(params: { address: string }): Promise<CreditReport> {
    return this.client.get<CreditReport>("/api/v1/report", { address: params.address });
  }
}

class WebhookNamespace {
  constructor(private client: HttpClient) {}

  async register(params: RegisterWebhookParams): Promise<WebhookConfig> {
    return this.client.post<WebhookConfig>("/api/v1/webhook/register", params);
  }
}

// Re-export types
export type {
  CredBureauConfig,
  CreditScore,
  CreditReport,
  AttestationResult,
  VerificationResult,
  ScoreHistoryEntry,
  WebhookConfig,
  ScoreBreakdown,
  ScoreFactor,
} from "./types";

export { CredBureauError } from "./client";
