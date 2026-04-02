import React, { createContext, useContext, useEffect, useState } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
    const [wallet, setWallet] = useState(null);

    useEffect(() => {
        if (MiniKit.isInstalled()) {
            const walletAddress = MiniKit.walletAddress;
            if (walletAddress) {
                setWallet(walletAddress);
            }
        }
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
