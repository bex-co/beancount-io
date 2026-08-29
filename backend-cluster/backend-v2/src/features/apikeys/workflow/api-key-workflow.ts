import type {
  IApiKeyService,
  MintApiKeyInput,
  MintedApiKey,
} from "@/features/apikeys/service/api-key-service";
import type { ApiKey } from "@/features/apikeys/data/api-key-model";
import {
  apiKeyResource,
  AUTHORIZATION_ACTIONS,
  type AuthorizationRequest,
  type IAuthorizationService,
  userResource,
} from "@/server/api/authorization";

export interface IApiKeyWorkflow {
  mint(
    request: AuthorizationRequest,
    input: MintApiKeyInput,
  ): Promise<MintedApiKey>;
  list(request: AuthorizationRequest): Promise<ApiKey[]>;
  revoke(request: AuthorizationRequest, id: string): Promise<ApiKey>;
}

/** Shared GraphQL/REST/MCP application boundary for API-key management. */
export class ApiKeyWorkflow implements IApiKeyWorkflow {
  constructor(
    private readonly apiKey: IApiKeyService,
    private readonly authorization: IAuthorizationService,
  ) {}

  public async list(request: AuthorizationRequest): Promise<ApiKey[]> {
    const { principal } = request;
    await this.authorization.authorizeOrThrow({
      request,
      action: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_LIST,
      resource: userResource(principal.userId),
    });
    return this.apiKey.list(principal.userId);
  }

  public async mint(
    request: AuthorizationRequest,
    input: MintApiKeyInput,
  ): Promise<MintedApiKey> {
    const { principal } = request;
    await this.authorization.authorizeOrThrow({
      request,
      action: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_CREATE,
      resource: userResource(principal.userId),
    });
    return this.apiKey.mint(principal, input);
  }

  public async revoke(
    request: AuthorizationRequest,
    id: string,
  ): Promise<ApiKey> {
    await this.authorization.authorizeOrThrow({
      request,
      action: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_REVOKE,
      resource: apiKeyResource(id),
    });
    return this.apiKey.revoke(id);
  }
}
