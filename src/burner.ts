
//import sweb3 = require('@solana/web3.js');
import * as sweb3 from '@solana/web3.js';
//import * as anchor from "@project-serum/anchor";
//import base58 = require('bs58');
//import base58 from 'bs58';
//import splToken = require('@solana/spl-token');
import * as splToken from '@solana/spl-token'

export const RENT_PER_TOKEN_ACCOUNT_IN_SOL = 0.00203928;
export const MAX_TOKEN_BURNS_PER_TRANSACTION = 10;

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
    }
    return tokens;

}

function createBurnInstructionsForToken(owner: sweb3.PublicKey, tokenMetas: TokenMetas) : sweb3.TransactionInstruction[]{
    const instructions :sweb3.TransactionInstruction[] = [];
    if(tokenMetas.amount){
        const burnInstruction = splToken.Token.createBurnInstruction(
            splToken.TOKEN_PROGRAM_ID,
            tokenMetas.mint,
            tokenMetas.tokenAccount,
            owner,
            [],
            tokenMetas.amount
        );
        instructions.push(burnInstruction);
    }
    const closeInstruction = splToken.Token.createCloseAccountInstruction(
        splToken.TOKEN_PROGRAM_ID,
        tokenMetas.tokenAccount,
        owner,
        owner,
        []
    );
    instructions.push(closeInstruction);
    return instructions;
}

export function getRedeemableLamports(tokenMetas : TokenMetas) : number {
    return tokenMetas.tokenAccountLamports + (tokenMetas.masterEditionAccountLamports ? tokenMetas.masterEditionAccountLamports + (tokenMetas.metadataAccountLamports ?? 0) :0)
}

export async function createBurnTransactions(owner: sweb3.PublicKey, 
    tokenMetas: TokenMetas[], 
    donationPercentage?: number, donationAddress?: sweb3.PublicKey): Promise<sweb3.Transaction[]> {

    let transactions: sweb3.Transaction[] = [];

    let remaining = tokenMetas;
    
    while(remaining.length>0){
        const transaction = new sweb3.Transaction();
        let claimableLamports = 0;

        // add close instructions
        for (let i = 0; i < MAX_TOKEN_BURNS_PER_TRANSACTION; i++) {
            const nextToken = remaining.pop();
            if(!nextToken) break;
            claimableLamports += getRedeemableLamports(nextToken);
            const nextInstrs = createBurnInstructionsForToken(owner, nextToken);
            nextInstrs.forEach(ix => transaction.add(ix));
        }

        // add donation instruction
        if(donationAddress){ // we want to add this ix even if 0 percent
            const donationAmount = claimableLamports * (donationPercentage??0)/100;
            const donationInstruction = sweb3.SystemProgram.transfer({
                fromPubkey: owner,
                toPubkey: donationAddress,
                lamports: donationAmount,
            });
            transaction.add(donationInstruction);
        }


        transactions.push(transaction);
    }
    return transactions;
}
