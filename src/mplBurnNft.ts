// taken from https://github.com/metaplex-foundation/metaplex-program-library/blob/master/token-metadata/js/src/generated/instructions/BurnNft.ts
// because for some resason my import doesn't work 

import * as beet from '@metaplex-foundation/beet';
import * as web3 from '@solana/web3.js';

/**
 * @category Instructions
 * @category BurnNft
 * @category generated
 */
export const BurnNftStruct = new beet.BeetArgsStruct<{ instructionDiscriminator: number }>(
  [['instructionDiscriminator', beet.u8]],
  'BurnNftInstructionArgs',
);
/**
 * Accounts required by the _BurnNft_ instruction
 *
 * @property [_writable_] metadata Metadata (pda of ['metadata', program id, mint id])
 * @property [_writable_, **signer**] owner NFT owner
 * @property [_writable_] mint Mint of the NFT
 * @property [_writable_] tokenAccount Token account to close
 * @property [_writable_] masterEditionAccount MasterEdition2 of the NFT
 * @property [] splTokenProgram SPL Token Program
 * @property [_writable_] collectionMetadata (optional) Metadata of the Collection
 * @category Instructions
 * @category BurnNft
 * @category generated
 */
export type BurnNftInstructionAccounts = {
  metadata: web3.PublicKey;
  owner: web3.PublicKey;
  mint: web3.PublicKey;
  tokenAccount: web3.PublicKey;
  masterEditionAccount: web3.PublicKey;
  splTokenProgram: web3.PublicKey;
  collectionMetadata?: web3.PublicKey;
};

export const burnNftInstructionDiscriminator = 29;

/**
 * Creates a _BurnNft_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @category Instructions
 * @category BurnNft
 * @category generated
 */
export function createBurnNftInstruction(
  accounts: BurnNftInstructionAccounts,
  programId = new web3.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
) {
  const [data] = BurnNftStruct.serialize({
    instructionDiscriminator: burnNftInstructionDiscriminator,
  });
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.metadata,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.owner,
      isWritable: true,
      isSigner: true,
    },
    {
      pubkey: accounts.mint,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.tokenAccount,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.masterEditionAccount,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.splTokenProgram,
      isWritable: false,
      isSigner: false,
    },
  ];

  if (accounts.collectionMetadata != null) {
    keys.push({
      pubkey: accounts.collectionMetadata,
      isWritable: true,
      isSigner: false,
    });
  }

  const ix = new web3.TransactionInstruction({
    programId,
    keys,
    data,
  });
  return ix;
}