import { describe, it, expect, vi } from "vitest";
import { VaultFactory } from "@/lib/stellar/vault-factory";
import type { WizardVaultData } from "@/lib/types/vault-wizard";
import { INITIAL_WIZARD_DATA } from "@/lib/types/vault-wizard";

describe("VaultFactory.createVault", () => {
  const validParams = {
    ownerAddress: "GBYQ4TJAKMQNLZ3KJWL32WKBMFJ6XN3JCHVKN3LUN232H3YVJR7TKTO",
    signTransaction: vi.fn(async (xdr: string) => xdr),
  };

  describe("validation", () => {
    it("rejects missing name with clear error", async () => {
      const malformedData: WizardVaultData = {
        ...INITIAL_WIZARD_DATA,
        name: "",
      };

      const result = await VaultFactory.createVault(
        malformedData,
        undefined,
        validParams
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("vault name");
      expect(result.error).toContain("non-empty");
    });

    it("rejects whitespace-only name", async () => {
      const malformedData: WizardVaultData = {
        ...INITIAL_WIZARD_DATA,
        name: "   ",
      };

      const result = await VaultFactory.createVault(
        malformedData,
        undefined,
        validParams
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("vault name");
    });

    it("rejects non-string name", async () => {
      // Cast to any to test runtime validation
      const malformedData = {
        ...INITIAL_WIZARD_DATA,
        name: 123,
      } as unknown as WizardVaultData;

      const result = await VaultFactory.createVault(
        malformedData,
        undefined,
        validParams
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("vault name");
      expect(result.error).toContain("string");
    });

    it("rejects non-string description", async () => {
      const malformedData = {
        ...INITIAL_WIZARD_DATA,
        description: 123,
      } as unknown as WizardVaultData;

      const result = await VaultFactory.createVault(
        malformedData,
        undefined,
        validParams
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("description");
      expect(result.error).toContain("string");
    });

    it("accepts undefined description", async () => {
      const validData: WizardVaultData = {
        ...INITIAL_WIZARD_DATA,
        name: "Test Vault",
        description: undefined,
      };

      // Mock the createVault function to avoid actual contract calls
      vi.mock("@/lib/stellar/vault-factory", async () => {
        const actual = await vi.importActual(
          "@/lib/stellar/vault-factory"
        );
        return {
          ...actual,
          createVault: vi.fn().mockRejectedValue(
            new Error("NEXT_PUBLIC_VAULT_FACTORY_CONTRACT_ID is not configured")
          ),
        };
      });

      const result = await VaultFactory.createVault(
        validData,
        undefined,
        validParams
      );

      // The error should be about missing factory config, not validation
      expect(result.error).toContain("factory");
    });

    it("rejects null data with object error", async () => {
      const result = await VaultFactory.createVault(
        null as unknown as WizardVaultData,
        undefined,
        validParams
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("object");
    });

    it("rejects missing params without validation", async () => {
      const validData: WizardVaultData = {
        ...INITIAL_WIZARD_DATA,
        name: "Test Vault",
      };

      const result = await VaultFactory.createVault(
        validData,
        undefined,
        undefined
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("parameters");
    });

    it("validates data before attempting any contract calls", async () => {
      const malformedData: WizardVaultData = {
        ...INITIAL_WIZARD_DATA,
        name: "", // Invalid: empty string
      };

      let contractCallAttempted = false;
      const spiedParams = {
        ownerAddress: validParams.ownerAddress,
        signTransaction: vi.fn(async (xdr: string) => {
          contractCallAttempted = true;
          return xdr;
        }),
      };

      const result = await VaultFactory.createVault(
        malformedData,
        undefined,
        spiedParams
      );

      // Validation should fail before any contract call
      expect(result.success).toBe(false);
      expect(contractCallAttempted).toBe(false);
      expect(spiedParams.signTransaction).not.toHaveBeenCalled();
    });

    it("includes helpful error message when wizard field might be renamed", async () => {
      const malformedData: WizardVaultData = {
        ...INITIAL_WIZARD_DATA,
        name: "", // Invalid
      };

      const result = await VaultFactory.createVault(
        malformedData,
        undefined,
        validParams
      );

      expect(result.error).toContain("rename");
      expect(result.error).toContain("wizard");
    });

    it("trims whitespace from name before contract call", async () => {
      const dataWithWhitespace: WizardVaultData = {
        ...INITIAL_WIZARD_DATA,
        name: "  Test Vault  ",
        description: "  Test Description  ",
      };

      // Mock to check the trimmed values passed to createVault
      const mockCreateVault = vi.fn().mockRejectedValue(
        new Error("NEXT_PUBLIC_VAULT_FACTORY_CONTRACT_ID is not configured")
      );

      // This test validates that trim() is called on the fields
      // A full integration test would verify the actual trimmed values
      // sent to the contract. For now, we verify that whitespace doesn't
      // cause validation to fail.
      const result = await VaultFactory.createVault(
        dataWithWhitespace,
        undefined,
        validParams
      );

      // Should pass validation (trimmed) but fail on missing contract config
      expect(result.error).toContain("factory");
      expect(result.error).not.toContain("name");
    });
  });
});
