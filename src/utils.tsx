
import * as sweb3 from '@solana/web3.js';
import * as anchor from "@project-serum/anchor";
import { GridSelectionModel } from '@mui/x-data-grid';
import * as splToken from '@solana/spl-token';


export interface EmptyAccountInfo {
    id: number,
    account: TokenMetas,
    lamports: number,
    metadata?: sweb3.PublicKey,
    image?: string,
    name?: string
  }

// export async function getEmptyAccountInfos(connection: sweb3.Connection, accounts: TokenMetas[], callback?: any) : Promise<EmptyAccountInfo[]> {
//     const accList = accounts.map((acc , i) => {
//         const adr =acc.tokenAccount.toBase58();
//          return {account: acc, 
//             id: i, 
//             link:getSolscanLink(adr),
//             lamports: acc.tokenAccountLamports
//     }});

//     //accList.forEach(element => populateMetadataInfo(connection, element));
//     populateAll(connection, accList, callback);

//     return accList;
// }

async function populateAll(connection: sweb3.Connection, tokens: TokenMetas[]) {
    for(const t of tokens){
        await populateMetadataInfo(connection, t);
    }
}

export function getSolscanLink(address: string) : string {
    return "https://solscan.io/address/"+address;
}

const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
    'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
  );

  
export interface TokenMetas {
  id: number,
  tokenAccount: sweb3.PublicKey;
  tokenAccountLamports: number;
  mint: sweb3.PublicKey;
  amount: number;
  metadataAccount?: sweb3.PublicKey;
  metadataAccountLamports?: number;
  masterEditionAccount?: sweb3.PublicKey;
  masterEditionAccountLamports?: number;
  name?: string;
  url?: string;
  imageUrl?: string;
}


export function solForTokens(tokens: TokenMetas[]) : number {
  return tokens.map(t => (t.tokenAccountLamports + (t.masterEditionAccountLamports || 0) + (t.metadataAccountLamports || 0)))
      .reduce((prev, curr)=> {return prev + curr;}, 0) / sweb3.LAMPORTS_PER_SOL;
}

export function countNFTs(tokens: TokenMetas[]): number {
  if(!tokens) return 0;
  return tokens.filter(t => t.masterEditionAccount).length;
}


export async function findTokenAccounts(connection: sweb3.Connection, owner: sweb3.PublicKey) : Promise<TokenMetas[]> {
  const response = await connection.getTokenAccountsByOwner(owner,{programId: splToken.TOKEN_PROGRAM_ID});
  //console.log(response);
  let id = 0;
  const tokens: TokenMetas[] = [];
  for (let account of response.value){
      //console.log(account.pubkey.toBase58());
      const offsetInBytes = 2*32;
      let amount = 0;
      for (let i = 0; i<8; i++){
          amount += account.account.data[offsetInBytes+i] * (2**(i*8));
      }
      console.log("found account: "+account.pubkey.toBase58()+ " with "+amount);
      const mint = new sweb3.PublicKey(account.account.data.slice(0, 32));
      const t : TokenMetas = {
          id,
          tokenAccount: account.pubkey,
          tokenAccountLamports: account.account.lamports,
          mint: mint,
          amount
      };
      tokens.push(t);
      id++;
      populateMetadataInfo(connection,t);
  }
  return tokens;

}


async function populateMetadataInfo(connection: sweb3.Connection, tokenMetas: TokenMetas) {
  
    const pdaInfo = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        tokenMetas.mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    const metadataPDA = pdaInfo[0];
    const metadataAccountInfo = await connection.getAccountInfo(metadataPDA);

    if(metadataAccountInfo){
      tokenMetas.metadataAccount = metadataPDA; // only set if actually exists
      tokenMetas.metadataAccountLamports = metadataAccountInfo.lamports;

      // get name
      const nameBuffer = metadataAccountInfo.data.slice(1+32+32+4, 1+32+32+4+32);
      const nameLenght = metadataAccountInfo.data.readUInt32LE(1+32+32);
      let name = "";
      for (let j = 0; j< nameLenght; j++){
          if (nameBuffer.readUInt8(j)===0) break;
          name += String.fromCharCode(nameBuffer.readUInt8(j));
      }
      tokenMetas.name = name;

      // edition account
      const editionPdaInfo = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          tokenMetas.mint.toBuffer(),
          Buffer.from('edition'),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );
      const editionPDA = editionPdaInfo[0];
      const masterEditionAccountInfo = await connection.getAccountInfo(editionPDA);
      
      if(masterEditionAccountInfo){
        tokenMetas.masterEditionAccount = editionPDA; // only set if actually exists
        tokenMetas.masterEditionAccountLamports = masterEditionAccountInfo.lamports;
      }
    }
}




export function getSelectedTokens(tokens: TokenMetas[], selectionModel?: GridSelectionModel): TokenMetas[] {
    return tokens.filter(t => selectionModel?selectionModel.includes(t.id):true);
}
