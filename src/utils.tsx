
import * as sweb3 from '@solana/web3.js';
import * as anchor from "@project-serum/anchor";
import { GridSelectionModel } from '@mui/x-data-grid';
import * as splToken from '@solana/spl-token';
import { getRedeemableLamports } from './burner';


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

// async function populateAll(connection: sweb3.Connection, tokens: TokenMetas[]) {
//     for(const t of tokens){
//         await populateMetadataInfo(connection, t);
//     }
// }

export function getSolscanLink(address: string) : string {
    return "https://solscan.io/address/"+address;
}

export const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
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
  collectionMetadataAccount?: sweb3.PublicKey;
  collectionMint?: sweb3.PublicKey;
  name?: string;
  url?: string;
  imageUrl?: string;
}


export function solForTokens(tokens: TokenMetas[]) : number {
  return tokens.map(t => getRedeemableLamports(t))
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
      // console.log("found account: "+account.pubkey.toBase58()+ " with "+amount);
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
      await populateMetadataInfo(connection,t); // eventually i want this in parallel but I don't know how to update ui properly
  }
  return tokens;

}

async function getMetadataPDA(mint: anchor.web3.PublicKey){
  const pdaInfo = await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
  const metadataPDA = pdaInfo[0];
  return metadataPDA;
}

async function populateMetadataInfo(connection: sweb3.Connection, tokenMetas: TokenMetas) {
  
    const metadataPDA = await getMetadataPDA(tokenMetas.mint);
    
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

      // get collection
      tokenMetas.collectionMint = getCollectionMintFromMetadataAccount(metadataAccountInfo);
      if(tokenMetas.collectionMint){
        tokenMetas.collectionMetadataAccount = await getMetadataPDA(tokenMetas.collectionMint);
      }

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

function getCollectionMintFromMetadataAccount(metadataAccountInfo: sweb3.AccountInfo<Buffer>){

    const CREATOR_OFFSET = 321;
    const CREATOR_SIZE = 32+1+1;
    const ADDITIONAL_OFFSET = 1+1+2+2; // TODO read optionals edition nonce and token standard (currently we assume they are present)

    const creatorsPresent = metadataAccountInfo.data[CREATOR_OFFSET+1];
    const creators = creatorsPresent?metadataAccountInfo.data[CREATOR_OFFSET+1]:0; // we just need to read first of 4 bytes since creator length is max 5
    //console.log("number of creators: "+creators);
    
    const collectionOffset = CREATOR_OFFSET+1+4 + CREATOR_SIZE*creators + ADDITIONAL_OFFSET;
    const collectionPresent = metadataAccountInfo.data[collectionOffset];
    if(!collectionPresent) return undefined;
    const verifiedCollection = metadataAccountInfo.data[collectionOffset+1];
    const collectionMint = new sweb3.PublicKey(metadataAccountInfo.data.slice(collectionOffset+2,collectionOffset+2+32));
    // const updateAuthority = new sweb3.PublicKey(metadataAccountInfo.data.slice(1,33));
    // const creatorOne = new sweb3.PublicKey(metadataAccountInfo.data.slice(CREATOR_OFFSET+1+4,CREATOR_OFFSET+1+4+32));
    // console.log("verified "+verifiedCollection);
    // console.log("collection mint "+collectionMint.toBase58());
    // console.log("update authority "+updateAuthority.toBase58());
    // console.log("creator 1 "+creatorOne.toBase58());
    // console.log("symbol "+metadataAccountInfo.data[101]);

    if(verifiedCollection){
      return collectionMint;
    }

    return undefined;
}


export function getSelectedTokens(tokens: TokenMetas[], selectionModel?: GridSelectionModel): TokenMetas[] {
    return tokens.filter(t => selectionModel?selectionModel.includes(t.id):true);
}
