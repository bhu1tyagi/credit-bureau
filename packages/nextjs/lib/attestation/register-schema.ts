/**
 * EAS Schema Auto-Registration Utility
 * Registers the credit score schema on-chain if no UID is pre-configured for the target chain.
 */
import { SchemaRegistry } from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";
import { CREDIT_SCORE_SCHEMA, SCHEMA_REGISTRY_ADDRESSES } from "~~/lib/constants";

// In-memory cache of registered schema UIDs keyed by chain name.
const schemaUidCache: Record<string, string> = {};

/**
 * Get or register the credit score schema UID for a given chain.
 * If the schema has already been registered in this process, the cached UID is returned.
 * Otherwise, the schema is registered on-chain via the SchemaRegistry contract.
 */
export async function getOrRegisterSchemaUid(chain: string, signer: ethers.Signer): Promise<string> {
  if (schemaUidCache[chain]) {
    return schemaUidCache[chain];
  }

  const registryAddress = SCHEMA_REGISTRY_ADDRESSES[chain];
  if (!registryAddress) {
    throw new Error(`Schema registry address not configured for chain: ${chain}`);
  }

  const schemaRegistry = new SchemaRegistry(registryAddress);
  schemaRegistry.connect(signer);

  const tx = await schemaRegistry.register({
    schema: CREDIT_SCORE_SCHEMA,
    resolverAddress: ethers.ZeroAddress,
    revocable: true,
  });

  const schemaUid = await tx.wait();
  schemaUidCache[chain] = schemaUid;

  return schemaUid;
}
