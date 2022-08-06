
//import sweb3 = require('@solana/web3.js');
import * as sweb3 from '@solana/web3.js';
//import * as anchor from "@project-serum/anchor";
//import base58 = require('bs58');
//import base58 from 'bs58';
//import splToken = require('@solana/spl-token');
import * as splToken from '@solana/spl-token';
import { TokenMetas } from './utils';

export const MAX_TOKEN_BURNS_PER_TRANSACTION = 10;

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
