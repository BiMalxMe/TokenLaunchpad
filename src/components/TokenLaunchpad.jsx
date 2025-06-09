import { createInitializeAccountInstruction, getMinimumBalanceForRentExemptMint, MINT_SIZE, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";

export  function TokenLaunchpad() {
    const {connection} = useConnection();
    const wallet = useWallet();

    //scrap the input fields data
    async  function createToken() {
        const name = document.getElementById('name').value;
        const symbol = document.getElementById('symbol').value;
        const image = document.getElementById('image').value;
        const initialSupply = document.getElementById('initialSupply').value;

        //get a minimum acmount needed to mint a token
        const lamports =await getMinimumBalanceForRentExemptMint(connection)

        let keypair = Keypair.generate();
        const transaction = new Transaction().add(
            //creating a new account in the blockchain
            SystemProgram.createAccount({
                fromPubkey: wallet.publicKey,
                newAccountPubkey: keypair.publicKey,
                space : MINT_SIZE,
                lamports,
                programId: TOKEN_PROGRAM_ID,
            }),

            // 6 here is representing a decimal
            //4th arg is optional i.e freezeauthority
            createInitializeAccountInstruction(keypair.publicKey, 6, wallet.publicKey,wallet.publicKey, TOKEN_PROGRAM_ID),
        );
        transaction.feePayer = wallet.publicKey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        transaction.partialSign(keypair);
       let response  = await wallet.sendTransaction(transaction)
        console.log(response)
    }

    return  <div style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column'
    }}>
        <h1>Solana Token Launchpad</h1>
        <input className='inputText' type='text' placeholder='Name'></input> <br />
        <input className='inputText' type='text' placeholder='Symbol'></input> <br />
        <input className='inputText' type='text' placeholder='Image URL'></input> <br />
        <input className='inputText' type='text' placeholder='Initial Supply'></input> <br />
        <button onClick={createToken} className='btn'>Create a token</button>
    </div>
}