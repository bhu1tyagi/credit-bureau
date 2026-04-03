/**
 * EAS Schema Auto-Registration Utility
 * Registers the credit score schema on-chain if no UID is pre-configured for the target chain.
 * On mainnet, checks for existing schemas before registering to avoid wasting gas.
 */
import { SchemaRegistry } from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";
import { CREDIT_SCORE_SCHEMA, SCHEMA_REGISTRY_ADDRESSES } from "~~/lib/constants";

const schemaUidCache: Record<string, string> = {};

/**
 * Compute the expected schema UID by hashing the schema string, resolver, and revocable flag.
 * EAS uses keccak256(schema, resolver, revocable) for the UID.
 */
function computeSchemaUid(schema: string, resolver: string, revocable: boolean): string {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(["string", "address", "bool"], [schema, resolver, revocable]),
  );
}

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

  // Check if schema already exists on-chain before registering (saves gas on mainnet)
  const expectedUid = computeSchemaUid(CREDIT_SCORE_SCHEMA, ethers.ZeroAddress, true);
  try {
    const existing = await schemaRegistry.getSchema({ uid: expectedUid });
    if (existing && existing.schema === CREDIT_SCORE_SCHEMA) {
      console.log(`[Schema] Schema already registered on ${chain}: ${expectedUid}`);
      schemaUidCache[chain] = expectedUid;
      return expectedUid;
    }
  } catch {
    // Schema doesn't exist yet, proceed with registration
  }

  console.log(`[Schema] Registering schema on ${chain}...`);
  const tx = await schemaRegistry.register({
    schema: CREDIT_SCORE_SCHEMA,
    resolverAddress: ethers.ZeroAddress,
    revocable: true,
  });

  const schemaUid = await tx.wait();
  schemaUidCache[chain] = schemaUid;
  console.log(`[Schema] Registered on ${chain}: ${schemaUid}`);

  return schemaUid;
}
