
//import sweb3 = require('@solana/web3.js');
import * as sweb3 from '@solana/web3.js';
//import * as anchor from "@project-serum/anchor";
//import base58 = require('bs58');
//import base58 from 'bs58';
//import splToken = require('@solana/spl-token');
import * as splToken from '@solana/spl-token'

export const RENT_PER_TOKEN_ACCOUNT_IN_SOL = 0.00203928;
export const MAX_CLOSE_INSTRUCTIONS = 15;

export interface TokenMetas {
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

export function getPKsToClose(emptyAccounts: TokenMetas[]): sweb3.PublicKey[] {
    return emptyAccounts.map(eA => eA.tokenAccount);
}


export async function findTokenAccounts(connection: sweb3.Connection, owner: sweb3.PublicKey) : Promise<TokenMetas[]> {
    const response = await connection.getTokenAccountsByOwner(owner,{programId: splToken.TOKEN_PROGRAM_ID});
    //console.log(response);
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
            tokenAccount: account.pubkey,
            tokenAccountLamports: account.account.lamports,
            mint: mint,
            amount
        };
        tokens.push(t);
    }
    return tokens;

}

export async function createBurnTransactions(owner: sweb3.PublicKey, 
    accountPKs: sweb3.PublicKey[], 
    donationPercentage?: number, donationAddress?: sweb3.PublicKey): Promise<sweb3.Transaction[]> {

    const closeInstructions = accountPKs.map(accPK => splToken.Token.createCloseAccountInstruction(
        splToken.TOKEN_PROGRAM_ID,
        accPK,
        owner,
        owner,
        []
    ));

    let transactions: sweb3.Transaction[] = [];
    
    while(closeInstructions.length>0){
        const transaction = new sweb3.Transaction();

        // add close instructions
        for (let i = 0; i < MAX_CLOSE_INSTRUCTIONS; i++) {
            const nextInstr = closeInstructions.pop();
            if(nextInstr){
                transaction.add(nextInstr);
            } else {
                break;
            }
        }

        // add donation instruction
        if(donationPercentage && donationAddress){
            const closeInstrCnt = transaction.instructions.length;
            const donationAmount = RENT_PER_TOKEN_ACCOUNT_IN_SOL * closeInstrCnt * donationPercentage/100;
            const donationInstruction = sweb3.SystemProgram.transfer({
                fromPubkey: owner,
                toPubkey: donationAddress,
                lamports: sweb3.LAMPORTS_PER_SOL * donationAmount,
            });
            transaction.add(donationInstruction);
        }


        transactions.push(transaction);
    }
    return transactions;
}
