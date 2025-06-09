import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TOKEN_2022_PROGRAM_ID, createMintToInstruction, createAssociatedTokenAccountInstruction, getMintLen, createInitializeMetadataPointerInstruction, createInitializeMintInstruction, TYPE_SIZE, LENGTH_SIZE, ExtensionType, getAssociatedTokenAddressSync } from "@solana/spl-token"
import { createInitializeInstruction, pack } from '@solana/spl-token-metadata';

export function TokenLaunchpad() {
    const { connection } = useConnection();
    const wallet = useWallet();

    async function createToken() {
        if (!wallet.publicKey) {
            alert('Please connect your wallet first');
            return;
        }

        try {
            // Get input values
            const inputs = document.getElementsByClassName('inputText');
            const tokenName = inputs[0].value;
            const tokenSymbol = inputs[1].value;
            const tokenUri = inputs[2].value;
            const initialSupply = inputs[3].value;

            if (!tokenName || !tokenSymbol || !tokenUri || !initialSupply) {
                alert('Please fill all fields');
                return;
            }

            const mintKeypair = Keypair.generate();
            const metadata = {
                mint: mintKeypair.publicKey,
                name: tokenName,
                symbol: tokenSymbol,
                uri: tokenUri,
                additionalMetadata: [],
            };

            // Calculate required space
            const mintLen = getMintLen([ExtensionType.MetadataPointer]);
            const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

            // Get required lamports
            const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

            // Create transaction
            const transaction = new Transaction();
            
            // Add create account instruction
            transaction.add(
                SystemProgram.createAccount({
                    fromPubkey: wallet.publicKey,
                    newAccountPubkey: mintKeypair.publicKey,
                    space: mintLen,
                    lamports,
                    programId: TOKEN_2022_PROGRAM_ID,
                })
            );

            // Add metadata pointer instruction
            transaction.add(
                createInitializeMetadataPointerInstruction(
                    mintKeypair.publicKey,
                    wallet.publicKey,
                    mintKeypair.publicKey,
                    TOKEN_2022_PROGRAM_ID
                )
            );

            // Add initialize mint instruction
            transaction.add(
                createInitializeMintInstruction(
                    mintKeypair.publicKey,
                    9, // Decimals
                    wallet.publicKey,
                    null, // Freeze authority
                    TOKEN_2022_PROGRAM_ID
                )
            );

            // Add metadata initialization
            transaction.add(
                createInitializeInstruction({
                    programId: TOKEN_2022_PROGRAM_ID,
                    mint: mintKeypair.publicKey,
                    metadata: mintKeypair.publicKey,
                    name: metadata.name,
                    symbol: metadata.symbol,
                    uri: metadata.uri,
                    mintAuthority: wallet.publicKey,
                    updateAuthority: wallet.publicKey,
                })
            );

            // Set recent blockhash and fee payer
            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            transaction.feePayer = wallet.publicKey;

            // Sign the transaction
            transaction.partialSign(mintKeypair);

            // Send the transaction
             await wallet.sendTransaction(transaction, connection);

            console.log(`Token mint created at ${mintKeypair.publicKey.toBase58()}`);

            // Create associated token account
            const associatedToken = getAssociatedTokenAddressSync(
                mintKeypair.publicKey,
                wallet.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
            );

            const createAtaTx = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    wallet.publicKey,
                    associatedToken,
                    wallet.publicKey,
                    mintKeypair.publicKey,
                    TOKEN_2022_PROGRAM_ID,
                ),
            );

            await wallet.sendTransaction(createAtaTx, connection);

            // Mint tokens
            const mintAmount = Number(initialSupply) * Math.pow(10, 9); // Convert to token units
            const mintTx = new Transaction().add(
                createMintToInstruction(
                    mintKeypair.publicKey,
                    associatedToken,
                    wallet.publicKey,
                    mintAmount,
                    [],
                    TOKEN_2022_PROGRAM_ID
                )
            );

            await wallet.sendTransaction(mintTx, connection);

            alert(`Token created successfully!\nMint Address: ${mintKeypair.publicKey.toBase58()}\nATA: ${associatedToken.toBase58()}`);

        } catch (error) {
            console.error("Error creating token:", error);
            alert(`Error creating token: ${error.message}`);
        }
    }
    const buttonStyle = {
        marginTop: '20px',
        padding: '12px 24px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: '#4CAF50',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '16px',
        cursor: 'pointer',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        transition: 'transform 0.2s ease-in-out'
    };

    const inputstyles = {
        
            padding: 20,
            border: '2px solid purple'  // Change border color here
        
    }

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column'
        }}>
            <h1
  style={{
    background: 'linear-gradient(to right, #39ff14,purple, #0072ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontSize: '2.5rem' // optional styling
  }}
>
  Solana Token Launchpad
</h1>

            <input className='inputText' type='text' placeholder='Name' style={inputstyles}></input> <br />
            <input className='inputText' type='text' placeholder='Symbol' style={inputstyles}></input> <br />
            <input className='inputText' type='text' placeholder='Image URL' style={inputstyles}></input> <br />
            <input className='inputText' type='text' placeholder='Initial Supply' style={inputstyles}></input> <br />
            <button onClick={createToken} style={buttonStyle}>Create a token</button>
        </div>
    );
}