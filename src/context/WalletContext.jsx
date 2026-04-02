import React, { createContext, useContext, useEffect, useState } from 'react';
import { MiniKit } from 'minikit'; // Only using MiniKit for World App Wallet authentication

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
    const [wallet, setWallet] = useState(null);

    useEffect(() => {
        const miniKit = new MiniKit();
        miniKit.initialize();

        // Add authentication logic here using MiniKit 

        setWallet(miniKit.getWallet()); // Replace with actual method to get the wallet from MiniKit
    }, []);

    return (
        <WalletContext.Provider value={{ wallet }}>
            {children}
        </WalletContext.Provider>
    );
};

export const useWallet = () => {
    return useContext(WalletContext);
};
